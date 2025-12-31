'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Clock, Settings, Filter, Activity, CheckCircle2, AlertCircle, Image as ImageIcon, ChevronRight, Loader2 } from "lucide-react"
import { updateReportStatus } from "@/actions/adminDashboardActions"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import AdminOnboarding from "./AdminOnboarding"
import { motion, AnimatePresence } from "framer-motion"

export default function AdminDashboardClient({ user, initialReports = [], adminProfile, runAutoCloseAction = null }) {
    const router = useRouter()
    const [reports, setReports] = useState(initialReports)
    const [selectedReport, setSelectedReport] = useState(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    
    // Status Logic
    const [statusLoading, setStatusLoading] = useState(false)
    const [newStatus, setNewStatus] = useState("")
    const [adminNote, setAdminNote] = useState("")

    // Stats
    const total = reports.length
    const pending = reports.filter(r => r.status === 'PENDING').length
    const resolved = reports.filter(r => r.status === 'RESOLVED').length
    const inProgress = reports.filter(r => r.status === 'IN_PROGRESS').length

    const handleUpdateStatus = async () => {
        if (!selectedReport || !newStatus) return
        setStatusLoading(true)
        const res = await updateReportStatus(selectedReport.id, newStatus, adminNote)
        if (res.success) {
            toast.success("Status Updated Successfully")
            setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: newStatus, adminNote } : r))
            setSelectedReport(null)
            router.refresh()
        } else {
            toast.error(res.error)
        }
        setStatusLoading(false)
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
        <div className="space-y-8 pb-20">
            
            {/* --- DASHBOARD HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Department Feed
                    </motion.div>

                    <div className="hidden md:flex items-center gap-2">
                        <a href="/admin/analytics/heatmap" className="text-xs bg-white/5 px-3 py-1 rounded border border-white/10 text-slate-300">Heatmap Analytics</a>
                    </div>
                    {/* Manual maintenance actions */}
                    <div className="hidden md:flex items-center gap-2">
                        <form action={runAutoCloseAction} className="inline-block">
                            <Button type="submit" size="sm" className="text-xs bg-white/5 px-3 py-1 rounded border border-white/10 text-slate-300">Run Pending Verification Auto-Close</Button>
                        </form>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Overview</h1>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Badge variant="outline" className="text-orange-400 border-orange-400/20 bg-orange-400/10 px-3 py-0.5">
                            {adminProfile?.department?.name}
                        </Badge>
                        <span className="text-slate-600">/</span>
                        <span>{adminProfile?.department?.city?.name}</span>
                    </div>
                </div>
                
                <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-lg backdrop-blur-sm">
                            <Settings className="h-4 w-4 mr-2" /> Department Settings
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-slate-950 border-white/10 p-0 overflow-hidden">
                        <div className="max-h-[85vh] overflow-y-auto p-6">
                            <AdminOnboarding 
                                user={user} 
                                initialData={adminProfile} 
                                onSuccess={() => { setIsProfileOpen(false); router.refresh(); }} 
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Reports" value={total} icon={Activity} color="text-purple-400" bg="bg-purple-500/10" />
                <StatCard label="Pending" value={pending} icon={AlertCircle} color="text-yellow-400" bg="bg-yellow-500/10" />
                <StatCard label="In Progress" value={inProgress} icon={Clock} color="text-blue-400" bg="bg-blue-500/10" />
                <StatCard label="Resolved" value={resolved} icon={CheckCircle2} color="text-green-400" bg="bg-green-500/10" />
            </div>

            {/* --- TABS & LIST --- */}
            <Tabs defaultValue="all" className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-4">
                    <TabsList className="bg-transparent p-0 h-auto gap-4 flex-wrap justify-start">
                        {['all', 'pending', 'in_progress', 'resolved'].map((tab) => (
                            <TabsTrigger 
                                key={tab} 
                                value={tab}
                                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-500 text-slate-400 rounded-none px-2 pb-3 pt-2 transition-all hover:text-white uppercase tracking-wider text-xs font-bold"
                            >
                                {tab.replace('_', ' ')}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 pb-2">
                        <Filter className="h-3 w-3" /> Filtered by Latest
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {['all', 'pending', 'in_progress', 'resolved'].map(tab => (
                        <TabsContent key={tab} value={tab} className="mt-0">
                            <motion.div 
                                variants={container}
                                initial="hidden"
                                animate="show"
                                className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
                            >
                                {reports
                                    .filter(r => tab === 'all' ? true : r.status.toLowerCase() === tab)
                                    .map(report => (
                                    <motion.div key={report.id} variants={item}>
                                        <ReportCard 
                                            report={report} 
                                            onManage={() => { setSelectedReport(report); setNewStatus(report.status); setAdminNote(report.adminNote || ""); }}
                                            onView={() => router.push(`/admin/report/${report.reportId}`)}
                                        />
                                    </motion.div>
                                ))}
                                {reports.filter(r => tab === 'all' ? true : r.status.toLowerCase() === tab).length === 0 && (
                                    <div className="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        No reports found in this category.
                                    </div>
                                )}
                            </motion.div>
                        </TabsContent>
                    ))}
                </AnimatePresence>
            </Tabs>

            {/* --- MANAGE MODAL --- */}
            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Manage Report #{selectedReport?.reportId}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Status</label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger className="bg-slate-950 border-white/10 text-white h-12"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="PENDING">Pending Review</SelectItem>
                                    <SelectItem value="IN_PROGRESS">Processing / In Progress</SelectItem>
                                    <SelectItem value="RESOLVED">Resolved / Completed</SelectItem>
                                    <SelectItem value="REJECTED" className="text-red-400">Reject (Invalid/Fake)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Response</label>
                            {/* Canned suggestions */}

                            <Textarea 
                                value={adminNote} 
                                onChange={(e) => setAdminNote(e.target.value)} 
                                placeholder="Describe the action taken..." 
                                className="bg-slate-950 border-white/10 text-white min-h-30 resize-none p-4" 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateStatus} disabled={statusLoading} className="w-full bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white h-12 font-bold">
                            {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Updates"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, bg }) {
    return (
        <Card className="bg-slate-900/40 border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 flex items-center justify-between relative z-10">
                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
                    <div className="text-3xl font-bold text-white mt-1">{value}</div>
                </div>
                <div className={`h-10 w-10 rounded-full ${bg} ${color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    )
}

function ReportCard({ report, onManage, onView }) {
    // FIX: Image handling
    const displayImage = report.images?.length > 0 ? report.images[0].url : report.imageUrl;

    const statusConfig = {
        PENDING: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", label: "Pending" },
        IN_PROGRESS: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", label: "In Progress" },
        PENDING_VERIFICATION: { color: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/20", label: "Pending Verification" },
        RESOLVED: { color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20", label: "Resolved" },
        REJECTED: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", label: "Rejected" }
    }

    const config = statusConfig[report.status] || statusConfig.PENDING;

    return (
        <div className="group relative flex flex-col bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/10 h-full">
            <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                {displayImage ? (
                    <img 
                        src={displayImage} 
                        alt={report.title} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-white/5">
                        <ImageIcon className="h-10 w-10 text-slate-700" />
                    </div>
                )}
                <div className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${config.bg} ${config.color} ${config.border} flex items-center gap-1.5 shadow-lg`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text', 'bg')} animate-pulse`}></span>
                    {config.label}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">#{report.reportId}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(report.createdAt))} ago
                    </span>
                </div>

                <h3 className="text-base font-bold text-white leading-tight mb-2 line-clamp-1 group-hover:text-orange-400 transition-colors">
                    {report.title}
                </h3>
                
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 flex-1">
                    {report.description}
                </p>

                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5">
                    <Button onClick={onView} variant="ghost" size="sm" className="flex-1 text-slate-300 hover:text-white hover:bg-white/5 h-8 text-xs">
                        Details
                    </Button>
                    <Button onClick={onManage} size="sm" className="flex-1 bg-white/5 text-white hover:bg-orange-600 hover:text-white h-8 text-xs border border-white/10 transition-colors">
                        Manage <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    )
}