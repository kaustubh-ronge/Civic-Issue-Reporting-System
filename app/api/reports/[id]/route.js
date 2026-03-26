import { NextResponse } from 'next/server';
import { getReportByReportId } from '@/actions/reportActions';

export async function GET(request, { params }) {
    const { id } = params;
    const result = await getReportByReportId(id);
    return NextResponse.json(result);
}