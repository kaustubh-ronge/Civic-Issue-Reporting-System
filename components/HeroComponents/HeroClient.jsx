'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, ShieldAlert, CheckCircle2, Globe2, ArrowRight, LayoutDashboard } from "lucide-react"
import { motion } from "framer-motion"

// --- ANIMATION VARIANTS ---
const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
}

const blobAnimation = {
    animate: {
        scale: [1, 1.1, 1],
        opacity: [0.3, 0.5, 0.3],
        transition: { duration: 8, repeat: Infinity, ease: "easeInOut" }
    }
}

export default function HeroClient({ user }) {
    // Check if user is an Admin
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    return (
        <div className="relative flex flex-col w-full text-white pt-20 overflow-x-hidden min-h-screen">
            
            {/* --- ANIMATED BACKGROUND --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <motion.div 
                    variants={blobAnimation}
                    animate="animate"
                    className="absolute -top-[10%] -left-[10%] w-200 h-200 bg-orange-600/20 rounded-full blur-[120px]"
                />
                <motion.div 
                    variants={blobAnimation}
                    animate="animate"
                    transition={{ delay: 4 }}
                    className="absolute top-[20%] -right-[10%] w-150 h-150 bg-blue-600/10 rounded-full blur-[100px]"
                />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.04]"></div>
            </div>

            {/* --- HERO SECTION --- */}
            <div className="relative z-10 container mx-auto px-6 md:px-12 min-h-[85vh] flex items-center">
                <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
                    
                    {/* LEFT COLUMN: Text Content */}
                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8 text-center lg:text-left"
                    >
                        <motion.div variants={fadeInUp} className="flex justify-center lg:justify-start">
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 backdrop-blur-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                {isAdmin ? "Official Department Portal" : "Live across the Nation"}
                            </div>
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
                            {isAdmin ? (
                                <>
                                    Manage City <br />
                                    <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-600">
                                        Operations.
                                    </span>
                                </>
                            ) : (
                                <>
                                    Fix Your City <br />
                                    <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-600">
                                        anonymously.
                                    </span>
                                </>
                            )}
                        </motion.h1>
                        
                        <motion.p variants={fadeInUp} className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            {isAdmin 
                                ? "Welcome back, Officer. Access your dashboard to view new reports, update statuses, and manage your department's resolution queue."
                                : "The modern way to report civic issues. No queues, no paperwork. Report potholes, water issues, and sanitation problems directly to the administration."
                            }
                        </motion.p>
                        
                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            {isAdmin ? (
                                /* ADMIN BUTTON */
                                <Link href="/admin">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button 
                                            size="lg" 
                                            className="h-14 px-8 text-lg bg-orange-600 hover:bg-orange-500 shadow-[0_0_30px_-10px_rgba(234,88,12,0.6)]"
                                        >
                                            <LayoutDashboard className="mr-2 h-5 w-5" />
                                            Go to Admin Console
                                        </Button>
                                    </motion.div>
                                </Link>
                            ) : (
                                /* CITIZEN BUTTON */
                                <Link href="/report-issue">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button 
                                            size="lg" 
                                            className="h-14 px-8 text-lg bg-orange-600 hover:bg-orange-500 shadow-[0_0_30px_-10px_rgba(234,88,12,0.6)]"
                                        >
                                            <ShieldAlert className="mr-2 h-5 w-5" />
                                            Report Issue
                                        </Button>
                                    </motion.div>
                                </Link>
                            )}

                            {/* Secondary Button stays the same */}
                            <Link href="#how-it-works">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button 
                                        variant="outline"
                                        size="lg" 
                                        className="h-14 px-8 text-lg border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                                    >
                                        How it Works
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </motion.div>
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* RIGHT COLUMN (Same Visuals) */}
                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="hidden lg:block relative"
                    >
                        <div className="absolute inset-0 bg-linear-to-tr from-orange-500/20 to-blue-500/20 rounded-full blur-3xl transform rotate-12"></div>
                        <motion.div whileHover={{ y: -5 }}>
                            <Card className="relative bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-2xl max-w-md mx-auto text-white">
                                <CardHeader className="border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
                                            <MapPin className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold text-white">Station Road, Ward 3</CardTitle>
                                            <CardDescription className="text-xs text-slate-400">Reported 2 mins ago</CardDescription>
                                        </div>
                                        <span className="ml-auto text-xs font-bold bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">Pending</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="h-32 w-full bg-slate-800/50 rounded-lg animate-pulse border border-white/5"></div>
                                    <div className="h-4 w-3/4 bg-slate-800/50 rounded animate-pulse delay-75"></div>
                                    <div className="h-4 w-1/2 bg-slate-800/50 rounded animate-pulse delay-150"></div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
            
            {/* Sections 2 and 3 remain the same... */}
            {/* (Keep the Stats and How It Works sections from previous code here) */}
             {/* --- SECTION 2: STATS STRIP --- */}
            <div className="relative z-10 w-full border-y border-white/5 bg-slate-900/30 backdrop-blur-sm py-12">
                <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { label: "Active Reports", value: "1,240+" },
                        { label: "Resolved Issues", value: "850+" },
                        { label: "Avg. Response", value: "48 Hrs" },
                        { label: "Active Zones", value: "34" },
                    ].map((stat, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="space-y-1"
                        >
                            <h3 className="text-3xl md:text-4xl font-bold text-white">{stat.value}</h3>
                            <p className="text-sm text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* --- SECTION 3: HOW IT WORKS --- */}
            <div id="how-it-works" className="relative z-10 w-full py-24 bg-slate-950/50">
                <div className="container mx-auto px-6">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16 space-y-4"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold">
                            Solving problems in <span className="text-orange-500">3 simple steps</span>
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            We've removed the bureaucracy. You don't need to visit the municipal office. 
                            Just point, shoot, and report.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <MapPin className="h-8 w-8 text-blue-400" />,
                                title: "1. Pin Location",
                                desc: "Select the area and specific ward where the issue is located."
                            },
                            {
                                icon: <Globe2 className="h-8 w-8 text-orange-400" />,
                                title: "2. Choose Department",
                                desc: "Water, Roads, or Sanitation? Route your report to the exact official."
                            },
                            {
                                icon: <CheckCircle2 className="h-8 w-8 text-green-400" />,
                                title: "3. Track & Resolve",
                                desc: "Get a unique ID. Watch the status change from 'Pending' to 'Resolved'."
                            }
                        ].map((step, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                whileHover={{ y: -10 }}
                            >
                                <Card className="h-full bg-slate-900 border-white/5 hover:border-orange-500/30 transition-all hover:bg-slate-800/50 group shadow-lg text-white">
                                    <CardHeader>
                                        <div className="mb-4 bg-slate-950 w-16 h-16 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shadow-inner">
                                            {step.icon}
                                        </div>
                                        <CardTitle className="text-xl font-bold">{step.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}