import { NextResponse } from 'next/server';
import { getDepartmentsByCity } from '@/actions/utilActions'; // Adjust import path if needed

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('cityId');
    
    if (!cityId) {
        return NextResponse.json({ success: false, error: 'Missing cityId' }, { status: 400 });
    }
    
    const result = await getDepartmentsByCity(cityId);
    return NextResponse.json(result);
}