/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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
