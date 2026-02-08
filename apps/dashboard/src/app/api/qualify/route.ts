import { NextResponse } from 'next/server';
import { QualifyFirstService } from '@tiltcheck/qualifyfirst';

export async function GET() {
  try {
    const service = new QualifyFirstService();
    const tasks = await service.getAvailableTasks('demo-user');
    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
