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
import { Loader2, MapPin, Building2, UserCircle, Phone, Briefcase, BadgeAlert } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

export default function AdminOnboarding({ user, initialData, onSuccess }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [detecting, setDetecting] = useState(false)
    
    // Data States
    const [states, setStates] = useState([])
    const [cities, setCities] = useState([])
    
    // Selection States (Initialize with data if editing)
    const [selectedStateCode, setSelectedStateCode] = useState("")
    const [selectedCity, setSelectedCity] = useState(initialData?.department?.city?.name || "")

    // 1. Load States & Pre-fill Logic
    useEffect(() => {
        const indiaStates = State.getStatesOfCountry('IN');
        setStates(indiaStates);

        // If editing, find the ISO code for the stored State Name
        if (initialData?.department?.city?.state?.name) {
            const savedStateName = initialData.department.city.state.name;
            const foundState = indiaStates.find(s => s.name === savedStateName);
            if (foundState) {
                setSelectedStateCode(foundState.isoCode);
            }
        }
    }, [initialData]);

    // 2. Load Cities when State Changes
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
            toast.success(initialData ? "Profile Updated Successfully!" : "Setup Complete!")
            
            if (onSuccess) {
                onSuccess() // Close modal if used in modal
            }
            // Always refresh to get latest data
            router.refresh()
        } else {
            toast.error(result.error)
        }
        setLoading(false)
    }

    const DarkInputClasses = "bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500 transition-all"

    return (
        <div className="w-full relative">
            {/* Loading Overlay - Fixed positioning for dialog compatibility */}
            {loading && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto" />
                        <p className="text-white font-semibold text-lg">
                            {initialData ? "Updating Profile..." : "Setting Up Profile..."}
                        </p>
                        <p className="text-sm text-slate-400">Please wait...</p>
                    </div>
                </div>
            )}
            
            <Card className="bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative">
                {!initialData && (
                    <CardHeader className="text-center pb-8 border-b border-white/5">
                        <div className="mx-auto w-12 h-12 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mb-4 ring-1 ring-orange-500/20">
                            <UserCircle className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">Official Profile Setup</CardTitle>
                        <CardDescription className="text-slate-400">
                            This information will be used to verify your authority.
                        </CardDescription>
                    </CardHeader>
                )}
                
                <CardContent className="pt-6">
                    <form action={handleSubmit} className="space-y-6">
                        
                        {/* PERSONAL DETAILS */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Personal Details
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Full Name</Label>
                                    <Input name="name" defaultValue={`${user.firstName || ''} ${user.lastName || ''}`} required disabled={loading} className={DarkInputClasses} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Official Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input name="phone" defaultValue={initialData?.phone} placeholder="+91 98765 43210" required disabled={loading} className={`${DarkInputClasses} pl-9`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/5 my-2"></div>

                        {/* DEPARTMENT DETAILS */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Department Allocation
                                </h3>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="default"
                                    onClick={handleDetectLocation} 
                                    disabled={detecting || loading}
                                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/20 font-semibold h-10 px-4"
                                >
                                    {detecting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                                            Detecting...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-4 w-4 mr-2"/>
                                            Auto-Fill Location
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">State</Label>
                                    <Select name="state" value={selectedStateCode} onValueChange={setSelectedStateCode} required disabled={loading}>
                                        <SelectTrigger className={DarkInputClasses}><SelectValue placeholder="Select State" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[200px]">
                                            {states.map(s => <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">City / Corp</Label>
                                    <Select name="city" value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedStateCode || loading} required>
                                        <SelectTrigger className={DarkInputClasses}><SelectValue placeholder="Select City" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[200px]">
                                            {cities.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Department Name</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input name="department" defaultValue={initialData?.department?.name} placeholder="e.g. Water Supply" required disabled={loading} className={`${DarkInputClasses} pl-9`} />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Designation / Role</Label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input name="designation" defaultValue={initialData?.designation} placeholder="e.g. Senior Inspector" required disabled={loading} className={`${DarkInputClasses} pl-9`} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Employee ID</Label>
                                    <div className="relative">
                                        <BadgeAlert className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input name="employeeId" defaultValue={initialData?.employeeId} placeholder="e.g. PMC-8821" required disabled={loading} className={`${DarkInputClasses} pl-9`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold h-12 shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {initialData ? "Updating Profile..." : "Setting Up Profile..."}
                                </>
                            ) : (
                                initialData ? "Update Profile" : "Complete Registration"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}