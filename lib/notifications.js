'use server'

import { db } from "@/lib/prisma"
import { Resend } from 'resend' // For email - install: npm install resend

// Initialize Resend only if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/**
 * Send email notification using Resend
 */
export async function sendEmailNotification(userEmail, subject, htmlContent) {
    try {
        if (!resend) {
            console.warn("RESEND_API_KEY not configured, skipping email")
            return { success: false, error: "Email service not configured" }
        }

        if (!process.env.EMAIL_FROM) {
            console.warn("EMAIL_FROM not configured")
            return { success: false, error: "EMAIL_FROM not configured" }
        }

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: userEmail,
            subject: subject,
            html: htmlContent,
        })

        if (error) {
            console.error("Email send error:", error)
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (error) {
        console.error("Email notification error:", error)
        return { success: false, error: error.message }
    }
}


/**
 * Create in-app notification
 */
export async function createInAppNotification(userId, title, message, reportId = null) {
    try {
        const notification = await db.notification.create({
            data: {
                userId,
                type: 'IN_APP',
                title,
                message,
                reportId
            }
        })
        return { success: true, notification }
    } catch (error) {
        console.error("In-app notification error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Send notification based on user preferences
 */
export async function sendNotification(userId, title, message, reportId = null, priority = 'MEDIUM') {
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                emailNotifications: true
            }
        })

        if (!user) {
            return { success: false, error: "User not found" }
        }

        const results = {
            email: null,
            inApp: null
        }

        // Always create in-app notification
        results.inApp = await createInAppNotification(userId, title, message, reportId)

        // Send email if enabled
        if (user.emailNotifications && user.email) {
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">Civic Issue Reporting</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
                        <h2 style="color: #f97316; margin-top: 0;">${title}</h2>
                        <p style="font-size: 16px; color: #4b5563;">${message}</p>
                        ${reportId ? `
                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/report/${reportId}" 
                                   style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                    View Report
                                </a>
                            </div>
                        ` : ''}
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                            This is an automated notification from Civic Issue Reporting System.
                        </p>
                    </div>
                </body>
                </html>
            `
            results.email = await sendEmailNotification(user.email, title, emailHtml)
        }

        return { success: true, results }
    } catch (error) {
        console.error("Send notification error:", error)
        return { success: false, error: error.message }
    }
}

