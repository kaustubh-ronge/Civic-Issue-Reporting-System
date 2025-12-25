import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { ShieldCheck, LayoutDashboard, Settings, LogOut } from "lucide-react"

export default async function AdminLayout({ children }) {
    const user = await checkUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
        redirect('/')
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Dedicated Admin Header */}
            <header className="sticky top-0 z-50 w-full bg-slate-900 border-b border-white/10 h-16 flex items-center px-6 justify-between shadow-lg">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-orange-500" />
                    <span className="font-bold text-lg tracking-tight">Civic<span className="text-orange-500">Console</span></span>
                    <span className="ml-2 text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20 uppercase tracking-widest font-semibold">Official</span>
                </div>

                <div className="flex items-center gap-6">
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                        <Link href="/admin" className="hover:text-white transition-colors flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                        <Link href="/" className="hover:text-white transition-colors flex items-center gap-2">
                            <LogOut className="h-4 w-4" /> Exit to Website
                        </Link>
                    </nav>
                    <div className="h-6 w-px bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
                        </div>
                        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9 ring-2 ring-white/10" }}}/>
                    </div>
                </div>
            </header>

            {/* Admin Content */}
            <main className="flex-1 p-6 md:p-8 relative">
                {children}
            </main>
        </div>
    )
}