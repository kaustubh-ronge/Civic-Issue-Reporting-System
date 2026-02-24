'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Clock, Building2, ArrowLeft, Loader2, Image as ImageIcon, Video } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useRouter } from "next/navigation"
import { updateReportStatus } from "@/actions/adminDashboardActions"
import { toast } from "sonner"

export default function AdminReportDetailClient({ report, user, adminProfile }) {
    const router = useRouter()
    const [statusLoading, setStatusLoading] = useState(false)
    const [newStatus, setNewStatus] = useState(report.status)
    const [adminNote, setAdminNote] = useState(report.adminNote || "")

    // 🔹 FIX: Combine legacy imageUrl and new images array with deduplication
    let allImages = report.images ? [...report.images] : [];
    {
        const seen = new Set();
        allImages = allImages.filter(img => {
            if (seen.has(img.url)) return false;
            seen.add(img.url);
            return true;
        });
        if (report.imageUrl && !seen.has(report.imageUrl)) {
            allImages.unshift({ id: 'legacy', url: report.imageUrl });
        }
    }

    let allVideos = report.videos ? [...report.videos] : [];
    {
        const seen = new Set();
        allVideos = allVideos.filter(v => {
            let key = v.playbackId || v.url || '';
            if (!key) key = v.id; // fallback if neither url nor playbackId present
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function VideoLoader({ video }) {
        const [src, setSrc] = useState(null)
        const [error, setError] = useState(false)
        useEffect(() => {
            let cancelled = false
            import("@/actions/reportActions").then(({ getVideoUrl }) => {
                if (!video.id) return
                getVideoUrl(video.id)
                    .then(url => {
                        if (!cancelled) {
                            if (!url) setError(true)
                            setSrc(url)
                        }
                    })
                    .catch(err => {
                        console.error('getVideoUrl failed', video.id, err)
                        if (!cancelled) setError(true)
                    })
            })
            return () => { cancelled = true }
        }, [video.id])

        if (src === null && !error) {
            return <div className="aspect-video bg-black flex items-center justify-center text-slate-500">Loading video…</div>
        }
        if (!src) {
            return <div className="aspect-video bg-black flex items-center justify-center text-slate-500">Video unavailable</div>
        }

        return (
            <video
                src={src}
                controls
                preload="metadata"
                className="w-full h-full object-cover"
                onError={(e) => {
                    console.error('Video load error', e, 'src', src)
                    if (e.target && e.target.error) {
                        console.error('MediaError code', e.target.error.code, e.target.error.message)
                    }
                }}
            >
                Your browser does not support video playback.
            </video>
        )
    }


    const statusColors = {
        PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        IN_PROGRESS: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        PENDING_VERIFICATION: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        RESOLVED: "bg-green-500/10 text-green-500 border-green-500/20",
        REJECTED: "bg-red-500/10 text-red-500 border-red-500/20"
    }

    const handleUpdateStatus = async () => {
        setStatusLoading(true)
        const res = await updateReportStatus(report.id, newStatus, adminNote)
        if (res.success) {
            // give more contextual feedback when resolving
            if (newStatus === 'RESOLVED') {
                if (report.status === 'PENDING_VERIFICATION') {
                    toast.success('Report force‑marked as resolved.')
                } else {
                    toast.success('Report marked resolved; reporter will now need to confirm.')
                }
            } else {
                toast.success("Status Updated Successfully")
            }
            router.refresh()
        } else {
            toast.error(res.error)
        }
        setStatusLoading(false)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 py-8">
            <Button variant="ghost" onClick={() => router.push('/admin')} className="text-slate-400 hover:text-white mb-4 pl-0">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className={statusColors[report.status]}>{report.status.replace("_", " ")}</Badge>
                        <span className="text-slate-400 font-mono text-sm">#{report.reportId}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">{report.title}</h1>
                    <p className="text-slate-400 text-sm">Submitted {formatDistanceToNow(new Date(report.createdAt))} ago</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="md:col-span-2 space-y-6">
                    
                    {/* PHOTO EVIDENCE GALLERY */}
                    {allImages.length > 0 && (
                        <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-orange-400" />
                                    Photo Evidence
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {allImages.map((img, index) => (
                                        <div key={img.id || index} className="rounded-lg overflow-hidden border border-white/10 aspect-video bg-black relative group">
                                            <img src={img.url} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                                            <a href={img.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">
                                                View Full Size
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* VIDEO EVIDENCE GALLERY */}
                    {allVideos.length > 0 ? (
                        <>
                            <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Video className="h-5 w-5 text-orange-400" />
                                        Video Evidence
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {allVideos.map((vid, index) => (
                                            <div key={vid.id || index} className="rounded-lg overflow-hidden border border-white/10 aspect-video bg-black relative">
                                                <VideoLoader video={vid} />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* MAP (same as public view) */}
                            {(() => {
                                const lat = parseFloat(report.latitude)
                                const lon = parseFloat(report.longitude)
                                const valid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
                                if (!valid) return null
                                const delta = 0.002
                                return (
                                    <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10 mt-6">
                                        <CardHeader>
                                            <CardTitle className="text-white flex items-center gap-2">
                                                <MapPin className="h-5 w-5 text-orange-400" /> Location
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="rounded-xl overflow-hidden border border-white/10 relative group">
                                                <iframe
                                                    width="100%" height="200" frameBorder="0"
                                                    style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&layer=mapnik&marker=${lat},${lon}`}
                                                    allowFullScreen
                                                />
                                                <a href={`http://maps.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="sm" variant="secondary" className="gap-2">
                                                        <MapPin className="h-3 w-3" /> Open in Google Maps
                                                    </Button>
                                                </a>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })()}
                        </>
                    ) : (
                        <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                            <CardContent className="p-6 text-center text-slate-500">
                                No video evidence attached
                            </CardContent>
                        </Card>
                    )}

                    {/* Description */}
                    <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{report.description}</p>
                        </CardContent>
                    </Card>

                    {/* Action Form */}
                    <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Update Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Status</label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
                                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Admin Note</label>


                                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Action taken..." className="bg-slate-950 border-white/10 text-white min-h-30" />
                            </div>
                            <Button onClick={handleUpdateStatus} disabled={statusLoading} className="w-full bg-orange-600 hover:bg-orange-500 text-white">
                                {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Status"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                        <CardHeader><CardTitle className="text-white text-lg">Report Info</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">Department</p>
                                <div className="flex items-center gap-2 text-white">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    <span>{report.department?.name}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">City</p>
                                <div className="flex items-center gap-2 text-white">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    <span>{report.city?.name}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">Submitted</p>
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm">{format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}