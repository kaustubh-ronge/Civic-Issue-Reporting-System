import { db } from '@/lib/prisma'

export async function getAreaReportCounts(cityId, category = null) {
  try {
    const whereReports = { status: { not: 'RESOLVED' } }
    if (category) whereReports.category = category

    const areas = await db.area.findMany({
      where: { cityId },
      include: {
        _count: {
          select: { reports: true }
        },
        reports: {
          where: whereReports,
          select: { id: true, latitude: true, longitude: true }
        }
      }
    })

    return areas.map(a => ({
      areaId: a.id,
      name: a.name,
      totalActiveReports: a.reports.length,
      latitudeSample: a.reports[0]?.latitude || null,
      longitudeSample: a.reports[0]?.longitude || null
    }))
  } catch (error) {
    console.error('Analytics error:', error)
    return []
  }
}

export async function getReportsByArea(areaId, category = null) {
  try {
    const whereClause = { areaId }
    if (category) whereClause.category = category

    const reports = await db.report.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 }
      }
    })

    return reports.map(r => ({
      id: r.id,
      reportId: r.reportId,
      title: r.title,
      category: r.category,
      image: r.images?.[0]?.url || null
    }))
  } catch (error) {
    console.error('getReportsByArea error:', error)
    return []
  }
}