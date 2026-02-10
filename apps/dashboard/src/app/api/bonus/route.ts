import { NextResponse } from 'next/server';
import { CollectClockService } from '@tiltcheck/collectclock';
import path from 'path';

export async function GET() {
  try {
    const service = new CollectClockService();
    // Initialize from the shared data directory
    const dataPath = path.join(process.cwd(), '../../data');
    service.initializeFromStaticData(dataPath);
    
    const casinos = service.getCasinos();
    return NextResponse.json(casinos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
