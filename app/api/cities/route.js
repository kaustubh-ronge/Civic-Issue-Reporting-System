import { NextResponse } from 'next/server';
import { getSupportedCities } from '@/actions/utilActions'; // Adjust import path if needed

export async function GET() {
    const result = await getSupportedCities();
    return NextResponse.json(result);
}