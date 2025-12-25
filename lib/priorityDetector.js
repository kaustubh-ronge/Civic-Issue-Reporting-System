/**
 * Auto-detect report priority based on keywords in title and description
 */
export function detectPriority(title, description) {
    const text = `${title} ${description}`.toLowerCase()
    
    // Critical keywords
    const criticalKeywords = [
        'emergency', 'urgent', 'dangerous', 'hazard', 'life threatening',
        'gas leak', 'fire', 'collapse', 'accident', 'injury', 'death',
        'critical', 'immediate', 'asap', 'now'
    ]
    
    // High priority keywords
    const highKeywords = [
        'broken', 'damaged', 'blocked', 'overflow', 'flooding',
        'no water', 'no electricity', 'power cut', 'outage',
        'important', 'serious', 'severe'
    ]
    
    // Low priority keywords
    const lowKeywords = [
        'minor', 'small', 'slight', 'cosmetic', 'aesthetic',
        'suggestion', 'improvement', 'enhancement'
    ]
    
    // Check for critical
    if (criticalKeywords.some(keyword => text.includes(keyword))) {
        return 'CRITICAL'
    }
    
    // Check for high
    if (highKeywords.some(keyword => text.includes(keyword))) {
        return 'HIGH'
    }
    
    // Check for low
    if (lowKeywords.some(keyword => text.includes(keyword))) {
        return 'LOW'
    }
    
    // Default to medium
    return 'MEDIUM'
}

