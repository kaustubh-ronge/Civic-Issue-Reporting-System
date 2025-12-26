'use client'

import { useState } from "react"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { ShieldCheck, LayoutDashboard, LogOut, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function AdminHeader({ user }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-orange-600 to-amber-600 shadow-lg shadow-orange-900/20">
                        <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-lg tracking-tight leading-none block text-white">
                            Civic<span className="text-orange-500">Console</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                            Official Access
                        </span>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
                        <Link href="/admin" className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-white text-xs font-medium shadow-sm border border-white/10 transition-all hover:bg-slate-700">
                            <LayoutDashboard className="h-3 w-3" /> Dashboard
                        </Link>
                        <Link href="/" className="flex items-center gap-2 px-4 py-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-all">
                            <LogOut className="h-3 w-3" /> Live Site
                        </Link>
                    </nav>
                    
                    <div className="h-8 w-px bg-white/10"></div>
                    
                    <div className="flex items-center gap-3 pl-2">
                        <div className="text-right leading-tight">
                            <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
                            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wide">{user.role.replace('_', ' ')}</p>
                        </div>
                        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9 ring-2 ring-white/10" }}}/>
                    </div>
                </div>

                {/* Mobile Menu Trigger */}
                <div className="md:hidden flex items-center gap-4">
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-8 w-8 ring-2 ring-white/10" }}}/>
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-300">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-slate-950 border-white/10 text-white pt-10">
                            <SheetHeader className="text-left mb-6">
                                <SheetTitle className="text-white flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-orange-500" /> Admin Menu
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-3">
                                <Link href="/admin" onClick={() => setIsOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
                                        <LayoutDashboard className="h-4 w-4 mr-3 text-orange-500" /> Dashboard
                                    </Button>
                                </Link>
                                <Link href="/" onClick={() => setIsOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/10">
                                        <LogOut className="h-4 w-4 mr-3" /> Exit to Live Site
                                    </Button>
                                </Link>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}