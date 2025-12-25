import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import { getReportByReportId } from "@/actions/reportActions"
import AdminReportDetailClient from "./_components/AdminReportDetailClient"
import { db } from "@/lib/prisma"

export default async function AdminReportDetailPage({ params }) {
    const user = await checkUser()
    if (!user) return redirect('/')
    
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400">You don't have permission to view this page.</p>
                </div>
            </div>
        )
    }

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

    // Check if admin has access to this report (same department)
    const adminProfile = await db.adminProfile.findUnique({
        where: { userId: user.id },
        include: { department: true }
    })

    if (!adminProfile) {
        return redirect('/admin')
    }

    const hasAccess = result.report.departmentId === adminProfile.departmentId || user.role === 'SUPER_ADMIN'

    if (!hasAccess) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-slate-400">This report belongs to a different department.</p>
                </div>
            </div>
        )
    }

    return <AdminReportDetailClient report={result.report} user={user} adminProfile={adminProfile} />
}

