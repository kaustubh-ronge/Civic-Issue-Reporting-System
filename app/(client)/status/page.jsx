import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import StatusClient from "./_components/StatusClient"
import { getUserReports, getReportByReportId } from "@/actions/reportActions"

export default async function StatusPage({ searchParams }) {
    const user = await checkUser()
    if (!user) return redirect('/')

    // If tracking a specific report ID
    const params = await searchParams
    const trackId = params?.track
    
    let trackedReport = null
    if (trackId) {
        const result = await getReportByReportId(trackId)
        if (result.success) {
            trackedReport = result.report
        }
    }

    // Get all user reports
    const { reports } = await getUserReports()

    return <StatusClient 
        user={user} 
        initialReports={reports || []} 
        trackedReport={trackedReport}
        trackId={trackId}
    />
}

