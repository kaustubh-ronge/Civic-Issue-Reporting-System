import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { checkUser } from '@/lib/checkUser'; // Secures the endpoint

export async function GET() {
    try {
        // 1. Ensure the user is logged in before giving them a ticket
        const user = await checkUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // 2. Initialize Mux
        const mux = new Mux({
            accessToken: process.env.MUX_TOKEN_ID,
            secret: process.env.MUX_TOKEN_SECRET
        });

        // 3. Create the direct upload ticket
        const upload = await mux.video.uploads.create({
            new_asset_settings: { playback_policy: ['public'] },
            cors_origin: '*', // Allows the mobile app to upload directly
        });

        // 4. Send the URL and ID back to the phone
        return NextResponse.json({
            success: true,
            uploadUrl: upload.url,
            uploadId: upload.id
        });

    } catch (error) {
        console.error("MUX TICKET ERROR:", error);
        return NextResponse.json({ success: false, error: "Failed to generate Mux ticket" }, { status: 500 });
    }
}


// import { NextResponse } from 'next/server';
// import Mux from '@mux/mux-node';

// const mux = new Mux({
//   accessToken: process.env.MUX_TOKEN_ID,
//   secret: process.env.MUX_TOKEN_SECRET
// });

// export async function GET() {
//   try {
//     // We ask Mux for a one-time secure upload URL
//     const upload = await mux.video.uploads.create({
//       new_asset_settings: { playback_policy: ['public'] },
//       cors_origin: '*', // Allows the mobile app to upload directly
//     });

//     return NextResponse.json({ 
//       uploadUrl: upload.url, 
//       uploadId: upload.id 
//     });
//   } catch (error) {
//     console.error("Mux ticket error:", error);
//     return NextResponse.json({ error: "Failed to generate upload ticket" }, { status: 500 });
//   }
// }