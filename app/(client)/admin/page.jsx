import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import { db } from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { getAdminReports } from "@/actions/adminDashboardActions"
import AdminOnboarding from "./_components/AdminOnboarding"
import AdminDashboardClient from "./_components/AdminDashboardClient"

export default async function AdminPage() {
    const user = await checkUser()
    if (!user) return redirect('/')
    
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return <div className="p-10 text-white">Access Denied</div>
    }

    // Fetch Full Nested Profile for Editing
    const adminProfile = await db.adminProfile.findUnique({
        where: { userId: user.id },
        include: { 
            department: {
                include: {
                    city: {
                        include: {
                            state: true
                        }
                    }
                }
            } 
        }
    })

    if (!adminProfile) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <AdminOnboarding user={user} />
            </div>
        )
    }

    const { reports } = await getAdminReports()



    // Server action: run auto-close (manual trigger for admins)
    async function runAutoCloseAction(formData) {
        'use server'
        const userCheck = await checkUser()
        if (!userCheck || (userCheck.role !== 'ADMIN' && userCheck.role !== 'SUPER_ADMIN')) throw new Error('Unauthorized')
        const { autoCloseExpiredVerifications } = await import('@/actions/reportActions')
        const res = await autoCloseExpiredVerifications()
        // Revalidate admin dashboard
        revalidatePath('/admin')
        return res
    }

    return <AdminDashboardClient user={user} initialReports={reports || []} adminProfile={adminProfile} runAutoCloseAction={runAutoCloseAction} />
}