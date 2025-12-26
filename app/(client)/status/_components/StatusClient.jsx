'use client'

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Clock, MapPin, Building2, ExternalLink, CheckCircle2, AlertCircle, XCircle, Loader2, Image as ImageIcon, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"
import { getReportByReportId } from "@/actions/reportActions"
import { toast } from "sonner"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import FloatingParticles from "@/components/FloatingParticles"

export default function StatusClient({ user, initialReports = [], trackedReport, trackId }) {
    const router = useRouter()
    const [reports, setReports] = useState(initialReports)
    const [searchId, setSearchId] = useState(trackId || "")
    const [searching, setSearching] = useState(false)
    const [searchedReport, setSearchedReport] = useState(trackedReport)

    const handleSearch = async () => {
        if (!searchId.trim()) {
            toast.error("Please enter a report ID")
            return
        }
        setSearching(true)
        const result = await getReportByReportId(searchId.trim())
        if (result.success) {
            setSearchedReport(result.report)
            router.push(`/status?track=${searchId.trim()}`, { scroll: false })
        } else {
            toast.error(result.error || "Report not found")
            setSearchedReport(null)
        }
        setSearching(false)
    }

    // Animation Variants
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }
    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-28 pb-12 relative overflow-hidden">
            
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
                <div className="absolute top-0 right-0 w-125 h-125 bg-blue-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-0 w-125 h-125 bg-orange-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
                <FloatingParticles />
            </div>

            <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-7xl space-y-12">
                
                {/* --- HEADER --- */}
                <div className="text-center max-w-2xl mx-auto space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        Track Your <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-500">Impact</span>
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Monitor the real-time status of your submitted reports and see the change happening.
                    </p>
                </div>

                {/* --- SEARCH BAR --- */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-2xl max-w-2xl mx-auto overflow-hidden">
                    <div className="p-2 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                            <Input
                                placeholder="Enter Report ID (e.g. RPT-8821)"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="bg-transparent border-none text-white placeholder:text-slate-500 focus-visible:ring-0 h-12 pl-12 text-lg font-mono tracking-wide"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={searching}
                            className="bg-orange-600 hover:bg-orange-500 text-white h-10 px-6 rounded-lg font-semibold shadow-lg shadow-orange-900/20"
                        >
                            {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Track"}
                        </Button>
                    </div>
                </Card>

                {/* --- SEARCH RESULT --- */}
                <AnimatePresence>
                    {searchedReport && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">Search Result</h3>
                                <Button variant="ghost" size="sm" onClick={() => setSearchedReport(null)} className="text-slate-400 hover:text-white">Clear</Button>
                            </div>
                            <ReportCard report={searchedReport} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- MY REPORTS LIST --- */}
                {user && (
                    <div className="space-y-6">
                        <Tabs defaultValue="all" className="space-y-8">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-bold text-white">My Submissions</h2>
                                <TabsList className="bg-slate-900/50 border border-white/10 p-1">
                                    <TabsTrigger value="all" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs">All</TabsTrigger>
                                    <TabsTrigger value="pending" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs">Pending</TabsTrigger>
                                    <TabsTrigger value="resolved" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs">Resolved</TabsTrigger>
                                </TabsList>
                            </div>

                            {['all', 'pending', 'resolved'].map(tab => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <motion.div 
                                        variants={container}
                                        initial="hidden"
                                        animate="show"
                                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                                    >
                                        {reports
                                            .filter(r => tab === 'all' ? true : r.status.toLowerCase() === tab)
                                            .map(report => (
                                            <motion.div key={report.id} variants={item}>
                                                <ReportCard report={report} />
                                            </motion.div>
                                        ))}
                                        
                                        {reports.filter(r => tab === 'all' ? true : r.status.toLowerCase() === tab).length === 0 && (
                                            <div className="col-span-full py-20 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                                <p className="text-slate-500">No reports found in this category.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- PREMIUM REPORT CARD COMPONENT ---
function ReportCard({ report }) {
    const router = useRouter()
    
    // 🔹 FIX: Handle image logic correctly
    const displayImage = report.images?.length > 0 ? report.images[0].url : report.imageUrl;

    const statusConfig = {
        PENDING: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", label: "Pending Review", icon: AlertCircle },
        IN_PROGRESS: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", label: "In Progress", icon: Loader2 },
        RESOLVED: { color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20", label: "Resolved", icon: CheckCircle2 },
        REJECTED: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", label: "Rejected", icon: XCircle }
    }

    const config = statusConfig[report.status] || statusConfig.PENDING;
    const StatusIcon = config.icon;

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="group flex flex-col bg-slate-900/40 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/10 cursor-pointer h-full"
            onClick={() => router.push(`/report/${report.reportId}`)}
        >
            {/* Image Section */}
            <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                {displayImage ? (
                    <img 
                        src={displayImage} 
                        alt={report.title} 
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                        <ImageIcon className="h-10 w-10 text-slate-700" />
                    </div>
                )}
                
                {/* Status Badge */}
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${config.bg} ${config.color} ${config.border} flex items-center gap-1.5 shadow-lg`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 group-hover:border-orange-500/20 transition-colors">
                        #{report.reportId}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(report.createdAt))} ago
                    </span>
                </div>

                <h3 className="text-lg font-bold text-white leading-tight mb-2 line-clamp-1 group-hover:text-orange-400 transition-colors">
                    {report.title}
                </h3>
                
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1 leading-relaxed">
                    {report.description}
                </p>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-37.5">{report.city?.name || "Unknown City"}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs font-medium text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                        View Details <ArrowRight className="h-3 w-3" />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}