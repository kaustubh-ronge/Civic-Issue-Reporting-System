import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmResolution } from '@/actions/reportActions';
import { confirmResolutionSchema, validateObject, formatValidationErrors } from '@/lib/validation-schemas';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        
        // Validate report ID
        const validation = await validateObject({ reportId: id }, confirmResolutionSchema);
        
        if (!validation.success) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation failed",
                errors: formatValidationErrors(validation.errors)
            }, { status: 400 });
        }

        const formData = new FormData();
        formData.append("reportId", id);

        const result = await confirmResolution(formData);
        return NextResponse.json(result);
    } catch (error) {
        console.error("CONFIRM_RESOLUTION_API_ERROR:", error);
        
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