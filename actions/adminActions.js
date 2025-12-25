'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"

export async function updateAdminProfile(formData) {
    try {
        const user = await checkUser()
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return { success: false, error: "Unauthorized" }
        }

        const stateName = formData.get("stateName") 
        const cityName = formData.get("city")
        const deptName = formData.get("department") 
        const fullName = formData.get("name")
        
        // New Fields
        const designation = formData.get("designation")
        const employeeId = formData.get("employeeId")
        const phone = formData.get("phone")

        if (!stateName || !cityName || !deptName) {
            return { success: false, error: "Missing critical fields" }
        }

        // 1. Find or Create State
        const state = await db.state.upsert({
            where: { name: stateName },
            update: {},
            create: { name: stateName }
        })

        // 2. Find or Create City
        const city = await db.city.upsert({
            where: { 
                name_stateId: { name: cityName, stateId: state.id }
            },
            update: {},
            create: { name: cityName, stateId: state.id }
        })

        // 3. Find or Create Department
        const department = await db.department.upsert({
            where: {
                name_cityId: { name: deptName, cityId: city.id }
            },
            update: {},
            create: { name: deptName, cityId: city.id }
        })

        // 4. Update Admin's Profile
        await db.adminProfile.upsert({
            where: { userId: user.id },
            update: {
                departmentId: department.id,
                designation,
                employeeId,
                phone
            },
            create: {
                userId: user.id,
                departmentId: department.id,
                designation,
                employeeId,
                phone,
                isVerified: true
            }
        })

        // 5. Update User Name
        const [firstName, ...lastName] = fullName.split(" ")
        await db.user.update({
            where: { id: user.id },
            data: {
                firstName: firstName,
                lastName: lastName.join(" ") || ""
            }
        })

        revalidatePath('/admin')
        return { success: true }

    } catch (error) {
        console.error("Admin Profile Error:", error)
        return { success: false, error: error.message }
    }
}