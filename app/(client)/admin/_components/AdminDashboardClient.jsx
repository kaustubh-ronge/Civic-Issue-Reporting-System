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
import { MapPin, Clock, Settings, ImageIcon } from "lucide-react"
import { updateReportStatus } from "@/actions/adminDashboardActions"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import AdminOnboarding from "./AdminOnboarding"

export default function AdminDashboardClient({ user, initialReports = [], adminProfile }) {
    const router = useRouter()
    const [reports, setReports] = useState(initialReports)
    const [selectedReport, setSelectedReport] = useState(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    
    const [statusLoading, setStatusLoading] = useState(false)
    const [newStatus, setNewStatus] = useState("")
    const [adminNote, setAdminNote] = useState("")

    const total = reports.length
    const pending = reports.filter(r => r.status === 'PENDING').length
    const resolved = reports.filter(r => r.status === 'RESOLVED').length

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

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Department Dashboard</h1>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                        <Badge variant="outline" className="text-orange-400 border-orange-400/20 bg-orange-400/10">
                            {adminProfile?.department?.name}
                        </Badge>
                        <span>• {adminProfile?.department?.city?.name}</span>
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 h-full">
                                <Settings className="h-5 w-5 mr-2" />
                                Edit Profile
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-slate-950 border-white/10 p-0 overflow-hidden">
                            <div className="max-h-[85vh] overflow-y-auto p-6">
                                <AdminOnboarding 
                                    user={user} 
                                    initialData={adminProfile} 
                                    onSuccess={() => {
                                        setIsProfileOpen(false)
                                        router.refresh()
                                    }} 
                                />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Card className="bg-slate-900 border-white/10 text-white min-w-[140px]">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{pending}</div>
                            <div className="text-xs text-orange-400 font-medium uppercase tracking-wider">Pending</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-white/10 text-white min-w-[140px]">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{resolved}</div>
                            <div className="text-xs text-green-400 font-medium uppercase tracking-wider">Resolved</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-slate-900 border border-white/10 p-1">
                    <TabsTrigger value="all" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">All Reports</TabsTrigger>
                    <TabsTrigger value="pending" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">Pending</TabsTrigger>
                    <TabsTrigger value="resolved" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">Resolved</TabsTrigger>
                </TabsList>

                {['all', 'pending', 'resolved'].map(tab => (
                    <TabsContent key={tab} value={tab}>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {reports
                                .filter(r => tab === 'all' ? true : r.status.toLowerCase() === tab)
                                .map(report => (
                                <ReportCard 
                                    key={report.id} 
                                    report={report} 
                                    onManage={() => { setSelectedReport(report); setNewStatus(report.status); setAdminNote(report.adminNote || ""); }}
                                    onView={() => router.push(`/admin/report/${report.reportId}`)}
                                />
                            ))}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* Manage Modal */}
            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Manage Report #{selectedReport?.reportId}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Update Status</label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger className="bg-slate-950 border-white/10 text-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                                    <SelectItem value="REJECTED" className="text-red-400">Rejected (Fake Report) ⚠️</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Official Note</label>
                            <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Action taken..." className="bg-slate-950 border-white/10 text-white min-h-[100px]" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateStatus} disabled={statusLoading} className="bg-orange-600 hover:bg-orange-500 text-white">Update Report</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function ReportCard({ report, onManage, onView }) {
    // 🔹 FIX: Determine the image source safely
    const displayImage = report.images?.length > 0 ? report.images[0].url : report.imageUrl;

    const statusColors = {
        PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        IN_PROGRESS: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        RESOLVED: "bg-green-500/10 text-green-500 border-green-500/20",
        REJECTED: "bg-red-500/10 text-red-500 border-red-500/20"
    }

    return (
        <Card className="bg-slate-900/50 backdrop-blur border-white/10 hover:border-orange-500/30 transition-all group overflow-hidden flex flex-col h-full">
            {displayImage ? (
                <div className="relative w-full h-48 overflow-hidden bg-slate-950">
                    <img 
                        src={displayImage} 
                        alt={report.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.style.display = 'none'; }} // Hide if link is broken
                    />
                    <div className="absolute top-2 right-2">
                        <Badge variant="outline" className={`${statusColors[report.status]} bg-black/50 backdrop-blur-md`}>
                            {report.status.replace("_", " ")}
                        </Badge>
                    </div>
                </div>
            ) : (
                <div className="h-4 bg-gradient-to-r from-orange-500/20 to-blue-500/20"></div>
            )}
            
            <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
                {!displayImage && (
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className={statusColors[report.status]}>
                            {report.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-slate-500">#{report.reportId}</span>
                    </div>
                )}
                
                <div className="flex-1">
                    <h3 className="text-white text-lg font-semibold line-clamp-1">{report.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">{report.description}</p>
                </div>
                
                <div className="flex justify-between items-center pt-2 gap-2 mt-auto border-t border-white/5">
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3"/> {formatDistanceToNow(new Date(report.createdAt))} ago
                    </span>
                    <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={onView} variant="ghost" className="text-slate-400 hover:text-white text-xs h-8">View</Button>
                        <Button size="sm" onClick={onManage} className="bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs h-8">Manage</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}