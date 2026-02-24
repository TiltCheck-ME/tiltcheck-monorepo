import { NextResponse } from 'next/server';
import { qualifyFirst } from '@tiltcheck/qualifyfirst';

export async function GET() {
  try {
    const surveys = await qualifyFirst.matchSurveys('demo-user');
    return NextResponse.json(surveys);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
