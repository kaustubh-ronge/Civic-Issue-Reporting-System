'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ShieldCheck, Menu, LayoutDashboard } from "lucide-react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import NotificationBell from "../NotificationBell"

export default function HeaderClient({ user }) {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    
    // 1. CRITICAL FIX: Hide this header on Admin pages to prevent double headers
    // The AdminLayout has its own dedicated header.
    if (pathname.startsWith('/admin')) {
        return null; 
    }

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const isActive = (path) => pathname === path

    // Standard Navigation
    const navItems = [
        { name: "Home", href: "/" },
        { name: "Report Issue", href: "/report-issue" },
        { name: "Live Status", href: "/status" },
    ];

    // Add Admin Console link if user is admin
    if (isAdmin) {
        navItems.push({ name: "Admin Console", href: "/admin" });
    }

    return (
        <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-0 z-50 w-full transition-all duration-300 ${
                scrolled 
                ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/10 py-3" 
                : "bg-transparent border-b border-transparent py-5"
            }`}
        >
            <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
                
                {/* --- Brand Logo --- */}
                <Link href="/" className="flex items-center gap-3 group">
                    <motion.div 
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-orange-600 to-amber-600 shadow-lg shadow-orange-900/20"
                    >
                        <ShieldCheck className="h-6 w-6 text-white" />
                        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20"></div>
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-tight text-white leading-none">
                            Civic<span className="text-orange-500">Connect</span>
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            Secure Reporting
                        </span>
                    </div>
                </Link>

                {/* --- Desktop Navigation --- */}
                <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/5 bg-white/5 p-1 backdrop-blur-md">
                    {navItems.map((link) => (
                        <Link 
                            key={link.href}
                            href={link.href} 
                            className="relative px-5 py-2 text-sm font-medium transition-colors"
                        >
                            {isActive(link.href) ? (
                                <span className="relative z-10 text-white">{link.name}</span>
                            ) : (
                                <span className="relative z-10 text-slate-300 hover:text-white">{link.name}</span>
                            )}
                            
                            {isActive(link.href) && (
                                <motion.div 
                                    layoutId="nav-pill"
                                    className="absolute inset-0 bg-orange-600 rounded-full shadow-md"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* --- Right Side Actions --- */}
                <div className="flex items-center gap-4">
                    
                    <SignedIn>
                        {/* Notification Bell */}
                        {user && <NotificationBell userId={user.id} />}
                        
                        <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                        {/* User Profile */}
                        <UserButton 
                            afterSignOutUrl="/"
                            appearance={{ elements: { avatarBox: "h-9 w-9 ring-2 ring-white/10" }}}
                        />
                    </SignedIn>

                    <SignedOut>
                        <SignInButton mode="modal">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button className="bg-white text-slate-950 hover:bg-slate-200 font-semibold">
                                    Sign In
                                </Button>
                            </motion.div>
                        </SignInButton>
                    </SignedOut>

                    {/* Mobile Menu Trigger */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-75 bg-slate-950 border-white/10 text-white p-6">
                                <SheetHeader className="mb-8 text-left">
                                    <SheetTitle className="flex items-center gap-2 text-white">
                                        <ShieldCheck className="h-6 w-6 text-orange-500" />
                                        <span className="font-bold">CivicConnect</span>
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-4">
                                    {navItems.map((link) => (
                                        <Link 
                                            key={link.href} 
                                            href={link.href}
                                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                                isActive(link.href) 
                                                ? "bg-orange-600 text-white" 
                                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                                            }`}
                                        >
                                            {link.name}
                                        </Link>
                                    ))}
                                    
                                    <SignedOut>
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <SignInButton mode="modal">
                                                <Button className="w-full bg-white text-slate-950 hover:bg-slate-200">
                                                    Sign In
                                                </Button>
                                            </SignInButton>
                                        </div>
                                    </SignedOut>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </motion.header>
    )
}