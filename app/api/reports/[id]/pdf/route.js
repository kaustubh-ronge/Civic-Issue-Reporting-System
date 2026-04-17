import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, { params }) {
    try {
        const user = await checkUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const report = await db.report.findUnique({
            where: { reportId: id },
            select: {
                id: true,
                reportId: true,
                authorId: true,
                departmentId: true,
                pdfReportBase64: true
            }
        });

        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const isAuthor = report.authorId === user.id;
        const isSuperAdmin = user.role === "SUPER_ADMIN";
        let isDepartmentAdmin = false;

        if (user.role === "ADMIN" && !isSuperAdmin) {
            const adminProfile = await db.adminProfile.findUnique({
                where: { userId: user.id },
                select: { departmentId: true }
            });
            isDepartmentAdmin = adminProfile?.departmentId === report.departmentId;
        }

        if (!isAuthor && !isSuperAdmin && !isDepartmentAdmin) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        if (!report.pdfReportBase64) {
            return NextResponse.json({ success: false, error: "PDF not generated yet" }, { status: 404 });
        }

        const pdfBuffer = Buffer.from(report.pdfReportBase64, "base64");
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="CivicAudit_${report.reportId}.pdf"`,
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
                "X-Report-Id": report.reportId
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message || "Failed to download PDF" }, { status: 500 });
    }
}
