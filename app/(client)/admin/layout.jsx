import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { ShieldCheck, LayoutDashboard, LogOut } from "lucide-react"
import FloatingParticles from "@/components/FloatingParticles"

export default async function AdminLayout({ children }) {
    const user = await checkUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
        redirect('/')
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden selection:bg-orange-500/30">
            
            {/* --- PREMIUM BACKGROUND --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] opacity-50"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
                <FloatingParticles />
            </div>

            {/* --- GLASS HEADER --- */}
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-600 to-amber-600 shadow-lg shadow-orange-900/20">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg tracking-tight leading-none block">Civic<span className="text-orange-500">Console</span></span>
                            <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Official Access</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
                            <Link href="/admin" className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-white text-xs font-medium shadow-sm transition-all">
                                <LayoutDashboard className="h-3 w-3" /> Dashboard
                            </Link>
                            <Link href="/" className="flex items-center gap-2 px-4 py-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-all">
                                <LogOut className="h-3 w-3" /> Live Site
                            </Link>
                        </nav>
                        
                        <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                        
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden sm:block leading-tight">
                                <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
                                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wide">{user.role.replace('_', ' ')}</p>
                            </div>
                            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9 ring-2 ring-white/10" }}}/>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 container mx-auto p-6 md:p-8 relative z-10">
                {children}
            </main>
        </div>
    )
}