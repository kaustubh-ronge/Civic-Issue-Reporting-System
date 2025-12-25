'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Building2, CheckCircle2, AlertCircle, XCircle, Loader2, ArrowLeft, Image as ImageIcon } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useRouter } from "next/navigation"

export default function ReportDetailClient({ report, user, isAuthor, isAdmin }) {
    const router = useRouter()

    // 🔹 LOGIC: Combine legacy image field with new multi-image list
    const allImages = report.images || [];
    // If there is a legacy image not in the list, add it to the front
    if (report.imageUrl && !allImages.find(img => img.url === report.imageUrl)) {
        allImages.unshift({ id: 'legacy', url: report.imageUrl });
    }

    const statusColors = {
        PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        IN_PROGRESS: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        RESOLVED: "bg-green-500/10 text-green-500 border-green-500/20",
        REJECTED: "bg-red-500/10 text-red-500 border-red-500/20"
    }

    const statusIcons = {
        PENDING: AlertCircle,
        IN_PROGRESS: Loader2,
        RESOLVED: CheckCircle2,
        REJECTED: XCircle
    }

    const StatusIcon = statusIcons[report.status] || AlertCircle

    return (
        <div className="max-w-5xl mx-auto space-y-6 py-8">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-slate-400 hover:text-white mb-4 pl-0"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className={statusColors[report.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {report.status.replace("_", " ")}
                        </Badge>
                        <span className="text-slate-400 font-mono text-sm">#{report.reportId}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">{report.title}</h1>
                    <p className="text-slate-400 text-sm">
                        Submitted {formatDistanceToNow(new Date(report.createdAt))} ago
                        {report.updatedAt && report.updatedAt !== report.createdAt && (
                            <span> • Last updated {formatDistanceToNow(new Date(report.updatedAt))} ago</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid md:grid-cols-3 gap-6">
                
                {/* Left Column - Main Details */}
                <div className="md:col-span-2 space-y-6">
                    
                    {/* PHOTO GALLERY */}
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
                                            <img 
                                                src={img.url} 
                                                alt={`Evidence ${index + 1}`} 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                            />
                                            {/* Hover Overlay */}
                                            <a 
                                                href={img.url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium backdrop-blur-sm"
                                            >
                                                View Full Size
                                            </a>
                                        </div>
                                    ))}
                                </div>
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

                    {/* Official Response (If any) */}
                    {report.adminNote && (
                        <Card className="bg-blue-500/10 border-blue-500/20">
                            <CardHeader>
                                <CardTitle className="text-blue-300 flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Official Response
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-200">{report.adminNote}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Info Sidebar */}
                <div className="space-y-6">
                    <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Report Info</CardTitle>
                        </CardHeader>
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
                            {report.area && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Area</p>
                                    <div className="flex items-center gap-2 text-white">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        <span>{report.area.name}</span>
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">Submitted</p>
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm">{format(new Date(report.createdAt), 'MMM dd, yyyy')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Google Map */}
                    {report.latitude && report.longitude && (
                        <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10 overflow-hidden">
                            <div className="aspect-square w-full">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${report.longitude - 0.01},${report.latitude - 0.01},${report.longitude + 0.01},${report.latitude + 0.01}&layer=mapnik&marker=${report.latitude},${report.longitude}`}
                                    allowFullScreen
                                />
                            </div>
                            <div className="p-3 bg-slate-900 border-t border-white/10 text-center">
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center justify-center gap-1"
                                >
                                    <MapPin className="h-3 w-3" /> Open in Google Maps
                                </a>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}