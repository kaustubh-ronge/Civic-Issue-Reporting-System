// // import { NextResponse } from 'next/server';
// // import Mux from '@mux/mux-node';
// // import { checkUser } from '@/lib/checkUser'; // Secures the endpoint

// // export async function GET() {
// //     try {
// //         // 1. Ensure the user is logged in before giving them a ticket
// //         const user = await checkUser();
// //         if (!user) {
// //             return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
// //         }

// //         // 2. Initialize Mux
// //         const mux = new Mux({
// //             accessToken: process.env.MUX_TOKEN_ID,
// //             secret: process.env.MUX_TOKEN_SECRET
// //         });

// //         // 3. Create the direct upload ticket
// //         const upload = await mux.video.uploads.create({
// //             new_asset_settings: { playback_policy: ['public'] },
// //             cors_origin: '*', // Allows the mobile app to upload directly
// //         });

// //         // 4. Send the URL and ID back to the phone
// //         return NextResponse.json({
// //             success: true,
// //             uploadUrl: upload.url,
// //             uploadId: upload.id
// //         });

// //     } catch (error) {
// //         console.error("MUX TICKET ERROR:", error);
// //         return NextResponse.json({ success: false, error: "Failed to generate Mux ticket" }, { status: 500 });
// //     }
// // }


// // // import { NextResponse } from 'next/server';
// // // import Mux from '@mux/mux-node';

// // // const mux = new Mux({
// // //   accessToken: process.env.MUX_TOKEN_ID,
// // //   secret: process.env.MUX_TOKEN_SECRET
// // // });

// // // export async function GET() {
// // //   try {
// // //     // We ask Mux for a one-time secure upload URL
// // //     const upload = await mux.video.uploads.create({
// // //       new_asset_settings: { playback_policy: ['public'] },
// // //       cors_origin: '*', // Allows the mobile app to upload directly
// // //     });

// // //     return NextResponse.json({ 
// // //       uploadUrl: upload.url, 
// // //       uploadId: upload.id 
// // //     });
// // //   } catch (error) {
// // //     console.error("Mux ticket error:", error);
// // //     return NextResponse.json({ error: "Failed to generate upload ticket" }, { status: 500 });
// // //   }
// // // }


// import { NextResponse } from 'next/server';
// import Mux from '@mux/mux-node';
// import { checkUser } from '@/lib/checkUser'; 

// export async function GET() {
//     try {
//         const user = await checkUser();
//         if (!user) {
//             return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//         }

//         const mux = new Mux({
//             accessToken: process.env.MUX_TOKEN_ID,
//             secret: process.env.MUX_TOKEN_SECRET
//         });

//         // FIXED: Using your project's correct Mux SDK syntax (mux.uploads instead of mux.video.uploads)
//         const upload = await mux.uploads.create({
//             new_asset_settings: { playback_policy: ['public'] },
//             cors_origin: '*', 
//         });

//         return NextResponse.json({
//             success: true,
//             uploadUrl: upload.url,
//             uploadId: upload.id
//         });

//     } catch (error) {
//         console.error("MUX TICKET ERROR:", error);
//         return NextResponse.json({ success: false, error: "Failed to generate Mux ticket" }, { status: 500 });
//     }
// }



import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server'; // Use Clerk's native API auth

export async function GET(request) {
    try {
        // 1. Properly authenticate the mobile app's Bearer token
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized request from app" }, { status: 401 });
        }

        // 2. Check for environment variables so we don't crash blindly
        const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
        if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
            console.error("CRITICAL: Missing MUX environment variables on server.");
            return NextResponse.json({ success: false, error: "Server missing Mux config" }, { status: 500 });
        }

        // 3. Initialize Mux
        const mux = new Mux({
            accessToken: MUX_TOKEN_ID,
            secret: MUX_TOKEN_SECRET
        });

        // 4. Create the upload ticket using your EXACT proven web syntax
        const upload = await mux.uploads.create({
            new_asset_settings: { playback_policy: 'public' }, // String, not array!
            cors_origin: '*' // Allow the Expo app to upload the file directly
        });

        // 5. Return the URL to the phone
        return NextResponse.json({
            success: true,
            uploadUrl: upload.url,
            uploadId: upload.id
        });

    } catch (error) {
        // Log the EXACT error to your Vercel terminal so we aren't guessing
        console.error("MUX TICKET 500 ERROR DETAILS:", error);
        
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Failed to generate Mux ticket" 
        }, { status: 500 });
    }
}