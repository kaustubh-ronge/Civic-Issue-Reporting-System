// import { NextResponse } from 'next/server';
// import { createReport } from '@/actions/reportActions'; // Adjust import path if needed

// export async function POST(request) {
//     try {
//         // Grab the FormData sent directly from the mobile phone
//         const formData = await request.formData();
        
//         // Pass it directly into your existing, highly secure Server Action
//         const result = await createReport(formData);
        
//         return NextResponse.json(result);
//     } catch (error) {
//         console.error("API Route Error:", error);
//         return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
//     }
// }
// //d

import { NextResponse } from 'next/server';
import { createReport } from '@/actions/reportActions';

export async function POST(request) {
    try {
        // 1. Check if the request is actually FormData
        const contentType = request.headers.get("content-type");
        if (!contentType || !contentType.includes("multipart/form-data")) {
            return NextResponse.json({ success: false, error: "Invalid Content-Type. Expected multipart/form-data" }, { status: 400 });
        }

        // 2. Parse the body
        const formData = await request.formData();
        
        // 3. Trigger the Server Action
        const result = await createReport(formData);
        
        return NextResponse.json(result);
    } catch (error) {
        console.error("CRITICAL_API_ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}