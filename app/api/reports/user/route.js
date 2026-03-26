import { NextResponse } from 'next/server';
import { getUserReports } from '@/actions/reportActions';

export async function GET() {
    const result = await getUserReports();
    return NextResponse.json(result);
}