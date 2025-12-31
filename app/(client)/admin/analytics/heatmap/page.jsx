import { checkUser } from '@/lib/checkUser'
import { redirect } from 'next/navigation'
import { getAreaReportCounts } from '@/actions/analyticsActions'
import AdminHeatmapClient from '../_components/AdminHeatmapClient'
import { db } from '@/lib/prisma'

export default async function HeatmapPage() {
  const user = await checkUser()
  if (!user) return redirect('/')
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <div className="p-10 text-white">Access Denied</div>

  const adminProfile = await db.adminProfile.findUnique({ where: { userId: user.id }, include: { department: true } })
  if (!adminProfile) return <div className="p-10 text-white">No admin profile</div>
  if (!adminProfile.department || !adminProfile.department.cityId) return (
    <div className="p-10 text-white">
      <p className="mb-2">Admin profile is missing department assignment. Please complete your department details in the admin settings.</p>
      <a href="/admin" className="text-sm text-orange-400 underline">Go to Admin Settings</a>
    </div>
  )

  const areas = await getAreaReportCounts(adminProfile.department.cityId)

  return <AdminHeatmapClient areas={areas} />
}