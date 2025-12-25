/**
 * Normalizes area names to handle variations
 * Example: "Pandharpur Solapur 413304" and "Solapur Pandharpur Maharashtra" -> "Pandharpur"
 */
export function normalizeAreaName(areaName) {
    if (!areaName || typeof areaName !== 'string') return ''
    
    // Convert to lowercase and trim
    let normalized = areaName.toLowerCase().trim()
    
    // Remove common suffixes/prefixes and postal codes
    normalized = normalized
        .replace(/\d{5,6}/g, '') // Remove postal codes (5-6 digits)
        .replace(/\b(maharashtra|mh|india|in)\b/gi, '') // Remove state/country names
        .replace(/\b(district|dist|taluka|tal|village|vil|city|town)\b/gi, '') // Remove location types
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    
    // Extract the main city/area name (usually the first significant word)
    const words = normalized.split(' ').filter(w => w.length > 2)
    
    if (words.length === 0) return areaName // Return original if nothing left
    
    // If we have multiple words, try to find the most significant one
    // Usually the first word is the main area name
    const mainArea = words[0]
    
    // Capitalize first letter
    return mainArea.charAt(0).toUpperCase() + mainArea.slice(1)
}

/**
 * Finds or creates an area with normalized name matching
 */
export async function findOrCreateArea(db, cityId, areaName) {
    const normalized = normalizeAreaName(areaName)
    
    // First try exact match
    let area = await db.area.findFirst({
        where: {
            cityId,
            name: { equals: normalized, mode: 'insensitive' }
        }
    })
    
    if (area) return area
    
    // Try fuzzy match - check if any existing area's normalized name matches
    const allAreas = await db.area.findMany({
        where: { cityId }
    })
    
    for (const existingArea of allAreas) {
        if (normalizeAreaName(existingArea.name).toLowerCase() === normalized.toLowerCase()) {
            return existingArea
        }
    }
    
    // Create new area with normalized name
    area = await db.area.create({
        data: {
            name: normalized,
            cityId
        }
    })
    
    return area
}

