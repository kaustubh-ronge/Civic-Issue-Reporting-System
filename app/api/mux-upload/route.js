
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';

export async function GET(request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized request from app" }, { status: 401 });
        }

        const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
        if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
            console.error("CRITICAL: Missing MUX environment variables.");
            return NextResponse.json({ success: false, error: "Server missing Mux config" }, { status: 500 });
        }

        const mux = new Mux({
            accessToken: MUX_TOKEN_ID,
            secret: MUX_TOKEN_SECRET
        });

        // FIXED: .video. is explicitly required here!
        const upload = await mux.video.uploads.create({
            new_asset_settings: { playback_policy: ['public'] },
            cors_origin: '*'
        });

        return NextResponse.json({
            success: true,
            uploadUrl: upload.url,
            uploadId: upload.id
        });

    } catch (error) {
        console.error("MUX TICKET 500 ERROR DETAILS:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Failed to generate Mux ticket" 
        }, { status: 500 });
    }
}