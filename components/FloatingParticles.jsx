'use client'

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export default function FloatingParticles() {
    // Only render on client to avoid hydration mismatch
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    // Create 15 random particles
    const particles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // Random left %
        y: Math.random() * 100, // Random top %
        size: Math.random() * 4 + 2, // Random size 2-6px
        duration: Math.random() * 20 + 10, // Slow float 10-30s
    }))

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-orange-500/10 blur-[1px]"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                    }}
                    animate={{
                        y: [0, -100, 0], // Float up and down slightly
                        x: [0, Math.random() * 50 - 25, 0], // Drift sideways
                        opacity: [0, 0.8, 0], // Fade in/out
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    )
}