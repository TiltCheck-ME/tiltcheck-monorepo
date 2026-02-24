import { NextResponse } from 'next/server';
import { collectclock } from '@tiltcheck/collectclock';

export async function GET() {
  try {
    const casinos = collectclock.getCasinos();
    return NextResponse.json(casinos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
