'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useRef } from 'react'
import "leaflet/dist/leaflet.css"

export default function AdminHeatmapClient({ areas = [] }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  const getColor = (count) => {
    if (count >= 6) return 'bg-red-600 text-white'
    if (count >= 3) return 'bg-yellow-500 text-black'
    return 'bg-green-500 text-white'
  }

  const getMarkerColor = (count) => {
    if (count >= 6) return 'red'
    if (count >= 3) return 'orange'
    return 'green'
  }

  useEffect(() => {
    let isMounted = true

    async function initMap() {
      if (!mapRef.current) return

      const L = (await import("leaflet")).default
      if (!isMounted || !mapRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      // Filter areas with valid coordinates
      const validAreas = areas.filter(a => a.latitudeSample && a.longitudeSample && Number.isFinite(a.latitudeSample) && Number.isFinite(a.longitudeSample))

      if (validAreas.length === 0) return

      // Calculate center
      const avgLat = validAreas.reduce((sum, a) => sum + a.latitudeSample, 0) / validAreas.length
      const avgLon = validAreas.reduce((sum, a) => sum + a.longitudeSample, 0) / validAreas.length

      const map = L.map(mapRef.current, {
        center: [avgLat, avgLon],
        zoom: 12,
        zoomControl: true
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map)

      // Add markers for each area
      validAreas.forEach(area => {
        const color = getMarkerColor(area.totalActiveReports)
        const marker = L.circleMarker([area.latitudeSample, area.longitudeSample], {
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
          radius: Math.min(20, Math.max(5, area.totalActiveReports * 2))
        }).addTo(map)

        marker.bindPopup(`
          <div class="text-sm">
            <strong>${area.name}</strong><br/>
            Active Reports: ${area.totalActiveReports}<br/>
            <a href="/admin/analytics/area/${area.areaId}" class="text-blue-600 underline">View reports</a>
          </div>
        `)
      })

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [areas])

  return (
    <div className="p-6">
      <h2 className="text-2xl text-white font-bold mb-4">Area Heatmap</h2>
      <p className="text-slate-400 mb-4">Interactive map showing areas with active reports. Circle size and color indicate report volume.</p>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-600 rounded-full"></span><span className="text-xs text-slate-400">6+ reports</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-orange-500 rounded-full"></span><span className="text-xs text-slate-400">3-5 reports</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-500 rounded-full"></span><span className="text-xs text-slate-400">0-2 reports</span></div>
      </div>

      {/* Map */}
      <Card className="bg-slate-900/60 border-white/10 mb-6">
        <CardContent className="p-0">
          <div ref={mapRef} className="w-full h-[400px] rounded-lg" />
        </CardContent>
      </Card>

      {/* Grid View */}
      <h3 className="text-lg text-white font-bold mb-4">Detailed View</h3>
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
                <div className="text-xs">Location: {a.latitudeSample.toFixed(4)}, {a.longitudeSample.toFixed(4)}</div>
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