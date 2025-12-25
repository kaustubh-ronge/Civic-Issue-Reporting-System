import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import { getReportByReportId } from "@/actions/reportActions"
import ReportDetailClient from "./_components/ReportDetailClient"

export default async function ReportDetailPage({ params }) {
    const user = await checkUser()
    if (!user) return redirect('/')

    const { reportId } = await params
    if (!reportId) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Invalid Report ID</h1>
                    <p className="text-slate-400">The report ID is missing.</p>
                </div>
            </div>
        )
    }
    
    const result = await getReportByReportId(reportId)

    if (!result.success) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Report Not Found</h1>
                    <p className="text-slate-400">{result.error || "The report you're looking for doesn't exist."}</p>
                </div>
            </div>
        )
    }

    // Check if user has access (either they're the author, or they're an admin)
    const isAuthor = result.report.authorId === user.id
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
    const hasAccess = isAuthor || isAdmin

    if (!hasAccess) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400">You don't have permission to view this report.</p>
                </div>
            </div>
        )
    }

    return <ReportDetailClient report={result.report} user={user} isAuthor={isAuthor} isAdmin={isAdmin} />
}

