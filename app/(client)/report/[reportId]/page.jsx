import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
// Import your existing actions
import { getReportByReportId, confirmResolution, reopenReport } from "@/actions/reportActions"
// Import the new verification action
import { verifyReport } from "@/actions/verificationActions"
// Import receipt action (optional)
import { generateReceiptDataUrl } from "@/actions/receiptActions"
import ReportDetailClient from "./_components/ReportDetailClient"

export default async function ReportDetailPage({ params }) {
    const user = await checkUser()
    if (!user) return redirect('/')

    // Await params (Next.js 15 requirement)
    const { reportId } = await params
    
    if (!reportId) {
        return <div className="p-10 text-center text-white">Invalid Report ID</div>
    }
    
    const result = await getReportByReportId(reportId)

    if (!result.success) {
        return <div className="p-10 text-center text-white">Report Not Found</div>
    }

    // Access Control
    const isAuthor = result.report.authorId === user.id
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
    
    // Allow Authors AND Admins to view
    if (!isAuthor && !isAdmin) {
        return <div className="p-10 text-center text-white">Access Denied</div>
    }

    // Generate receipt URL (Server Side)
    let receiptDataUrl = null
    try {
        const receiptResult = await generateReceiptDataUrl(result.report.id)
        if (receiptResult.success) receiptDataUrl = receiptResult.dataUrl
    } catch (e) {
        // Receipt generation failed, just ignore
    }

    return (
        <ReportDetailClient 
            report={result.report} 
            user={user} 
            isAuthor={isAuthor} 
            isAdmin={isAdmin} 
            // Pass server actions as props
            verifyAction={verifyReport} 
            confirmAction={confirmResolution} 
            reopenAction={reopenReport}
            receiptDataUrl={receiptDataUrl} 
        />
    )
}