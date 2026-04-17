
import { db } from "@/lib/prisma";
import { Resend } from "resend";
import PDFDocument from "pdfkit";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const senderEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev";

function buildFallbackEnglishInsight({ title, status, isBadWeather }) {
    const issueState = status === "RESOLVED" ? "resolved issue" : "unresolved issue";
    const urgency = isBadWeather
        ? "Immediate preventive action is required due to high weather-related stress."
        : "Current weather risk is moderate, but delayed maintenance can still accelerate damage.";

    return `English Risk Assessment: This ${issueState} (${title}) should be reviewed by the responsible department. ${urgency} Prioritize drainage checks, structural inspection, and a follow-up field verification within 24 to 72 hours.`;
}

function sanitizeAscii(text) {
    if (!text) return "";
    return text
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isLikelyEnglish(text) {
    if (!text || text.length < 20) return false;
    const safe = sanitizeAscii(text);
    const asciiRatio = safe.length / Math.max(text.length, 1);
    const englishWords = safe.match(/\b(the|and|for|with|to|of|is|are|risk|weather|issue|action)\b/gi)?.length || 0;
    return asciiRatio > 0.8 && englishWords >= 2;
}

function classifyRiskBand({ isBadWeather, status }) {
    if (status === "REJECTED") return "LOW";
    if (isBadWeather && (status === "PENDING" || status === "IN_PROGRESS")) return "CRITICAL";
    if (isBadWeather) return "HIGH";
    if (status === "RESOLVED") return "LOW";
    return "MEDIUM";
}

function parseForecast(forecastSummary) {
    return forecastSummary
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const temp = Number((line.match(/Max Temp:\s*([-+]?\d+(\.\d+)?)/i) || [])[1] || 0);
            const rain = Number((line.match(/Rain:\s*([-+]?\d+(\.\d+)?)/i) || [])[1] || 0);
            const wind = Number((line.match(/Wind:\s*([-+]?\d+(\.\d+)?)/i) || [])[1] || 0);
            return { raw: line, temp, rain, wind };
        });
}

function buildDetailedAnalysis({ report, forecastSummary, generatedInsight, isBadWeather }) {
    const parsed = parseForecast(forecastSummary);
    const totalDays = parsed.length || 1;
    const heavyRainDays = parsed.filter((d) => d.rain >= 10).length;
    const highWindDays = parsed.filter((d) => d.wind >= 40).length;
    const heatStressDays = parsed.filter((d) => d.temp >= 40).length;
    const avgRain = parsed.reduce((s, d) => s + d.rain, 0) / totalDays;
    const avgWind = parsed.reduce((s, d) => s + d.wind, 0) / totalDays;
    const avgTemp = parsed.reduce((s, d) => s + d.temp, 0) / totalDays;
    const riskBand = classifyRiskBand({ isBadWeather, status: report.status });

    const immediateActions = [];
    if (isBadWeather) {
        immediateActions.push(
            "Deploy field inspection within 12 hours to validate current structural condition and safety perimeter.",
            "Clear drains and water channels immediately to prevent overflow, erosion, and sub-surface weakening.",
            "Install temporary warning barriers and reflective signage around high-risk points."
        );
    } else {
        immediateActions.push(
            "Perform preventive inspection in the next 24-48 hours and document visible deterioration.",
            "Schedule routine maintenance to reduce long-term degradation and avoid escalation of repair cost.",
            "Keep a local monitoring log with geotagged photos at fixed intervals."
        );
    }

    const maintenancePlan = [
        "Short term (0-7 days): stabilization, hazard isolation, and rapid corrective action.",
        "Medium term (2-6 weeks): permanent repair with quality checks and weather resilience validation.",
        "Long term (quarterly): preventive inspections, drainage verification, and integrity scoring trend analysis."
    ];

    const executiveSummary = `Risk band: ${riskBand}. Status: ${report.status}. Forecast stress profile over ${totalDays} day(s): average temperature ${avgTemp.toFixed(
        1
    )}C, average precipitation ${avgRain.toFixed(1)}mm, average wind ${avgWind.toFixed(1)}km/h. Heavy rain days: ${heavyRainDays}, high wind days: ${highWindDays}, extreme heat days: ${heatStressDays}.`;

    const detailedNarrative = [
        "Detailed AI Assessment (English):",
        sanitizeAscii(generatedInsight),
        "",
        "Operational Interpretation:",
        `This issue (${sanitizeAscii(report.title)}) is mapped to ${sanitizeAscii(report.department?.name || "Unknown Department")} in ${sanitizeAscii(
            report.city?.name || "Unknown City"
        )}. Based on weather pressure indicators and current workflow status, the likely risk propagation path includes surface deterioration, localized safety exposure, and higher rehabilitation complexity if delayed.`
    ].join("\n");

    return {
        riskBand,
        executiveSummary,
        immediateActions,
        maintenancePlan,
        detailedNarrative,
        parsed
    };
}

async function sendAuditEmail({ to, report, pdfBuffer }) {
    if (!resend || !to) return;
    await resend.emails.send({
        from: senderEmail,
        to,
        subject: `[CivicConnect Intelligence] Detailed Environmental Audit: ${report.reportId}`,
        html: `
            <p>Hello,</p>
            <p>The automated environmental risk audit for report <strong>${report.reportId}</strong> is ready.</p>
            <p>Issue: <strong>${report.title}</strong><br/>Status: <strong>${report.status}</strong></p>
            <p>The detailed PDF is attached for review.</p>
        `,
        attachments: [{ filename: `CivicAudit_${report.reportId}.pdf`, content: pdfBuffer }]
    });
}

export async function analyzeWeatherAndRisk(reportId) {
    try {
        const report = await db.report.findUnique({
            where: { id: reportId },
            include: { author: true, department: true, city: true }
        });

        if (!report || !report.latitude || !report.longitude) {
            return { success: false, error: "Invalid report or missing GPS" };
        }

        // 1. Fetch Weather
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${report.latitude}&longitude=${report.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`);
        const weatherData = await weatherResponse.json();
        const engineUrl = process.env.ML_ENGINE_URL || "http://127.0.0.1:8000";


        let forecastSummary = "";
        let isBadWeather = false;

        for (let i = 0; i < 7; i++) {
            const rain = weatherData.daily.precipitation_sum[i];
            const wind = weatherData.daily.windspeed_10m_max[i];
            const temp = weatherData.daily.temperature_2m_max[i];

            if (rain > 10 || wind > 40 || temp > 40) isBadWeather = true;
            forecastSummary += `Day ${i + 1} | Max Temp: ${temp}°C | Rain: ${rain}mm | Wind: ${wind}km/h\n`;
        }

        // 2. Fetch AI Text from Local Python Server
        const aiResponse = await fetch(`${engineUrl}/generate-risk-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: report.title,
                status: report.status,
                weather: forecastSummary,
                language: "en",
                response_language: "English"
            })
        });

        if (!aiResponse.ok) throw new Error("Local NLP Engine failed to respond");

        const aiData = await aiResponse.json();
        const rawInsight = (aiData.report_text || "").toString();
        const generatedInsight = isLikelyEnglish(rawInsight)
            ? sanitizeAscii(rawInsight)
            : buildFallbackEnglishInsight({
                title: report.title,
                status: report.status,
                isBadWeather
            });

        const detailed = buildDetailedAnalysis({
            report,
            forecastSummary,
            generatedInsight,
            isBadWeather
        });
        const finalInsight = `${detailed.executiveSummary}\n\n${detailed.detailedNarrative}\n\nImmediate Actions:\n- ${detailed.immediateActions.join(
            "\n- "
        )}\n\nResilience Plan:\n- ${detailed.maintenancePlan.join("\n- ")}`;

        await db.report.update({
            where: { id: reportId },
            data: {
                weatherForecast: forecastSummary,
                aiRiskAnalysis: finalInsight,
                lastWeatherScan: new Date()
            }
        });

        // 3. Try to generate PDF and Email (Wrapped in a safe Try/Catch)
        try {
            const pdfBuffer = await new Promise((resolve) => {
                const doc = new PDFDocument({ margin: 50, size: "A4" });
                let buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                const ensureSpace = (needed = 70) => {
                    if (doc.y + needed > doc.page.height - 60) {
                        doc.addPage();
                    }
                };

                const drawSectionTitle = (title) => {
                    ensureSpace(40);
                    doc.moveDown(0.5);
                    doc.fontSize(14).fillColor("#f97316").text(title, { underline: false });
                    doc.moveDown(0.2);
                };

                doc.rect(0, 0, 600, 110).fill('#0f172a');
                doc.fontSize(24).fillColor('#f97316').text('CIVIC INFRASTRUCTURE AUDIT', 50, 35);
                doc.fontSize(10).fillColor('#94a3b8').text(`AUTOMATED ENVIRONMENTAL RISK ASSESSMENT MODULE`, 50, 65);
                doc.fontSize(9).fillColor("#cbd5e1").text(`Generated: ${new Date().toISOString()}`, 50, 80);
                doc.y = 130;

                drawSectionTitle("1. Incident Intelligence Snapshot");
                doc.fontSize(10).fillColor("#111827");
                doc.text(`Reference ID: ${report.reportId}`);
                doc.text(`Issue Title: ${sanitizeAscii(report.title)}`);
                doc.text(`Status: ${report.status}`);
                doc.text(`Department: ${sanitizeAscii(report.department?.name || "N/A")}`);
                doc.text(`City: ${sanitizeAscii(report.city?.name || "N/A")}`);
                doc.text(`Coordinates: [${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}]`);
                doc.text(`Risk Band: ${detailed.riskBand}`);

                drawSectionTitle("2. Executive Summary");
                doc.fontSize(10).fillColor("#1f2937").text(sanitizeAscii(detailed.executiveSummary), {
                    align: "justify",
                    lineGap: 3
                });

                drawSectionTitle("3. Seven-Day Weather Matrix");
                detailed.parsed.forEach((day, idx) => {
                    ensureSpace(20);
                    doc.fontSize(9).fillColor("#0f172a").text(
                        `Day ${idx + 1}: Temp ${day.temp}C | Rain ${day.rain}mm | Wind ${day.wind}km/h | Raw: ${sanitizeAscii(day.raw)}`
                    );
                });

                drawSectionTitle("4. Detailed AI Risk Narrative");
                doc.fontSize(10).fillColor("#1e293b").text(sanitizeAscii(detailed.detailedNarrative), {
                    align: "justify",
                    lineGap: 3
                });

                drawSectionTitle("5. Immediate Response Actions");
                detailed.immediateActions.forEach((action, idx) => {
                    ensureSpace(25);
                    doc.fontSize(10).fillColor("#1f2937").text(`${idx + 1}. ${sanitizeAscii(action)}`, { align: "justify" });
                });

                drawSectionTitle("6. Long-Term Resilience and Maintenance Plan");
                detailed.maintenancePlan.forEach((item, idx) => {
                    ensureSpace(25);
                    doc.fontSize(10).fillColor("#1f2937").text(`${idx + 1}. ${sanitizeAscii(item)}`, { align: "justify" });
                });

                drawSectionTitle("7. Monitoring and Compliance Checklist");
                const checklist = [
                    "Field validation photo log completed.",
                    "Drainage and run-off controls verified.",
                    "Public safety signage and barriers reviewed.",
                    "Repair durability verified against next 7-day forecast.",
                    "Department follow-up ticket created with due date.",
                    "Citizen communication delivered with current status and expected timeline."
                ];
                checklist.forEach((item) => {
                    ensureSpace(20);
                    doc.fontSize(9).fillColor("#0f172a").text(`[ ] ${item}`);
                });

                doc.end();
            });

            const pdfBase64 = pdfBuffer.toString('base64');

            // If PDF succeeds, save the base64 to DB so the download button appears
            await db.report.update({
                where: { id: reportId },
                data: { pdfReportBase64: pdfBase64 }
            });

            // Send email to report author + municipal admins
            const adminProfiles = await db.adminProfile.findMany({
                where: { departmentId: report.departmentId },
                include: { user: { select: { email: true } } }
            });
            const municipalAdmins = await db.user.findMany({
                where: {
                    OR: [
                        { role: "SUPER_ADMIN" },
                        {
                            role: "ADMIN",
                            adminProfile: {
                                department: {
                                    cityId: report.cityId
                                }
                            }
                        }
                    ]
                },
                select: { email: true }
            });
            const recipients = new Set([
                report.author?.email,
                ...adminProfiles.map((admin) => admin.user?.email),
                ...municipalAdmins.map((admin) => admin.email)
            ]);

            const emailTargets = [...recipients].filter(Boolean);
            const deliveryResults = await Promise.allSettled(
                emailTargets.map((to) => sendAuditEmail({ to, report, pdfBuffer }))
            );
            deliveryResults.forEach((result, idx) => {
                if (result.status === "rejected") {
                    console.error(`Failed to send audit email to ${emailTargets[idx]}:`, result.reason);
                }
            });

            if (deliveryResults.every((result) => result.status === "rejected")) {
                throw new Error("All audit email deliveries failed");
            }

        } catch (pdfError) {
            console.error("PDF or Email Generation Failed, but AI text is safe.", pdfError);
            // We don't throw the error, we just log it, so the function still returns success for the text part.
        }

        return { success: true };

    } catch (error) {
        console.error("Critical Engine Error:", error);
        return { success: false, error: error.message };
    }
}