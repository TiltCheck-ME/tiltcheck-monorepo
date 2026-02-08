import { NextResponse } from 'next/server';
import { WalletCheckService } from '@tiltcheck/walletcheck';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const service = new WalletCheckService();
    const report = await service.scanWallet(address);
    
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
