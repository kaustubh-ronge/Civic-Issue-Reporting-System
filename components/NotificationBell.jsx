'use client'

import { useState, useEffect } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getRecentNotifications, markAsRead } from "@/actions/notificationActions"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

export default function NotificationBell({ userId }) {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    // Fetch data function
    const fetchNotifications = async () => {
        const res = await getRecentNotifications()
        if (res.success) {
            setNotifications(res.notifications)
            setUnreadCount(res.unreadCount)
        }
    }

    // 1. Initial Fetch
    useEffect(() => {
        if (userId) {
            fetchNotifications()
            // 2. "Real-time" Polling: Check every 30 seconds
            const interval = setInterval(fetchNotifications, 30000)
            return () => clearInterval(interval)
        }
    }, [userId])

    // Handle marking as read immediately in UI
    const handleRead = async (id, link) => {
        // Optimistic update
        setUnreadCount(prev => Math.max(0, prev - 1))
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        
        // Server update
        await markAsRead(id)
        
        // Close popover if clicking a link
        if (link) setIsOpen(false)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-300 hover:text-white hover:bg-white/10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse border border-slate-950" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 bg-slate-950 border-white/10 text-white shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No notifications yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((n) => (
                                <div 
                                    key={n.id} 
                                    className={`p-4 hover:bg-white/5 transition-colors relative group ${!n.isRead ? 'bg-orange-500/5' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.isRead ? 'bg-slate-700' : 'bg-orange-500'}`} />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">{n.title}</p>
                                            <p className="text-xs text-slate-400 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-slate-500 pt-1">
                                                {formatDistanceToNow(new Date(n.createdAt))} ago
                                            </p>
                                            
                                            <div className="flex items-center gap-3 mt-2">
                                                {n.reportId && (
                                                    <Link 
                                                        href={`/status?track=${n.reportId}`} 
                                                        onClick={() => handleRead(n.id, true)}
                                                        className="text-xs text-orange-400 hover:underline"
                                                    >
                                                        View Report
                                                    </Link>
                                                )}
                                                {!n.isRead && (
                                                    <button 
                                                        onClick={() => handleRead(n.id)}
                                                        className="text-xs text-slate-500 hover:text-white flex items-center gap-1"
                                                    >
                                                        <Check className="h-3 w-3" /> Mark read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-white/10 bg-slate-900/50">
                    <Link href="/notifications" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-white h-8">
                            See All Notifications
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}