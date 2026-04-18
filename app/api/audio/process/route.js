import { NextResponse } from 'next/server';
import { z } from 'zod';
import { processAudioSubmission } from '@/actions/reportActions';
import { processAudioSubmissionSchema, validateFormData, formatValidationErrors } from '@/lib/validation-schemas';

export async function POST(request) {
    try {
        const contentType = request.headers.get("content-type");
        if (!contentType || !contentType.includes("multipart/form-data")) {
            return NextResponse.json({ success: false, error: "Invalid Content-Type. Expected multipart/form-data" }, { status: 400 });
        }

        const formData = await request.formData();
        
        // Validate with Zod
        const validation = await validateFormData(formData, processAudioSubmissionSchema);
        
        if (!validation.success) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation failed",
                errors: formatValidationErrors(validation.errors)
            }, { status: 400 });
        }

        const result = await processAudioSubmission(formData);

        return NextResponse.json(result);
    } catch (error) {
        console.error("AUDIO_PROCESS_API_ERROR:", error);
        
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