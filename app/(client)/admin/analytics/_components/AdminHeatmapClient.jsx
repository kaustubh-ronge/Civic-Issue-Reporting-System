'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AdminHeatmapClient({ areas = [] }) {
  const getColor = (count) => {
    if (count >= 6) return 'bg-red-600 text-white'
    if (count >= 3) return 'bg-yellow-500 text-black'
    return 'bg-green-500 text-white'
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl text-white font-bold mb-4">Area Heatmap (MVP)</h2>
      <p className="text-slate-400 mb-4">Areas with more active reports are highlighted.</p>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-600 rounded-sm"></span><span className="text-xs text-slate-400">6+ reports</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-yellow-500 rounded-sm"></span><span className="text-xs text-slate-400">3-5 reports</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-500 rounded-sm"></span><span className="text-xs text-slate-400">0-2 reports</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map(a => (
          <Card key={a.areaId} className="bg-slate-900/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{a.name}</span>
                <Badge className={`${getColor(a.totalActiveReports)} px-3 py-1`}>{a.totalActiveReports}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              {a.latitudeSample && a.longitudeSample ? (
                <div className="text-xs">Sample Location: {a.latitudeSample.toFixed(4)}, {a.longitudeSample.toFixed(4)}</div>
              ) : (
                <div className="text-xs">No geolocation samples available for this area.</div>
              )}
              <div className="mt-3">
                <a href={`/admin/analytics/area/${a.areaId}`} className="text-sm text-orange-400 underline">View reports in this area</a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}