import { NextResponse } from 'next/server';
import { createReport } from '@/actions/reportActions'; // Adjust import path if needed

export async function POST(request) {
    try {
        // Grab the FormData sent directly from the mobile phone
        const formData = await request.formData();
        
        // Pass it directly into your existing, highly secure Server Action
        const result = await createReport(formData);
        
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}