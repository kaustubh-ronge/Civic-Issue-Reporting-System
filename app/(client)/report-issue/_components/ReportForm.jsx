'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, MapPin, UploadCloud, ShieldAlert, CheckCircle2, X, AlertCircle, AlertTriangle, Info, Zap, Droplets, Trash2, Bus, Construction, PenTool, Copy, ExternalLink, ImageIcon, Video } from "lucide-react"
import { getDepartmentsByCity } from "@/actions/utilActions"
import { createReport } from "@/actions/reportActions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import LocationSearch from "@/components/LocationSearch"

// --- STYLING CONSTANTS ---
const CardStyle = "bg-slate-900/40 border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]"
const LabelStyle = "text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 block"
const InputStyle = "bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all h-12 rounded-lg"

const PREDEFINED_CATEGORIES = [
    { id: "Roads", name: "Roads & Potholes", icon: <Construction className="w-4 h-4 text-orange-400"/> },
    { id: "Water", name: "Water Supply", icon: <Droplets className="w-4 h-4 text-blue-400"/> },
    { id: "Electricity", name: "Electricity / Lights", icon: <Zap className="w-4 h-4 text-yellow-400"/> },
    { id: "Garbage", name: "Garbage & Sanitation", icon: <Trash2 className="w-4 h-4 text-green-400"/> },
    { id: "Transport", name: "Public Transport", icon: <Bus className="w-4 h-4 text-red-400"/> },
    { id: "Other", name: "Other (Specify)", icon: <PenTool className="w-4 h-4 text-slate-400"/> },
]

const priorityOptions = [
    { value: 'LOW', label: 'Low - Informational', icon: Info, color: 'text-blue-400' },
    { value: 'MEDIUM', label: 'Medium - Needs Attention', icon: AlertCircle, color: 'text-yellow-400' },
    { value: 'HIGH', label: 'High - Urgent', icon: AlertTriangle, color: 'text-orange-400' },
    { value: 'CRITICAL', label: 'Critical - Hazardous', icon: ShieldAlert, color: 'text-red-400' }
]

export default function ReportForm({ cities }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [submittedReportId, setSubmittedReportId] = useState("")

    // Form State
    const [selectedCity, setSelectedCity] = useState("")
    const [departments, setDepartments] = useState([])
    const [selectedDept, setSelectedDept] = useState("")
    const [locationData, setLocationData] = useState(null)
    const [imageFiles, setImageFiles] = useState([])
    const [videoFiles, setVideoFiles] = useState([])
    const [selectedCityName, setSelectedCityName] = useState("")
    
    // Category & Tag State
    const [selectedCategory, setSelectedCategory] = useState("")
    const [customCategoryInput, setCustomCategoryInput] = useState("")
    const [selectedPriority, setSelectedPriority] = useState("")
    const [tags, setTags] = useState([])
    const [tagInput, setTagInput] = useState("")

    // ... (Handlers remain the same as previous code) ...
    const handleCityChange = async (cityId) => {
        setSelectedCity(cityId)
        setSelectedDept("") 
        const city = cities.find(c => c.id === cityId)
        setSelectedCityName(city?.name || "")
        const res = await getDepartmentsByCity(cityId)
        if (res.success) setDepartments(res.depts)
    }

    const handleImageChange = (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setImageFiles(prev => [...prev, ...files].slice(0, 5))
        }
    }

    const removeImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleVideoChange = (e) => {
        if (e.target.files) {
            let files = Array.from(e.target.files)

            // enforce same limit as server action (25 MB)
            const MAX_BYTES = 25 * 1024 * 1024
            const filtered = []
            const skipped = []

            files.forEach(file => {
                if (file.size > MAX_BYTES) {
                    skipped.push(file.name || file.type || "(unknown)")
                } else {
                    filtered.push(file)
                }
            })

            if (skipped.length) {
                toast.error(`Skipped ${skipped.length} video(s) over 25MB`)
            }

            // dedupe against existing selections by name+size
            setVideoFiles(prev => {
                const seen = new Set(prev.map(f => `${f.name}|${f.size}`))
                const unique = filtered.filter(f => {
                    const key = `${f.name}|${f.size}`
                    if (seen.has(key)) return false
                    seen.add(key)
                    return true
                })
                return [...prev, ...unique].slice(0, 2)
            })
        }
    }

    const removeVideo = (index) => {
        setVideoFiles(prev => prev.filter((_, i) => i !== index))
    }

    const addTag = () => {
        if (tagInput.trim() && tags.length < 5) {
            setTags(prev => [...prev, tagInput.trim()])
            setTagInput("")
        }
    }

    const removeTag = (index) => {
        setTags(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.target)
        formData.append("cityId", selectedCity)
        formData.append("departmentId", selectedDept)
        formData.append("lat", locationData?.lat || 0)
        formData.append("lng", locationData?.lon || 0)
        formData.append("address", locationData?.address || "")
        
        formData.append("category", selectedCategory)
        if (selectedCategory === "Other") formData.append("customCategory", customCategoryInput)
        if (selectedPriority) formData.append("priority", selectedPriority)
        
        tags.forEach(tag => formData.append("tags", tag))
        imageFiles.forEach((file) => formData.append("images", file))
        videoFiles.forEach((file) => formData.append("videos", file))

        // if user somehow attempted to upload more than allowed, give a warning
        if (videoFiles.length > 2) {
            toast.error("You can only upload up to 2 videos. Extra files were ignored.")
        }

        const res = await createReport(formData)

        if (res.success) {
            setSubmittedReportId(res.reportId)
            setShowSuccessModal(true)
            e.target.reset()
            setImageFiles([])
            setVideoFiles([])
            setTags([])
            setLocationData(null)

            if (res.warning) {
                toast.warn(res.warning)
            }
        } else {
            toast.error(res.error)
        }
        setLoading(false)
    }

    const isStep1Complete = selectedCity && selectedDept;
    const isStep2Complete = !!locationData;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            
            {/* --- STEP 1: AUTHORITY --- */}
            <div className="relative z-30">
                <Card className={CardStyle}>
                    <CardHeader className="pb-4 border-b border-white/5">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors duration-500 ${isStep1Complete ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white'}`}>
                                1
                            </div>
                            Select Authority
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className={LabelStyle}>City / Corporation <span className="text-red-500">*</span></Label>
                            <Select onValueChange={handleCityChange} required>
                                <SelectTrigger className={InputStyle}>
                                    <SelectValue placeholder="Select City" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    {cities.length === 0 ? <SelectItem value="none" disabled>No cities found</SelectItem> : 
                                     cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className={LabelStyle}>Department <span className="text-red-500">*</span></Label>
                            <Select onValueChange={setSelectedDept} disabled={!selectedCity} value={selectedDept} required>
                                <SelectTrigger className={InputStyle}>
                                    <SelectValue placeholder={!selectedCity ? "Select City first" : "Select Department"} />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- STEP 2: LOCATION --- */}
            <div className="relative z-20">
                <Card className={CardStyle}>
                    <CardHeader className="pb-4 border-b border-white/5">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors duration-500 ${isStep2Complete ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white'}`}>
                                2
                            </div>
                            Location
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-1">
                            <Label className={LabelStyle}>Search Area / Landmark <span className="text-red-500">*</span></Label>
                            <div className="relative z-30">
                                <LocationSearch onLocationSelect={setLocationData} cityName={selectedCityName} />
                            </div>
                            
                            <AnimatePresence>
                                {locationData && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0, y: -10 }} 
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-4"
                                    >
                                        <div className="p-2 bg-green-500/20 rounded-full text-green-400">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1">Location Locked</p>
                                            <p className="text-slate-300 text-sm leading-snug">{locationData.address}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- STEP 3: DETAILS --- */}
            <div className="relative z-10">
                <Card className={CardStyle}>
                    <CardHeader className="pb-4 border-b border-white/5">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border bg-white/5 border-white/10 text-white">
                                3
                            </div>
                            Issue Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-8">
                        
                        <div className="space-y-1">
                            <Label className={LabelStyle}>Issue Title <span className="text-red-500">*</span></Label>
                            <Input name="title" placeholder="e.g. Broken Pipe at Station Road" required className={InputStyle} />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <Label className={LabelStyle}>Category <span className="text-red-500">*</span></Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                                    <SelectTrigger className={InputStyle}>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-75">
                                        {PREDEFINED_CATEGORIES.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center gap-3">
                                                    {cat.icon} <span>{cat.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className={LabelStyle}>Priority</Label>
                                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                    <SelectTrigger className={InputStyle}>
                                        <SelectValue placeholder="Auto-detect (Recommended)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="AUTO">Auto-detect</SelectItem>
                                        {priorityOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <div className="flex items-center gap-3">
                                                    <opt.icon className={`h-4 w-4 ${opt.color}`} />
                                                    <span>{opt.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <AnimatePresence>
                            {selectedCategory === "Other" && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="space-y-1 overflow-hidden"
                                >
                                    <Label className={LabelStyle}>Please specify <span className="text-red-500">*</span></Label>
                                    <Input 
                                        value={customCategoryInput} 
                                        onChange={(e) => setCustomCategoryInput(e.target.value)} 
                                        placeholder="e.g. Stray Animals, Illegal Construction..." 
                                        required 
                                        className={`${InputStyle} border-orange-500/50 bg-orange-500/5`} 
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1">
                            <Label className={LabelStyle}>Description <span className="text-red-500">*</span></Label>
                            <Textarea 
                                name="description" 
                                placeholder="Describe the problem in detail..." 
                                required 
                                className={`${InputStyle} min-h-37.5 resize-none pt-3`} 
                            />
                        </div>

                        {/* Tags */}
                        <div className="space-y-1">
                            <Label className={LabelStyle}>Tags (Optional)</Label>
                            <div className="flex gap-3">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    placeholder="Add tags (press Enter)"
                                    className={InputStyle}
                                    disabled={tags.length >= 5}
                                />
                                <Button type="button" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 5} variant="outline" className="border-white/10 h-12 px-6 hover:bg-white/5 text-white">
                                    Add
                                </Button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {tags.map((tag, index) => (
                                        <Badge key={index} variant="outline" className="bg-slate-800/50 border-white/10 text-slate-300 pl-3 pr-2 py-1.5 flex items-center gap-2">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(index)} className="hover:text-red-400 hover:bg-red-400/10 rounded-full p-0.5 transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label className={LabelStyle}>Photo Evidence (Optional, Max 5)</Label>
                            <div className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer relative group/upload 
                                ${imageFiles.length > 0 
                                    ? 'border-green-500/30 bg-green-500/5' 
                                    : 'border-white/10 hover:border-orange-500/50 hover:bg-slate-900/50'
                                }`}>
                                
                                {imageFiles.length > 0 ? (
                                    <div className="w-full">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                                            {imageFiles.map((file, index) => (
                                                <div key={index} className="aspect-square bg-slate-950 rounded-lg relative flex flex-col items-center justify-center text-xs border border-white/10 overflow-hidden group/img">
                                                    <ImageIcon className="h-6 w-6 text-slate-500 mb-2" />
                                                    <span className="truncate w-full px-2 text-center text-slate-400">{file.name}</span>
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button type="button" onClick={(e) => {e.preventDefault(); removeImage(index)}} className="bg-red-500 text-white rounded-full p-1.5 hover:scale-110 transition-transform">
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-center text-green-400 font-bold uppercase tracking-wider">{imageFiles.length} images attached</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-4 group-hover/upload:border-orange-500/50 group-hover/upload:text-orange-500 transition-colors">
                                            <UploadCloud className="h-8 w-8 text-slate-400 group-hover/upload:text-orange-500 transition-colors" />
                                        </div>
                                        <span className="text-sm font-bold text-white mb-1">Click to upload evidence</span>
                                        <p className="text-xs text-slate-500">JPG, PNG (Max 5MB)</p>
                                    </div>
                                )}
                                <Input name="images" type="file" accept="image/*" multiple className="hidden" id="image-upload" onChange={handleImageChange} />
                                <label htmlFor="image-upload" className="absolute inset-0 cursor-pointer"></label>
                            </div>
                        </div>

                        {/* Video Upload */}
                        <div className="space-y-2">
                            <Label className={LabelStyle}>Video Evidence (Optional, Max 2 short clips)</Label>
                            <div className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer relative group/upload 
                                ${videoFiles.length > 0 
                                    ? 'border-green-500/30 bg-green-500/5' 
                                    : 'border-white/10 hover:border-orange-500/50 hover:bg-slate-900/50'
                                }`}>
                                
                                {videoFiles.length > 0 ? (
                                    <div className="w-full">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                            {videoFiles.map((file, index) => (
                                                <div key={index} className="aspect-video bg-slate-950 rounded-lg relative flex flex-col items-center justify-center text-xs border border-white/10 overflow-hidden group/vid">
                                                    <Video className="h-6 w-6 text-slate-500 mb-2" />
                                                    <span className="truncate w-full px-2 text-center text-slate-400">{file.name}</span>
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); removeVideo(index) }}
                                                            className="bg-red-500 text-white rounded-full p-1.5 hover:scale-110 transition-transform"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-center text-green-400 font-bold uppercase tracking-wider">{videoFiles.length} videos attached</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-4 group-hover/upload:border-orange-500/50 group-hover/upload:text-orange-500 transition-colors">
                                            <UploadCloud className="h-8 w-8 text-slate-400 group-hover/upload:text-orange-500 transition-colors" />
                                        </div>
                                        <span className="text-sm font-bold text-white mb-1">Click to upload videos</span>
                                        <p className="text-xs text-slate-500">MP4, WebM (Recommended &lt; 25MB each)</p>
                                    </div>
                                )}
                                <Input name="videos" type="file" accept="video/*" multiple className="hidden" id="video-upload" onChange={handleVideoChange} />
                                <label htmlFor="video-upload" className="absolute inset-0 cursor-pointer"></label>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- SUBMIT BUTTON --- */}
            <div className="pt-4">
                <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-lg h-16 font-bold tracking-wide shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.01] rounded-xl"
                    disabled={loading || !locationData || !selectedDept}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                            Encrypting & Submitting...
                        </>
                    ) : (
                        <>
                            <ShieldAlert className="mr-3 h-6 w-6" />
                            Submit Secure Report
                        </>
                    )}
                </Button>
            </div>

            {/* --- SUCCESS MODAL --- */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-green-500/20">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-center">Report Submitted!</DialogTitle>
                        <DialogDescription className="text-center text-slate-400 pt-2">
                            Your issue has been routed to the <strong>{departments.find(d => d.id === selectedDept)?.name}</strong> department.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-6 space-y-4">
                        <div className="bg-slate-950/50 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reference ID</p>
                                <code className="text-xl font-bold text-orange-400 font-mono tracking-wide">{submittedReportId}</code>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(submittedReportId); toast.success("Copied!"); }} className="text-slate-400 hover:text-white hover:bg-white/5">
                                <Copy className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3">
                            <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-300 leading-relaxed">
                                You can use this Reference ID to track the status of your report on the live status page.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button variant="outline" onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto border-white/10 text-slate-300 h-12">
                            Close
                        </Button>
                        <Button onClick={() => router.push(`/status?track=${submittedReportId}`)} className="w-full sm:w-auto bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white h-12">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Track Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </form>
    )
}