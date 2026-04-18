

'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Building2, CheckCircle2, AlertCircle, XCircle, Loader2, ArrowLeft, Image as ImageIcon, Share2, Video, Sparkles, ShieldAlert, DownloadCloud } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import FloatingParticles from "@/components/FloatingParticles" 
import { useState, useTransition, useEffect } from 'react'
import { toast } from "sonner"
import { confirmResolutionSchema, reopenReportSchema, validateObject, formatValidationErrors } from "@/lib/validation-schemas"
import MuxPlayer from "@mux/mux-player-react"

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
    const [formErrors, setFormErrors] = useState(null)

    const handleDownloadPDF = async () => {
        if (!report.reportId) return;
        try {
            const response = await fetch(`/api/reports/${report.reportId}/pdf?ts=${Date.now()}`, {
                method: "GET",
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Failed to download report PDF");
            }

            const receivedReportId = response.headers.get("x-report-id");
            if (receivedReportId && receivedReportId !== report.reportId) {
                throw new Error(`Report mismatch detected. Expected ${report.reportId}, got ${receivedReportId}`);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = objectUrl;
            downloadLink.download = `CivicAudit_${report.reportId}.pdf`;
            downloadLink.rel = "noopener";
            downloadLink.click();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("PDF download failed:", error);
            alert("Unable to download the correct PDF right now. Please try again.");
        }
    };

    const handleVerify = () => {
        if (!confirm('Are you sure you want to verify this report?')) return;

        startTransition(async () => {
            try {
                const result = await verifyAction(report.id)
                if (result.success) {
                    router.refresh()
                } else {
                    alert(result.error || "Verification failed")
                }
            } catch (error) {
                alert("An unexpected error occurred.")
            }
        })
    }

    const handleConfirm = async (e) => {
        e.preventDefault()
        setFormErrors(null)
        
        // Validate before submission
        const validation = await validateObject({ reportId: report.id || report.reportId }, confirmResolutionSchema)
        if (!validation.success) {
            const formatted = formatValidationErrors(validation.errors)
            setFormErrors(formatted)
            toast.error(formatted.reportId || "Validation failed")
            return
        }

        startTransition(async () => {
            try {
                const result = await confirmAction()
                if (result?.success) {
                    toast.success("Resolution confirmed!")
                    router.refresh()
                } else {
                    toast.error(result?.error || "Failed to confirm resolution")
                }
            } catch (error) {
                toast.error("An unexpected error occurred")
            }
        })
    }

    const handleReopen = async (e) => {
        e.preventDefault()
        setFormErrors(null)
        
        // Validate before submission
        const validation = await validateObject(
            { reportId: report.id || report.reportId, reason: reopenReason },
            reopenReportSchema
        )
        if (!validation.success) {
            const formatted = formatValidationErrors(validation.errors)
            setFormErrors(formatted)
            toast.error(formatted.reason || formatted.reportId || "Validation failed")
            return
        }

        startTransition(async () => {
            try {
                const result = await reopenAction()
                if (result?.success) {
                    toast.success("Report reopened successfully!")
                    setShowReopen(false)
                    setReopenReason("")
                    router.refresh()
                } else {
                    toast.error(result?.error || "Failed to reopen report")
                }
            } catch (error) {
                toast.error("An unexpected error occurred")
            }
        })
    }

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
            if (!key) {
                key = v.id;
            }
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function VideoLoader({ video }) {
        const [src, setSrc] = useState(video.url || null)
        const [error, setError] = useState(false)
        useEffect(() => {
            if (video.playbackId || src) return;
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
        }, [video.id, video.playbackId, src])

        if (video.playbackId) {
            return (
                <MuxPlayer
                    playbackId={video.playbackId}
                    metadata={{ video_id: video.id, video_title: 'Evidence Video' }}
                    className="w-full h-full object-cover"
                />
            )
        }

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
            
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
                <div className="absolute top-0 right-0 w-125 h-125 bg-blue-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-0 w-125 h-125 bg-orange-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
                <FloatingParticles />
            </div>

            <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-6xl">
                
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
                        {report.pdfReportBase64 && (
                            <Button
                                onClick={handleDownloadPDF}
                                variant="outline"
                                size="sm"
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                            >
                                <DownloadCloud className="h-4 w-4 mr-2" /> Download Detailed PDF
                            </Button>
                        )}
                    </div>
                </div>

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

                {report.status === 'PENDING_VERIFICATION' && isAuthor && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                        <Card className="bg-amber-900/10 border border-amber-500/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-amber-300">Is this fixed?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 mb-4">An official has marked this report as resolved. Please confirm whether the issue is fixed.</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <form onSubmit={handleConfirm}>
                                        <input type="hidden" name="reportId" value={report.id || report.reportId} />
                                        <Button size="sm" type="submit" disabled={isPending} className="bg-green-600 text-white hover:bg-green-500">
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                            {isPending ? "Confirming..." : "Yes, it's fixed"}
                                        </Button>
                                    </form>

                                    {!showReopen ? (
                                        <Button variant="ghost" size="sm" onClick={() => setShowReopen(true)}>No, Re-open</Button>
                                    ) : (
                                        <form onSubmit={handleReopen} className="flex items-center gap-2 w-full flex-wrap">
                                            <input type="hidden" name="reportId" value={report.id || report.reportId} />
                                            <input type="hidden" name="reason" value={reopenReason} />
                                            <input
                                                value={reopenReason}
                                                onChange={(e) => setReopenReason(e.target.value)}
                                                placeholder="Reason for re-opening (optional)"
                                                className={`bg-slate-900 border ${formErrors?.reason ? 'border-red-500 focus:border-red-500' : 'border-white/5'} rounded-md px-3 py-2 text-sm text-white flex-1 min-w-64`}
                                            />
                                            <Button size="sm" type="submit" disabled={isPending} className="bg-red-600 text-white hover:bg-red-500">
                                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Re-open"}
                                            </Button>
                                        </form>
                                    )}
                                </div>
                                {formErrors?.reason && <p className="text-xs text-red-400 mt-2 flex items-center gap-1\"><AlertCircle className="h-3 w-3" />{formErrors.reason}</p>}
                                {formErrors?.reportId && <p className="text-xs text-red-400 mt-2 flex items-center gap-1\"><AlertCircle className="h-3 w-3" />{formErrors.reportId}</p>}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* YOLO AI PROOF IMAGE */}
                        {report.aiImageUrl && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                <Card className="bg-orange-900/10 backdrop-blur-xl border-orange-500/20 overflow-hidden">
                                    <CardHeader className="border-b border-orange-500/10 pb-4">
                                        <CardTitle className="text-orange-400 flex items-center gap-2 text-lg">
                                            <Sparkles className="h-5 w-5" /> AI Verified Blueprint
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                                            <img src={report.aiImageUrl} alt="AI Proof" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <a href={report.aiImageUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white text-sm font-medium backdrop-blur-[2px]">
                                                View Full Size
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* --- ENVIRONMENTAL RISK AUDIT --- */}
                        {report.aiRiskAnalysis && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                                <Card className="bg-blue-950/20 backdrop-blur-xl border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                    <CardHeader className="border-b border-blue-500/10 pb-4 flex flex-row items-center justify-between">
                                        <CardTitle className="text-blue-400 flex items-center gap-2 text-lg">
                                            <ShieldAlert className="h-5 w-5" /> Environmental Risk Audit
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                                            <p className="mb-4 font-semibold text-blue-300">Automated Intelligence Strategy:</p>
                                            <p className="leading-relaxed">{report.aiRiskAnalysis}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                        {/* -------------------------------------- */}

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

                        {allVideos.length > 0 ? (
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
                                                    <VideoLoader video={vid} />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10">
                                    <CardContent className="p-6 text-center text-slate-500">
                                        No video evidence attached for this report.
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

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
                    </div>

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

                                    {(() => {
                                        const lat = parseFloat(report.latitude)
                                        const lon = parseFloat(report.longitude)
                                        const valid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
                                        if (!valid) return null
                                        const delta = 0.002
                                        return (
                                            <div className="rounded-xl overflow-hidden border border-white/10 mt-4 relative group">
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
                                        )
                                    })()}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}