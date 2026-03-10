/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // qualifyfirst tool was removed, returning empty surveys
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
