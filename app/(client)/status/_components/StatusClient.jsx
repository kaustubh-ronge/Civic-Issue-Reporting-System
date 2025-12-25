'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Clock, MapPin, Building2, ExternalLink, CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"
import { getReportByReportId } from "@/actions/reportActions"
import { toast } from "sonner"
import Link from "next/link"

export default function StatusClient({ user, initialReports = [], trackedReport, trackId }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [reports, setReports] = useState(initialReports)
    const [searchId, setSearchId] = useState(trackId || "")
    const [searching, setSearching] = useState(false)
    const [searchedReport, setSearchedReport] = useState(trackedReport)

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

    const handleSearch = async () => {
        if (!searchId.trim()) {
            toast.error("Please enter a report ID")
            return
        }

        setSearching(true)
        const result = await getReportByReportId(searchId.trim())
        
        if (result.success) {
            setSearchedReport(result.report)
            // Update URL without reload
            router.push(`/status?track=${searchId.trim()}`, { scroll: false })
        } else {
            toast.error(result.error || "Report not found")
            setSearchedReport(null)
        }
        setSearching(false)
    }

    // Calculate stats
    const total = reports.length
    const pending = reports.filter(r => r.status === 'PENDING').length
    const inProgress = reports.filter(r => r.status === 'IN_PROGRESS').length
    const resolved = reports.filter(r => r.status === 'RESOLVED').length

    return (
        <div className="max-w-7xl mx-auto space-y-8 py-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">Track Your Reports</h1>
                <p className="text-slate-400">Monitor the status of your submitted reports</p>
            </div>

            {/* Search Section */}
            <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Search className="h-5 w-5 text-orange-400" />
                        Search Report by ID
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <Input
                            placeholder="Enter Report ID (e.g., RPT-1234)"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="bg-slate-950 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500 h-12 text-lg font-mono"
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={searching}
                            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white h-12 px-6"
                        >
                            {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Searched Report Result */}
            {searchedReport && (
                <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20 shadow-xl">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-white">Report Found</CardTitle>
                            <Link href={`/report/${searchedReport.reportId}`}>
                                <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white">
                                    View Details <ExternalLink className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className={statusColors[searchedReport.status]}>
                                {React.createElement(statusIcons[searchedReport.status] || AlertCircle, { className: "h-3 w-3 mr-1" })}
                                {searchedReport.status.replace("_", " ")}
                            </Badge>
                            <span className="text-slate-400 font-mono">#{searchedReport.reportId}</span>
                        </div>
                        <div>
                            <h3 className="text-white text-xl font-semibold mb-2">{searchedReport.title}</h3>
                            <p className="text-slate-300 text-sm line-clamp-2">{searchedReport.description}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 pt-2">
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Building2 className="h-4 w-4" />
                                <span>{searchedReport.department?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <MapPin className="h-4 w-4" />
                                <span>{searchedReport.city?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Clock className="h-4 w-4" />
                                <span>{formatDistanceToNow(new Date(searchedReport.createdAt))} ago</span>
                            </div>
                        </div>
                        {searchedReport.adminNote && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                                <p className="text-sm font-semibold text-blue-300 mb-1">Admin Note:</p>
                                <p className="text-sm text-slate-300">{searchedReport.adminNote}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Past Reports Section */}
            {user && (
                <>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Your Reports</h2>
                        <div className="flex gap-4">
                            <Card className="bg-slate-900 border-white/10 text-white min-w-[100px]">
                                <CardContent className="p-3 text-center">
                                    <div className="text-xl font-bold">{total}</div>
                                    <div className="text-xs text-slate-400 uppercase">Total</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900 border-white/10 text-white min-w-[100px]">
                                <CardContent className="p-3 text-center">
                                    <div className="text-xl font-bold text-yellow-400">{pending}</div>
                                    <div className="text-xs text-slate-400 uppercase">Pending</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900 border-white/10 text-white min-w-[100px]">
                                <CardContent className="p-3 text-center">
                                    <div className="text-xl font-bold text-green-400">{resolved}</div>
                                    <div className="text-xs text-slate-400 uppercase">Resolved</div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <Tabs defaultValue="all" className="space-y-6">
                        <TabsList className="bg-slate-900 border border-white/10 p-1">
                            <TabsTrigger value="all" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">All</TabsTrigger>
                            <TabsTrigger value="pending" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">Pending</TabsTrigger>
                            <TabsTrigger value="in_progress" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">In Progress</TabsTrigger>
                            <TabsTrigger value="resolved" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">Resolved</TabsTrigger>
                        </TabsList>

                        {['all', 'pending', 'in_progress', 'resolved'].map(tab => (
                            <TabsContent key={tab} value={tab}>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {reports
                                        .filter(r => tab === 'all' ? true : r.status.toLowerCase() === tab)
                                        .map(report => (
                                        <ReportCard key={report.id} report={report} />
                                    ))}
                                    {reports.filter(r => tab === 'all' ? true : r.status.toLowerCase() === tab).length === 0 && (
                                        <div className="col-span-full text-center py-12 text-slate-400">
                                            No reports found
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </>
            )}
        </div>
    )
}

function ReportCard({ report }) {
    const router = useRouter()
    const statusColors = {
        PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        IN_PROGRESS: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        RESOLVED: "bg-green-500/10 text-green-500 border-green-500/20",
        REJECTED: "bg-red-500/10 text-red-500 border-red-500/20"
    }

    return (
        <Card 
            className="bg-slate-900/50 backdrop-blur border-white/10 hover:border-orange-500/30 transition-all group cursor-pointer overflow-hidden"
            onClick={() => router.push(`/report/${report.reportId}`)}
        >
            {report.imageUrl && (
                <div className="relative w-full h-48 overflow-hidden">
                    <img 
                        src={report.imageUrl} 
                        alt={report.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                        <Badge variant="outline" className={statusColors[report.status]}>
                            {report.status.replace("_", " ")}
                        </Badge>
                    </div>
                </div>
            )}
            <CardContent className={`p-5 space-y-4 ${!report.imageUrl ? '' : ''}`}>
                {!report.imageUrl && (
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className={statusColors[report.status]}>
                            {report.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-slate-500 font-mono">#{report.reportId}</span>
                    </div>
                )}
                {report.imageUrl && (
                    <div className="flex justify-end">
                        <span className="text-xs text-slate-500 font-mono">#{report.reportId}</span>
                    </div>
                )}
                <div>
                    <h3 className="text-white text-lg font-semibold line-clamp-1">{report.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">{report.description}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3"/> {formatDistanceToNow(new Date(report.createdAt))} ago
                    </span>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                        View <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

