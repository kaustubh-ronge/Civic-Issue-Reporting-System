

// 'use client'

// import React, { useState } from 'react';
// import { Loader2, UploadCloud, CheckCircle2 } from "lucide-react";
// import { toast } from "sonner";

// export default function SmartUploadZone({ onAIResult }) {
//     const [isAnalyzing, setIsAnalyzing] = useState(false);
//     const [successMsg, setSuccessMsg] = useState("");

//     const fileToDataUrl = (file) => new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result);
//         reader.onerror = reject;
//         reader.readAsDataURL(file);
//     });

//     const handleImageUpload = async (event) => {
//         const file = event.target.files[0];
//         if (!file) return;

//         setIsAnalyzing(true);
//         setSuccessMsg("");
//         const formData = new FormData();
//         formData.append('file', file);

//         try {
//             const response = await fetch('http://127.0.0.1:8000/analyze-issue', {
//                 method: 'POST',
//                 body: formData,
//             });

//             if (!response.ok) throw new Error("API Engine down");

//             const data = await response.json();
            
//             if (data.status === "success" && data.issues_found > 0) {
//                 setSuccessMsg(`AI found ${data.data[0].class_name}! Auto-filling form...`);

//                 let annotatedImage = data.annotated_image || data.data?.[0]?.annotated_image || data.data?.annotated_image || null;
//                 if (!annotatedImage) {
//                     const fallbackDataUrl = await fileToDataUrl(file);
//                     if (fallbackDataUrl) {
//                         annotatedImage = fallbackDataUrl.startsWith('data:') ? fallbackDataUrl : fallbackDataUrl.split(',')[1];
//                     }
//                 }

//                 const payload = {
//                     ...data,
//                     annotated_image: annotatedImage,
//                 };

//                 if (onAIResult) onAIResult(payload);
//             } else {
//                 toast.info("AI couldn't detect a specific issue. Please fill manually.");
//             }
//         } catch (error) {
//             console.error("API Engine Error:", error);
//             toast.error("Could not connect to the AI Engine. Is your Python server running?");
//         } finally {
//             setIsAnalyzing(false);
//         }
//     };

//     return (
//         <div className="relative z-40 mb-8 p-6 border-2 border-dashed border-orange-500/50 rounded-xl bg-slate-900/60 backdrop-blur-md shadow-[0_0_30px_rgba(249,115,22,0.1)]">
//             <div className="flex flex-col items-center text-center">
//                 <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
//                     <UploadCloud className="text-orange-400 h-6 w-6" />
//                 </div>
//                 <h3 className="text-lg font-bold text-white mb-1">AI Smart Assistant</h3>
//                 <p className="text-slate-400 text-sm mb-4">
//                     Drop a photo here first. The AI will calculate the severity and auto-fill the form below.
//                 </p>
                
//                 <div className="relative w-full max-w-xs">
//                     <input 
//                         type="file" 
//                         accept="image/*"
//                         onChange={handleImageUpload}
//                         disabled={isAnalyzing}
//                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
//                     />
//                     <div className="bg-orange-600 hover:bg-orange-500 transition-colors text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center w-full">
//                         {isAnalyzing ? (
//                             <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Scanning Image...</>
//                         ) : successMsg ? (
//                             <><CheckCircle2 className="h-5 w-5 mr-2" /> {successMsg}</>
//                         ) : (
//                             "Upload Photo for AI Scan"
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }




'use client'

import React, { useState } from 'react';
import { Loader2, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SmartUploadZone({ onAIResult }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const fileToDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsAnalyzing(true);
        setSuccessMsg("");
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Replaced hardcoded URL with Environment Variable
            const engineUrl = process.env.NEXT_PUBLIC_ML_ENGINE_URL || 'http://127.0.0.1:8000';
            
            const response = await fetch(`${engineUrl}/analyze-issue`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error("API Engine down");

            const data = await response.json();
            
            if (data.status === "success" && data.issues_found > 0) {
                setSuccessMsg(`AI found ${data.data[0].class_name}! Auto-filling form...`);

                let annotatedImage = data.annotated_image || data.data?.[0]?.annotated_image || data.data?.annotated_image || null;
                if (!annotatedImage) {
                    const fallbackDataUrl = await fileToDataUrl(file);
                    if (fallbackDataUrl) {
                        annotatedImage = fallbackDataUrl.startsWith('data:') ? fallbackDataUrl : fallbackDataUrl.split(',')[1];
                    }
                }

                const payload = {
                    ...data,
                    annotated_image: annotatedImage,
                };

                if (onAIResult) onAIResult(payload);
            } else {
                toast.info("AI couldn't detect a specific issue. Please fill manually.");
            }
        } catch (error) {
            console.error("API Engine Error:", error);
            toast.error("Could not connect to the AI Engine. Is your Python server running?");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="relative z-40 mb-8 p-6 border-2 border-dashed border-orange-500/50 rounded-xl bg-slate-900/60 backdrop-blur-md shadow-[0_0_30px_rgba(249,115,22,0.1)]">
            <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
                    <UploadCloud className="text-orange-400 h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">AI Smart Assistant</h3>
                <p className="text-slate-400 text-sm mb-4">
                    Drop a photo here first. The AI will calculate the severity and auto-fill the form below.
                </p>
                
                <div className="relative w-full max-w-xs">
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isAnalyzing}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="bg-orange-600 hover:bg-orange-500 transition-colors text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center w-full">
                        {isAnalyzing ? (
                            <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Scanning Image...</>
                        ) : successMsg ? (
                            <><CheckCircle2 className="h-5 w-5 mr-2" /> {successMsg}</>
                        ) : (
                            "Upload Photo for AI Scan"
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
