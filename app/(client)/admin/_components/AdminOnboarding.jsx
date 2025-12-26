'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateAdminProfile } from "@/actions/adminActions"
import { useRouter } from "next/navigation"
import { State, City } from 'country-state-city';
import { Loader2, MapPin, Building2, UserCircle, Phone, Briefcase, BadgeAlert, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export default function AdminOnboarding({ user, initialData, onSuccess }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [detecting, setDetecting] = useState(false)
    
    // Data States
    const [states, setStates] = useState([])
    const [cities, setCities] = useState([])
    
    // Selection States
    const [selectedStateCode, setSelectedStateCode] = useState("")
    const [selectedCity, setSelectedCity] = useState(initialData?.department?.city?.name || "")

    useEffect(() => {
        const indiaStates = State.getStatesOfCountry('IN');
        setStates(indiaStates);
        if (initialData?.department?.city?.state?.name) {
            const savedStateName = initialData.department.city.state.name;
            const foundState = indiaStates.find(s => s.name === savedStateName);
            if (foundState) setSelectedStateCode(foundState.isoCode);
        }
    }, [initialData]);

    useEffect(() => {
        if (selectedStateCode) {
            const stateCities = City.getCitiesOfState('IN', selectedStateCode);
            setCities(stateCities);
        } else {
            setCities([]);
        }
    }, [selectedStateCode]);

    const handleDetectLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported");
        setDetecting(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                
                const detectedState = data.address.state;
                const detectedCity = data.address.city || data.address.town;

                const matchedState = states.find(s => s.name.toLowerCase().includes(detectedState.toLowerCase()) || detectedState.toLowerCase().includes(s.name.toLowerCase()));

                if (matchedState) {
                    setSelectedStateCode(matchedState.isoCode);
                    setTimeout(() => {
                         const newCities = City.getCitiesOfState('IN', matchedState.isoCode);
                         setCities(newCities);
                         const matchedCity = newCities.find(c => c.name.toLowerCase() === detectedCity.toLowerCase());
                         if (matchedCity) setSelectedCity(matchedCity.name);
                    }, 100);
                    toast.success("Location Detected!");
                }
            } catch (error) {
                toast.error("Could not detect location automatically.");
            } finally {
                setDetecting(false);
            }
        });
    };

    async function handleSubmit(formData) {
        setLoading(true)
        const stateObj = states.find(s => s.isoCode === selectedStateCode);
        formData.append("stateName", stateObj?.name);
        
        const result = await updateAdminProfile(formData)
        
        if (result.success) {
            toast.success(initialData ? "Profile Updated!" : "Welcome Aboard!")
            if (onSuccess) onSuccess()
            router.refresh()
        } else {
            toast.error(result.error)
        }
        setLoading(false)
    }

    const inputClasses = "bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all h-11"

    return (
        <div className="w-full relative">
            {loading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-3" />
                    <p className="text-white font-medium">Saving Changes...</p>
                </div>
            )}
            
            <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-2xl relative overflow-hidden">
                {!initialData && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-500 via-amber-500 to-orange-600"></div>
                )}

                <CardHeader className="text-center pb-8 border-b border-white/5">
                    {!initialData && (
                        <div className="mx-auto w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-orange-500/20 shadow-lg shadow-orange-500/10">
                            <UserCircle className="h-7 w-7" />
                        </div>
                    )}
                    <CardTitle className="text-2xl font-bold text-white">
                        {initialData ? "Edit Profile" : "Official Setup"}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        {initialData ? "Update your official details below." : "Verify your authority to access the admin console."}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-8">
                    <form action={handleSubmit} className="space-y-8">
                        
                        {/* PERSONAL SECTION */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Personal Info
                            </h3>
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Full Name</Label>
                                    <Input name="name" defaultValue={`${user.firstName || ''} ${user.lastName || ''}`} required className={inputClasses} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Official Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input name="phone" defaultValue={initialData?.phone} placeholder="+91 98765 43210" required className={`${inputClasses} pl-10`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent"></div>

                        {/* DEPARTMENT SECTION */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Department Allocation
                                </h3>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleDetectLocation} 
                                    disabled={detecting || loading}
                                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 h-8 text-xs"
                                >
                                    {detecting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5"/> : <MapPin className="h-3 w-3 mr-1.5"/>}
                                    {detecting ? "Locating..." : "Auto-Detect Location"}
                                </Button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">State</Label>
                                    <Select name="state" value={selectedStateCode} onValueChange={setSelectedStateCode} required disabled={loading}>
                                        <SelectTrigger className={inputClasses}><SelectValue placeholder="Select State" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white max-h-50">
                                            {states.map(s => <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">City / Corp</Label>
                                    <Select name="city" value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedStateCode || loading} required>
                                        <SelectTrigger className={inputClasses}><SelectValue placeholder="Select City" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white max-h-50">
                                            {cities.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300 text-xs uppercase font-bold">Department Name</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input name="department" defaultValue={initialData?.department?.name} placeholder="e.g. Water Supply Department" required className={`${inputClasses} pl-10`} />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Designation</Label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input name="designation" defaultValue={initialData?.designation} placeholder="e.g. Senior Inspector" required className={`${inputClasses} pl-10`} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Employee ID</Label>
                                    <div className="relative">
                                        <BadgeAlert className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                        <Input name="employeeId" defaultValue={initialData?.employeeId} placeholder="e.g. EMP-8821" required className={`${inputClasses} pl-10`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold h-12 rounded-lg shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.01]" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (initialData ? "Save Changes" : "Complete Registration")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}