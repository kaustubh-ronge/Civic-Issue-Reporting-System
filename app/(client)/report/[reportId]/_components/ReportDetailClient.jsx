'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Building2, CheckCircle2, AlertCircle, XCircle, Loader2, ArrowLeft, Image as ImageIcon, Share2, Video } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import FloatingParticles from "@/components/FloatingParticles" // Assuming you have this
import { useState, useTransition } from 'react'

export default function ReportDetailClient({ 
    report, 
    user, 
    isAuthor, 
    isAdmin, 
    verifyAction, 
    confirmAction, 
    reopenAction, 
    receiptDataUrl 
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [reopenReason, setReopenReason] = useState('')
    const [showReopen, setShowReopen] = useState(false)

    // --- LOGIC: Handle Verify Button Click ---
    const handleVerify = () => {
        if (!confirm('Are you sure you want to verify this report?')) return;

        startTransition(async () => {
            try {
                const result = await verifyAction(report.id)
                if (result.success) {
                    router.refresh() // Refresh page data to show "Verified" status
                } else {
                    alert(result.error || "Verification failed")
                }
            } catch (error) {
                alert("An unexpected error occurred.")
            }
        })
    }

    // Combine legacy image field with new multi-image list for display
    const allImages = report.images ? [...report.images] : [];
    if (report.imageUrl && !allImages.find(img => img.url === report.imageUrl)) {
        allImages.unshift({ id: 'legacy', url: report.imageUrl });
    }

    const allVideos = report.videos || []

    // Status Configuration
    const statusConfig = {
        PENDING: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertCircle, label: "Pending Review" },
        IN_PROGRESS: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Loader2, label: "In Progress" },
        PENDING_VERIFICATION: { color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: CheckCircle2, label: "Pending Verification" },
        RESOLVED: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: CheckCircle2, label: "Resolved" },
        REJECTED: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle, label: "Rejected" }
    }

    const config = statusConfig[report.status] || statusConfig.PENDING
    const StatusIcon = config.icon

    return (
        <div className="min-h-screen bg-slate-950 pt-28 pb-12 relative overflow-hidden">
            
            {/* --- BACKGROUND EFFECTS --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
                <div className="absolute top-0 right-0 w-125 h-125 bg-blue-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-0 w-125 h-125 bg-orange-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
                <FloatingParticles />
            </div>

            <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-6xl">
                
                {/* --- NAVIGATION & ACTION BAR --- */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-slate-400 hover:text-white hover:bg-white/5 pl-0 gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white bg-white/5 backdrop-blur-sm">
                            <Share2 className="h-4 w-4 mr-2" /> Share
                        </Button>

                        {/* --- VERIFY BUTTON LOGIC --- */}
                        {!report.isVerified ? (
                            <Button 
                                size="sm" 
                                onClick={handleVerify} 
                                disabled={isPending}
                                className="gap-2 bg-slate-100 text-slate-900 hover:bg-slate-200"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4" />}
                                {isPending ? "Verifying..." : "Verify"}
                            </Button>
                        ) : (
                            <Button size="sm" disabled className="gap-2 bg-green-500/20 text-green-400 border border-green-500/50">
                                <CheckCircle2 className="h-4 w-4" /> Verified
                            </Button>
                        )}

                        {receiptDataUrl && (
                            <a href={receiptDataUrl} download={`receipt-${report.reportId}.pdf`} className="inline-block">
                                <Button variant="ghost" size="sm" className="ml-2">Download Receipt</Button>
                            </a>
                        )}
                    </div>
                </div>

                {/* --- HEADER --- */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border} px-3 py-1 text-sm font-medium uppercase tracking-wide flex items-center gap-1.5`}>
                                    <StatusIcon className="h-4 w-4" /> {config.label}
                                </Badge>

                                {report.priority && (
                                    <Badge variant="outline" className="bg-white/5 text-slate-300 border-white/10 px-3 py-1 text-sm uppercase">
                                        {report.priority} Priority
                                    </Badge>
                                )}

                                <span className="text-slate-500 font-mono text-sm bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                    #{report.reportId}
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{report.title}</h1>

                            {(report.category || (report.tags && report.tags.length > 0)) && (
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                    {report.category && <span className="text-sm text-slate-300 bg-white/5 px-3 py-1 rounded border border-white/5">{report.category}</span>}
                                    {report.tags && report.tags.map(tag => (
                                        <Badge key={tag.id} className="bg-white/5 text-slate-300 px-2 py-1">{tag.name}</Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="text-left md:text-right text-sm text-slate-400">
                            <p>Submitted {formatDistanceToNow(new Date(report.createdAt))} ago</p>
                            <p className="text-xs text-slate-500 mt-1">{format(new Date(report.createdAt), "PPP p")}</p>
                        </div>
                    </div>
                </motion.div>

                {/* --- CONFIRMATION CARD (For Authors) --- */}
                {report.status === 'PENDING_VERIFICATION' && isAuthor && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                        <Card className="bg-amber-900/10 border border-amber-500/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-amber-300">Is this fixed?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 mb-4">An official has marked this report as resolved. Please confirm whether the issue is fixed.</p>
                                <div className="flex items-center gap-3">
                                    {/* Using form action for simple server triggers if preferred, or convert to onClick like verify */}
                                    <form action={confirmAction}>
                                        <input type="hidden" name="reportId" value={report.id || report.reportId} />
                                        <Button size="sm" type="submit" className="bg-green-600 text-white">Yes, it's fixed</Button>
                                    </form>

                                    {!showReopen ? (
                                        <Button variant="ghost" size="sm" onClick={() => setShowReopen(true)}>No, Re-open</Button>
                                    ) : (
                                        <form action={reopenAction} className="flex items-center gap-2 w-full">
                                            <input type="hidden" name="reportId" value={report.id || report.reportId} />
                                            <input type="hidden" name="reason" value={reopenReason} />
                                            <input
                                                value={reopenReason}
                                                onChange={(e) => setReopenReason(e.target.value)}
                                                placeholder="Reason for re-opening (optional)"
                                                className="bg-slate-900 border border-white/5 rounded-md px-3 py-2 text-sm text-white w-full"
                                            />
                                            <Button size="sm" type="submit" className="bg-red-600 text-white">Re-open</Button>
                                        </form>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* --- MAIN GRID --- */}
                <div className="grid lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Image Gallery */}
                        {allImages.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 overflow-hidden">
                                    <CardHeader className="border-b border-white/5 pb-4">
                                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                                            <ImageIcon className="h-5 w-5 text-orange-400" /> Evidence Gallery
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {allImages.map((img, index) => (
                                                <div key={img.id || index} className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                                                    <img src={img.url} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    <a href={img.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white text-sm font-medium backdrop-blur-[2px]">
                                                        View Full Size
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Video Gallery */}
                        {allVideos.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 overflow-hidden">
                                    <CardHeader className="border-b border-white/5 pb-4">
                                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                                            <Video className="h-5 w-5 text-orange-400" /> Video Evidence
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {allVideos.map((vid, index) => (
                                                <div key={vid.id || index} className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                                                    <video
                                                        src={vid.url}
                                                        controls
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Description */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10">
                                <CardHeader className="border-b border-white/5 pb-4">
                                    <CardTitle className="text-white text-lg">Detailed Description</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-base">{report.description}</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Official Response */}
                        {report.adminNote && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="bg-linear-to-br from-blue-900/20 to-slate-900/40 border border-blue-500/20 overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-blue-400 flex items-center gap-2 text-lg">
                                            <Building2 className="h-5 w-5" /> Official Response
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-2">
                                        <p className="text-slate-200 leading-relaxed bg-slate-950/30 p-4 rounded-lg border border-white/5">{report.adminNote}</p>
                                        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> Update received {formatDistanceToNow(new Date(report.updatedAt))} ago
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                            <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 sticky top-24">
                                <CardHeader className="border-b border-white/5 pb-4">
                                    <CardTitle className="text-white text-lg">Report Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-0.5">Department</p>
                                            <p className="text-white font-medium">{report.department?.name}</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-white/5 w-full"></div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-0.5">Location</p>
                                            <p className="text-white font-medium">{report.city?.name}</p>
                                            {report.area && <p className="text-sm text-slate-400 mt-0.5">{report.area.name}</p>}
                                        </div>
                                    </div>

                                    {/* Map */}
                                    {report.latitude && report.longitude && (
                                        <div className="rounded-xl overflow-hidden border border-white/10 mt-4 relative group">
                                            <iframe
                                                width="100%" height="200" frameBorder="0"
                                                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${report.longitude - 0.005},${report.latitude - 0.005},${report.longitude + 0.005},${report.latitude + 0.005}&layer=mapnik&marker=${report.latitude},${report.longitude}`}
                                                allowFullScreen
                                            />
                                            <a href={`http://maps.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="secondary" className="gap-2">
                                                    <MapPin className="h-3 w-3" /> Open in Google Maps
                                                </Button>
                                            </a>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}