import { checkUser } from '@/lib/checkUser'
import { redirect } from 'next/navigation'
import { db } from '@/lib/prisma'
import { getReportsByArea } from '@/actions/analyticsActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AreaReportsPage({ params, searchParams }) {
  const user = await checkUser()
  if (!user) return redirect('/')
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <div className="p-10 text-white">Access Denied</div>

  // 1. Await params
  const { areaId } = await params
  
  // 2. Await searchParams (This was the error)
  const resolvedSearchParams = await searchParams
  const category = resolvedSearchParams?.category || null

  if (!areaId) return <div className="p-10 text-white">Invalid Area ID</div>

  // Confirm admin belongs to same city
  const adminProfile = await db.adminProfile.findUnique({ where: { userId: user.id }, include: { department: true } })
  if (!adminProfile) return redirect('/admin')

  const area = await db.area.findUnique({ where: { id: areaId } })
  if (!area) return <div className="p-10 text-white">Area not found</div>
  
  if (area.cityId !== adminProfile.department.cityId && user.role !== 'SUPER_ADMIN') return <div className="p-10 text-white">Access Denied</div>

  const reports = await getReportsByArea(areaId, category)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-white font-bold">Reports in {area.name}</h1>
          <p className="text-sm text-slate-400">Showing {reports.length} reports{category ? ` in ${category}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/admin/analytics/heatmap`} className="text-sm text-slate-400 underline">Back to heatmap</a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(r => (
          <Card key={r.id} className="bg-slate-900/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div>
                  <div className="font-bold">{r.title}</div>
                  <div className="text-xs text-slate-400">#{r.reportId} • {r.category || 'Uncategorized'}</div>
                </div>
                {r.image ? <img src={r.image} className="h-12 w-12 object-cover rounded" alt="thumb" /> : <div className="h-12 w-12 bg-white/5 rounded" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a href={`/admin/report/${r.reportId}`} className="text-sm text-orange-400 underline">Open report</a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}