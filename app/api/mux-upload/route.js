import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  accessToken: process.env.MUX_TOKEN_ID,
  secret: process.env.MUX_TOKEN_SECRET
});

export async function GET() {
  try {
    // We ask Mux for a one-time secure upload URL
    const upload = await mux.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: '*', // Allows the mobile app to upload directly
    });

    return NextResponse.json({ 
      uploadUrl: upload.url, 
      uploadId: upload.id 
    });
  } catch (error) {
    console.error("Mux ticket error:", error);
    return NextResponse.json({ error: "Failed to generate upload ticket" }, { status: 500 });
  }
}