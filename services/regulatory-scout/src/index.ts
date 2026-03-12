/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SusLinkModule } from '../../modules/suslink/src/suslink.js';
import type { LinkScanResult } from '@tiltcheck/types';

interface RegulatoryDelta {
  commission: string;
  sourceUrl: string;
  identifiedChange: string;
  riskLevel: 'low' | 'medium' | 'high';
  detectedAt: string;
}

export class RegulatoryScout {
  private suslink: SusLinkModule;
  private commissions = [
    { name: 'UKGC', url: 'https://www.gamblingcommission.gov.uk/' },
    { name: 'MGA', url: 'https://www.mga.org.mt/' },
    { name: 'Curacao', url: 'https://www.curacao-egaming.com/' }
  ];

  constructor() {
    this.suslink = new SusLinkModule();
    console.log('[Regulatory Scout] Service initialized');
  }

  /**
   * Scrapes target commission portals for new filings.
   * Uses Link Scanning API to verify the safety of discovered documents.
   */
  public async performScoutMission(): Promise<RegulatoryDelta[]> {
    const deltas: RegulatoryDelta[] = [];

    for (const commission of this.commissions) {
      console.log(`[Regulatory Scout] Scanning ${commission.name}...`);
      
      // Step 1: Link Verification via SusLink API
      const scanResult: LinkScanResult = await this.suslink.scanUrl(commission.url);
      
      if (scanResult.riskLevel === 'high' || scanResult.riskLevel === 'critical') {
        console.warn(`[Regulatory Scout] Skipping ${commission.name} due to high link risk: ${scanResult.reason}`);
        continue;
      }

      // Step 2: (Logic) PDF Parsing and Delta Identification
      // This is where the LLM-driven PDF parsing logic would reside.
      // Mocking a detected delta for initial functional verification.
      deltas.push({
        commission: commission.name,
        sourceUrl: commission.url,
        identifiedChange: 'New technical standards for financial limit enforcement released.',
        riskLevel: 'medium',
        detectedAt: new Date().toISOString()
      });
    }

    return deltas;
  }
}

// Service Entry Point
const scout = new RegulatoryScout();
scout.performScoutMission().then(deltas => {
  console.log(`[Regulatory Scout] Mission complete. ${deltas.length} deltas identified.`);
  console.table(deltas);
});
