import { checkUser } from "@/lib/checkUser"
import { redirect } from "next/navigation"
import { getSupportedCities } from "@/actions/utilActions"
import ReportForm from "./_components/ReportForm"
import { ShieldAlert, CheckCircle2, MapPin, Camera, ArrowRight } from "lucide-react"
import FloatingParticles from "@/components/FloatingParticles"

export const metadata = {
    title: "Report an Issue | CivicConnect",
    description: "Submit a civic issue to your local administration anonymously."
}

export default async function ReportIssuePage() {
    const user = await checkUser()
    if (!user) redirect('/') 

    const cityData = await getSupportedCities()

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12 relative overflow-hidden selection:bg-orange-500/30">
             
             {/* --- BACKGROUND LAYER --- */}
             <div className="fixed inset-0 z-0 pointer-events-none">
                {/* 1. Deep Gradient Mesh */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
                
                {/* 2. Colorful Orbs */}
                <div className="absolute top-[10%] right-[5%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                
                {/* 3. The Grid Texture */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>

                {/* 4. The New Floating Particles */}
                <FloatingParticles />
            </div>

            <div className="container mx-auto px-6 md:px-12 relative z-10">
                <div className="grid lg:grid-cols-12 gap-16">
                    
                    {/* --- LEFT SIDEBAR (Info) --- */}
                    <div className="lg:col-span-5 lg:sticky lg:top-32 h-fit space-y-10">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-400 uppercase tracking-widest shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                                <ShieldAlert className="h-3 w-3" />
                                Secure & Anonymous
                            </div>
                            
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                                Make your city <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-500 to-orange-600">
                                    shine again.
                                </span>
                            </h1>
                            
                            <p className="text-slate-400 text-lg leading-relaxed border-l-2 border-white/10 pl-6">
                                Your voice matters. Report infrastructure issues directly to the administration. We track it until it's fixed.
                            </p>
                        </div>

                        {/* Visual Timeline Steps */}
                        <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-orange-500/50 before:to-transparent">
                            {[
                                { icon: MapPin, title: "Pin Location", desc: "Use GPS to lock the exact spot." },
                                { icon: CheckCircle2, title: "Select Authority", desc: "Route to the correct department." },
                                { icon: Camera, title: "Upload Evidence", desc: "A picture speaks a thousand words." },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-6 relative">
                                    <div className="relative z-10 h-10 w-10 rounded-full bg-slate-900 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <div className="pt-1">
                                        <h4 className="text-white font-bold text-lg">{item.title}</h4>
                                        <p className="text-sm text-slate-400 mt-1">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* --- RIGHT CONTENT (Form) --- */}
                    <div className="lg:col-span-7">
                        <ReportForm cities={cityData.cities} />
                    </div>

                </div>
            </div>
        </div>
    )
}