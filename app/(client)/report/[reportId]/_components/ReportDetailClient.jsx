'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Building2, User, CheckCircle2, AlertCircle, XCircle, Loader2, ArrowLeft } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ReportDetailClient({ report, user, isAuthor, isAdmin }) {
    const router = useRouter()

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
        <div className="max-w-4xl mx-auto space-y-6 py-8">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-slate-400 hover:text-white mb-4"
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
                    {/* Image */}
                    {report.imageUrl && (
                        <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Photo Evidence</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg overflow-hidden">
                                    <img 
                                        src={report.imageUrl} 
                                        alt={report.title}
                                        className="w-full h-auto max-h-96 object-cover"
                                    />
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
                            <p className="text-slate-300 whitespace-pre-wrap">{report.description}</p>
                        </CardContent>
                    </Card>

                    {/* Admin Note */}
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

                    {/* Map (if coordinates available) */}
                    {report.latitude && report.longitude && (
                        <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-orange-400" />
                                    Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${report.longitude - 0.01},${report.latitude - 0.01},${report.longitude + 0.01},${report.latitude + 0.01}&layer=mapnik&marker=${report.latitude},${report.longitude}`}
                                        allowFullScreen
                                    />
                                </div>
                                <div className="mt-2 text-xs text-slate-400 text-center">
                                    <a 
                                        href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}&zoom=15`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-orange-400 hover:text-orange-300"
                                    >
                                        View larger map
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Info Sidebar */}
                <div className="space-y-6">
                    {/* Report Info */}
                    <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Report Information</CardTitle>
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
                            {report.updatedAt && report.updatedAt !== report.createdAt && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Last Updated</p>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm">{format(new Date(report.updatedAt), 'MMM dd, yyyy')}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    {isAdmin && (
                        <Card className="bg-orange-500/10 border-orange-500/20">
                            <CardHeader>
                                <CardTitle className="text-orange-300 text-lg">Admin Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link href={`/admin?report=${report.reportId}`}>
                                    <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white">
                                        Manage Report
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

