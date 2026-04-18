import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getVideoUrl } from '@/actions/reportActions';
import { getVideoUrlSchema, validateObject, formatValidationErrors } from '@/lib/validation-schemas';

export async function GET(request, { params }) {
    try {
        const { videoId } = await params;
        
        // Validate video ID
        const validation = await validateObject({ videoId }, getVideoUrlSchema);
        
        if (!validation.success) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation failed",
                errors: formatValidationErrors(validation.errors)
            }, { status: 400 });
        }

        const videoUrl = await getVideoUrl(videoId);

        return NextResponse.json({ success: true, videoUrl });
    } catch (error) {
        console.error("VIDEO_URL_API_ERROR:", error);
        
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