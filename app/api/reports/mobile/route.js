// import { NextResponse } from 'next/server';
// import { createMobileReport } from '@/actions/reportActions';

// export async function POST(request) {
//     try {
//         const contentType = request.headers.get("content-type") || "";
//         if (!contentType.includes("multipart/form-data")) {
//             return NextResponse.json({ success: false, error: "Invalid Content-Type" }, { status: 400 });
//         }

//         const formData = await request.formData();
        
//         // Call the dedicated mobile server action
//         const result = await createMobileReport(formData);
        
//         return NextResponse.json(result);
//     } catch (error) {
//         console.error("MOBILE_API_ERROR:", error);
//         return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//     }
// }


import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createMobileReport } from '@/actions/reportActions';
import { createMobileReportSchema, validateFormData, formatValidationErrors } from '@/lib/validation-schemas';

export async function POST(request) {
    try {
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json({ success: false, error: "Invalid Content-Type. Expected multipart/form-data" }, { status: 400 });
        }

        const formData = await request.formData();
        
        // Validate with Zod
        const validation = await validateFormData(formData, createMobileReportSchema);
        
        if (!validation.success) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation failed",
                errors: formatValidationErrors(validation.errors)
            }, { status: 400 });
        }

        // Call the dedicated mobile server action
        const result = await createMobileReport(formData);
        
        return NextResponse.json(result);
    } catch (error) {
        console.error("MOBILE_API_ERROR:", error);
        
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation error",
                errors: error.flatten().fieldErrors
            }, { status: 400 });
        }
        
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}