/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

/**
 * Deterministic Casino Trust Calculation Engine
 *
 * Computes verifiable, fact-driven trust grades from operational metrics:
 * 1. Financial Payouts & Velocity (Weight: 40%)
 * 2. Fairness & Proof Quality (Weight: 25%)
 * 3. Promotional Honesty (Weight: 15%)
 * 4. Operational Support & Licensing (Weight: 10%)
 * 5. Community Reputation & Dispute Record (Weight: 10%)
 *
 * Formula:
 * Score = Math.round(financialPayouts * 0.40 + fairnessTransparency * 0.25 +
 *                    promotionalHonesty * 0.15 + operationalSupport * 0.10 +
 *                    communityReputation * 0.10)
 */

export interface CasinoTrustInput {
  name: string;
  category: string;
  grade?: string;
  risk?: string;
  audited?: boolean;
  license?: string;
  rtpSummary?: string;
  rtpOriginals?: string;
  rtpSlots?: string;
  vaultSupport?: string;
  playthrough?: string;
  evidence?: string[];
  violations?: string[];
  redemptionMinHours?: number;
  redemptionMaxHours?: number;
  instantRedeem?: boolean;
}

export interface CasinoPillars {
  financialPayouts: number;
  fairnessTransparency: number;
  promotionalHonesty: number;
  operationalSupport: number;
  communityReputation: number;
}

export interface PillarBreakdownItem {
  score: number;
  weight: number;
  weightedScore: number;
  summary: string;
}

export interface CasinoTrustCalculation {
  score: number;
  grade: string;
  risk: string;
  pillars: CasinoPillars;
  breakdown: {
    financialPayouts: PillarBreakdownItem;
    fairnessTransparency: PillarBreakdownItem;
    promotionalHonesty: PillarBreakdownItem;
    operationalSupport: PillarBreakdownItem;
    communityReputation: PillarBreakdownItem;
  };
}

function clamp(value: number, min = 5, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function gradeFromScore(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 45) return 'D+';
  if (score >= 35) return 'D';
  return 'F';
}

export function riskFromScore(score: number, category?: string): string {
  if (category === 'Scam' || score < 35) return 'Critical';
  if (score >= 85) return 'Low';
  if (score >= 70) return 'Medium';
  if (score >= 50) return 'Medium-High';
  return 'High';
}

export function calculateFinancialPayouts(input: CasinoTrustInput): { score: number; summary: string } {
  if (input.category === 'Scam') {
    return { score: 10, summary: 'Chronic non-payment and withdrawal denial reports.' };
  }

  let base = 75;
  const notes: string[] = [];

  if (input.category === 'Regulated') {
    base = 95;
    notes.push('State-regulated banking rails (ACH, PayPal, cage cashout).');
  } else if (input.category === 'Crypto') {
    base = 80;
    const isInstant =
      (input.redemptionMaxHours !== undefined && input.redemptionMaxHours <= 2) ||
      /instant|immediate|<1h|<2h|automated hot wallet|sub-1-hour/i.test(input.playthrough || '') ||
      (input.evidence || []).some((e) => /instant|automated.*crypto.*withdrawal|sub-1-hour/i.test(e));

    if (isInstant) {
      base += 8;
      notes.push('Instant automated on-chain releases.');
    } else {
      notes.push('Standard crypto processing velocity.');
    }
  } else if (input.category === 'Sweeps' || input.category === 'Sweeps Hybrid') {
    base = 75;
    if (input.redemptionMaxHours !== undefined && input.redemptionMaxHours <= 48) {
      base += 3;
      notes.push('Fast sweeps prize redemption (24-48 hours).');
    } else if (input.redemptionMaxHours !== undefined && input.redemptionMaxHours > 96) {
      base -= 3;
      notes.push('Extended sweeps prize redemption (4-5+ business days).');
    } else {
      notes.push('Standard 24-72h sweeps prize processing.');
    }
  } else {
    base = 55;
    notes.push('Offshore unverified payment rails.');
  }

  // Playthrough evaluation
  const playthroughText = (input.playthrough || '') + ' ' + (input.evidence || []).join(' ');
  if (/500x|predatory.*turnover|unlock.*0\.2%/i.test(playthroughText)) {
    base -= 25;
    notes.push('Predatory bonus turnover lock detected.');
  } else if (/1x playthrough|1x deposit turnover|1x rollover/i.test(playthroughText)) {
    base += 3;
    notes.push('Clean 1x turnover requirement.');
  }

  // Instant Redeem capability bump
  if (input.instantRedeem) {
    base += 5;
    notes.push('TiltCheck Instant Redeem enabled.');
  }

  // Known violation deductions
  const violationsText = (input.violations || []).join(' ');
  if (/withdrawal.*delay|dispute|stall/i.test(violationsText)) {
    base -= 8;
    notes.push('Documented withdrawal friction reports.');
  }

  const score = clamp(base);
  return { score, summary: notes.join(' ') };
}

export function calculateFairnessTransparency(input: CasinoTrustInput): { score: number; summary: string } {
  if (input.category === 'Scam') {
    return { score: 10, summary: 'Fake or pirated software without verified math.' };
  }

  let base = 70;
  const notes: string[] = [];

  if (input.category === 'Regulated') {
    base = 92;
    notes.push('Certified RNG and mandatory public audits by state gaming divisions (GLI/eCOGRA).');
  } else if (input.category === 'Crypto') {
    const originalsText = input.rtpOriginals || '';
    const hasProvablyFair = /provably fair|hmac-sha256|sha-256|client seed/i.test(originalsText) ||
      (input.evidence || []).some((e) => /provably fair/i.test(e));

    if (hasProvablyFair) {
      base = 82;
      notes.push('Cryptographic Provably Fair Originals (HMAC-SHA256).');
    }

    const slotsText = input.rtpSlots || '';
    const hasDowngrade = !/no\s+(?:silent\s+)?downgrade/i.test(slotsText) &&
      /downgrade|91\.|92\.|94\.2|lower rtp tier/i.test(slotsText);

    if (hasDowngrade) {
      base -= 7;
      notes.push('Slot RTP downgrade profiles deployed on third-party titles.');
    } else if (/96\.50% tier|96\.00% standard|standard manufacturer maximums|no.*downgrades/i.test(slotsText)) {
      base += 6;
      notes.push('Standard 96%+ slot manufacturer RTP tiers deployed.');
    }
  } else if (input.category === 'Sweeps' || input.category === 'Sweeps Hybrid') {
    base = 78;
    const certText = (input.rtpOriginals || '') + ' ' + (input.rtpSlots || '') + ' ' + (input.evidence || []).join(' ');
    if (/gli|bmm|gaming associates|itech/i.test(certText)) {
      base += 4;
      notes.push('RNG certified by independent testing laboratory (GLI/BMM/Gaming Associates).');
    } else {
      notes.push('Sweepstakes game math with proprietary outcome models.');
    }
  } else {
    base = 50;
    notes.push('Uncertified offshore game math without public proof.');
  }

  const score = clamp(base);
  return { score, summary: notes.join(' ') };
}

export function calculatePromotionalHonesty(input: CasinoTrustInput): { score: number; summary: string } {
  if (input.category === 'Scam') {
    return { score: 10, summary: 'Deceptive bonus terms and confiscated winnings.' };
  }

  let base = 75;
  const notes: string[] = [];

  if (input.category === 'Regulated') {
    base = 82;
    notes.push('Strict regulatory promo disclosures with published rollover terms.');
  } else if (input.category === 'Sweeps' || input.category === 'Sweeps Hybrid') {
    base = 78;
    notes.push('Free daily login coins and compliant AMOE alternative entry.');
    if (/dual-currency.*accidental burn/i.test((input.evidence || []).join(' '))) {
      base -= 4;
      notes.push('Dual-currency layout risks accidental real-coin burn.');
    }
  } else if (input.category === 'Crypto') {
    base = 76;
    const fullText = (input.playthrough || '') + ' ' + (input.evidence || []).join(' ') + ' ' + (input.violations || []).join(' ');
    if (/500x|predatory.*turnover|bcd.*locked|0\.2% per wager/i.test(fullText)) {
      base -= 36;
      notes.push('Predatory bonus lock: Advertised match requires ~500x turnover to release.');
    } else if (/rakeback|vip.*rewards|rank-up|vip.*progression/i.test(fullText)) {
      base += 2;
      notes.push('Transparent rakeback and wager-based VIP tiering.');
    }
  } else {
    base = 50;
    notes.push('Predatory offshore bonus terms and high playthrough strings.');
  }

  const score = clamp(base);
  return { score, summary: notes.join(' ') };
}

export function calculateOperationalSupport(input: CasinoTrustInput): { score: number; summary: string } {
  if (input.category === 'Scam') {
    return { score: 10, summary: 'No valid gaming license or regulatory accountability.' };
  }

  let base = 70;
  const notes: string[] = [];

  const licenseText = (input.license || '').toLowerCase();
  if (input.category === 'Regulated' || /nj dge|pa pgcb|ukgc|mga|isle of man/i.test(licenseText)) {
    base = 90;
    notes.push('Tier-1 gaming commission license and active regulatory oversight.');
    if ((input.violations || []).some((v) => /fine/i.test(v))) {
      base -= 5;
      notes.push('Past regulatory enforcement fine on record.');
    }
  } else if (input.category === 'Sweeps' || /sweepstakes model|amoe|vgw|yellow social|mw services|high 5/i.test(licenseText)) {
    base = 80;
    notes.push('Compliant US sweepstakes entity with legal counsel oversight.');
  } else if (/curaçao|curacao|8048\/jaz|5536\/jaz|365\/jaz|kahnawake|anjouan/i.test(licenseText)) {
    base = 72;
    notes.push('Curaçao / offshore master license registration.');
    if (/dispute|sub-license/i.test(licenseText + ' ' + (input.violations || []).join(' '))) {
      base -= 8;
      notes.push('Historical licensing or corporate structure opacity.');
    }
  } else {
    base = 40;
    notes.push('No recognized tier-1 or tier-2 gaming license on record.');
  }

  // Guardrail support
  const vaultText = (input.vaultSupport || '').toLowerCase();
  if (/graphql|native api/i.test(vaultText)) {
    base += 6;
    notes.push('Native AutoVault GraphQL integration.');
  } else if (/dom-based vault adapter|dom vault/i.test(vaultText)) {
    base += 4;
    notes.push('TiltCheck DOM vault adapter compatibility.');
  } else if (/extension/i.test(vaultText)) {
    base += 2;
    notes.push('TiltCheck session HUD and spend brake support.');
  }

  const score = clamp(base);
  return { score, summary: notes.join(' ') };
}

export function calculateCommunityReputation(input: CasinoTrustInput): { score: number; summary: string } {
  if (input.category === 'Scam') {
    return { score: 10, summary: 'Blacklisted by watchdog networks (AskGamblers / Casinomeister).' };
  }

  let base = 75;
  const notes: string[] = [];

  if (input.category === 'Regulated') {
    base = 88;
    notes.push('Established public operator with high mainstream reputation.');
  } else if (input.category === 'Sweeps' || input.category === 'Sweeps Hybrid') {
    base = 78;
    notes.push('Strong recreational player adoption across legal US states.');
  } else if (input.category === 'Crypto') {
    const fullText = (input.name + ' ' + (input.evidence || []).join(' ') + ' ' + (input.violations || []).join(' ')).toLowerCase();
    if (input.name === 'Shuffle') {
      base = 84;
      notes.push('High crypto community trust with transparent leadership.');
    } else if (/dispute|complaint|stall|verification loop/i.test(fullText)) {
      base = 55;
      notes.push('Frequent community withdrawal and account verification dispute reports.');
    } else {
      base = 76;
      notes.push('Established crypto player base with active community channels.');
    }
  } else {
    base = 45;
    notes.push('Low community consensus and offshore dispute risk.');
  }

  const score = clamp(base);
  return { score, summary: notes.join(' ') };
}

export function calculateCasinoTrust(input: CasinoTrustInput): CasinoTrustCalculation {
  const fin = calculateFinancialPayouts(input);
  const fair = calculateFairnessTransparency(input);
  const promo = calculatePromotionalHonesty(input);
  const ops = calculateOperationalSupport(input);
  const comm = calculateCommunityReputation(input);

  const weightedScore = Math.round(
    fin.score * 0.40 +
    fair.score * 0.25 +
    promo.score * 0.15 +
    ops.score * 0.10 +
    comm.score * 0.10
  );

  const finalScore = clamp(weightedScore);
  const grade = gradeFromScore(finalScore);
  const risk = riskFromScore(finalScore, input.category);

  return {
    score: finalScore,
    grade,
    risk,
    pillars: {
      financialPayouts: fin.score,
      fairnessTransparency: fair.score,
      promotionalHonesty: promo.score,
      operationalSupport: ops.score,
      communityReputation: comm.score,
    },
    breakdown: {
      financialPayouts: {
        score: fin.score,
        weight: 0.40,
        weightedScore: Math.round(fin.score * 0.40 * 10) / 10,
        summary: fin.summary,
      },
      fairnessTransparency: {
        score: fair.score,
        weight: 0.25,
        weightedScore: Math.round(fair.score * 0.25 * 10) / 10,
        summary: fair.summary,
      },
      promotionalHonesty: {
        score: promo.score,
        weight: 0.15,
        weightedScore: Math.round(promo.score * 0.15 * 10) / 10,
        summary: promo.summary,
      },
      operationalSupport: {
        score: ops.score,
        weight: 0.10,
        weightedScore: Math.round(ops.score * 0.10 * 10) / 10,
        summary: ops.summary,
      },
      communityReputation: {
        score: comm.score,
        weight: 0.10,
        weightedScore: Math.round(comm.score * 0.10 * 10) / 10,
        summary: comm.summary,
      },
    },
  };
}
