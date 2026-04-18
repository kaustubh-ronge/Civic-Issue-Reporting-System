import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reopenReport } from '@/actions/reportActions';
import { reopenReportSchema, validateObject, formatValidationErrors } from '@/lib/validation-schemas';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        let reason = '';
        
        const contentType = request.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const body = await request.json();
            reason = body.reason || '';
        }
        
        // Validate payload
        const validation = await validateObject({ reportId: id, reason }, reopenReportSchema);
        
        if (!validation.success) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation failed",
                errors: formatValidationErrors(validation.errors)
            }, { status: 400 });
        }

        const formData = new FormData();
        formData.append("reportId", id);
        formData.append("reason", reason);

        const result = await reopenReport(formData);
        return NextResponse.json(result);
    } catch (error) {
        console.error("REOPEN_REPORT_API_ERROR:", error);
        
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