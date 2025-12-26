import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import AdminHeader from "./_components/AdminHeader"
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
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
                <div className="absolute top-[-20%] right-[-10%] w-200 h-200 bg-orange-600/10 rounded-full blur-[120px] opacity-50"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-150 h-150 bg-blue-600/10 rounded-full blur-[120px] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
                <FloatingParticles />
            </div>

            {/* --- RESPONSIVE HEADER --- */}
            <AdminHeader user={user} />

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 container mx-auto p-4 md:p-8 relative z-10">
                {children}
            </main>
        </div>
    )
}