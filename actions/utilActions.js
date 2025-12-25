'use server'

import { db } from "@/lib/prisma"

// Used to populate the "City" dropdown in the Report Form
export async function getSupportedCities() {
    try {
        const cities = await db.city.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true } // We only need ID and Name
        })
        return { success: true, cities }
    } catch (error) {
        console.error("Failed to fetch cities:", error)
        return { success: false, cities: [] }
    }
}

// Used to populate "Department" dropdown based on selected City
export async function getDepartmentsByCity(cityId) {
    try {
        const depts = await db.department.findMany({
            where: { cityId: cityId },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        })
        return { success: true, depts }
    } catch (error) {
        return { success: false, depts: [] }
    }
}