import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import { getAllNotifications, markAllAsRead } from "@/actions/notificationActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, CheckCircle2, AlertCircle, Info, Clock, Check, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import FloatingParticles from "@/components/FloatingParticles"

export const metadata = {
    title: "Notifications | CivicConnect"
}

export default async function NotificationsPage() {
    const user = await checkUser()
    if (!user) redirect('/')

    // Fetch all notifications from DB
    const { notifications } = await getAllNotifications()

    // Helper to get icon based on notification type/content
    const getIcon = (type, title) => {
        if (title.includes("Resolved")) return <CheckCircle2 className="h-5 w-5 text-green-500" />
        if (title.includes("Rejected")) return <AlertCircle className="h-5 w-5 text-red-500" />
        if (title.includes("Status")) return <Info className="h-5 w-5 text-blue-500" />
        return <Bell className="h-5 w-5 text-orange-500" />
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-28 pb-12 relative overflow-hidden">
            
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
                <FloatingParticles />
            </div>

            <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-3xl">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
                        <p className="text-slate-400">Stay updated on your reports and civic activity.</p>
                    </div>
                    
                    {notifications?.length > 0 && (
                        <form action={markAllAsRead}>
                            <Button type="submit" variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 w-full md:w-auto">
                                <Check className="h-4 w-4 mr-2" /> Mark All Read
                            </Button>
                        </form>
                    )}
                </div>

                {/* Notifications List */}
                <div className="space-y-4">
                    {notifications?.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <Bell className="h-8 w-8 text-slate-600" />
                            </div>
                            <h3 className="text-white font-medium text-lg">All caught up!</h3>
                            <p className="text-slate-500 mt-1">You have no new notifications.</p>
                            <Link href="/report-issue">
                                <Button variant="link" className="text-orange-400 mt-2">Submit a new report</Button>
                            </Link>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div 
                                key={n.id} 
                                className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                                    n.isRead 
                                    ? 'bg-slate-900/40 border-white/5 hover:border-white/10' 
                                    : 'bg-slate-900/80 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                }`}
                            >
                                {/* Unread Indicator Strip */}
                                {!n.isRead && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                                )}

                                <div className="p-5 sm:p-6 flex gap-5">
                                    {/* Icon Box */}
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border ${
                                        n.isRead 
                                        ? 'bg-slate-800 border-white/5' 
                                        : 'bg-slate-900 border-orange-500/20 shadow-inner'
                                    }`}>
                                        {getIcon(n.type, n.title)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1">
                                            <h4 className={`text-base font-semibold ${n.isRead ? 'text-slate-300' : 'text-white'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(n.createdAt))} ago
                                            </span>
                                        </div>
                                        
                                        <p className="text-slate-400 text-sm mb-4 leading-relaxed max-w-2xl">
                                            {n.message}
                                        </p>
                                        
                                        {n.reportId && (
                                            <Link href={`/status?track=${n.reportId}`}>
                                                <Button size="sm" variant="secondary" className="bg-white/5 hover:bg-white/10 text-white h-8 text-xs border border-white/10 group-hover:border-orange-500/30 transition-colors">
                                                    View Report Details
                                                    <ArrowRight className="h-3 w-3 ml-2 opacity-50 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}