import { NextResponse } from 'next/server';
import { createMobileReport } from '@/actions/reportActions';

export async function POST(request) {
    try {
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json({ success: false, error: "Invalid Content-Type" }, { status: 400 });
        }

        const formData = await request.formData();
        
        // Call the dedicated mobile server action
        const result = await createMobileReport(formData);
        
        return NextResponse.json(result);
    } catch (error) {
        console.error("MOBILE_API_ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}