import { db } from "@/lib/prisma"
import { Resend } from 'resend' 

// Initialize Resend (Fail gracefully if key is missing)
const resend = process.env.RESEND_API_KEY 
    ? new Resend(process.env.RESEND_API_KEY) 
    : null

// Helper: Send the actual email
async function sendEmailNotification(userEmail, subject, htmlContent) {
    if (!resend || !process.env.EMAIL_FROM) return null;

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: userEmail,
            subject: subject,
            html: htmlContent,
        })
        if (error) console.error("Resend Error:", error)
        return data
    } catch (error) {
        console.error("Email Exception:", error)
        return null
    }
}

// Helper: Create DB record
async function createInAppNotification(userId, title, message, reportId = null) {
    try {
        return await db.notification.create({
            data: {
                userId,
                type: 'IN_APP',
                title,
                message,
                reportId,
                isRead: false
            }
        })
    } catch (error) {
        console.error("DB Notification Error:", error)
        return null
    }
}

// --- MAIN FUNCTION EXPORTED TO ACTIONS ---
export async function sendNotification(userId, title, message, reportId = null, priority = 'MEDIUM') {
    try {
        // 1. Get User Settings
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, emailNotifications: true }
        })

        if (!user) return { success: false, error: "User not found" }

        // 2. Create In-App Notification (Always)
        await createInAppNotification(userId, title, message, reportId)

        // 3. Send Email (If enabled)
        if (user.emailNotifications && user.email) {
            
            // Generate link to the report
            const reportLink = reportId 
                ? `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}` 
                : process.env.NEXT_PUBLIC_APP_URL

            // Dynamic Color based on Priority/Status
            const headerColor = title.includes("Resolved") ? "#22c55e" : "#f97316"; // Green for resolved, Orange for others

            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: ${headerColor}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">CivicConnect Update</h1>
                    </div>
                    <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
                        <h2 style="color: #333; margin-top: 0; font-size: 20px;">${title}</h2>
                        <p style="font-size: 16px; color: #555; margin-bottom: 25px;">${message}</p>
                        
                        ${reportId ? `
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${reportLink}" 
                                   style="background-color: ${headerColor}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                    View Full Report
                                </a>
                            </div>
                        ` : ''}
                        
                        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                            This is an automated notification from your local administration.<br/>
                            © ${new Date().getFullYear()} CivicConnect
                        </p>
                    </div>
                </body>
                </html>
            `
            
            await sendEmailNotification(user.email, title, emailHtml)
        }

        return { success: true }
    } catch (error) {
        console.error("Notification System Error:", error)
        return { success: false }
    }
}