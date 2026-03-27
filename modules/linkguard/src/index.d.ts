/* Copyright (c) 2026 TiltCheck. All rights reserved. */
export interface LinkGuardScanInput {
    domain: string;
    category: 'safe' | 'unknown' | 'suspicious' | 'unsafe' | 'malicious';
    actor?: string;
    context?: Record<string, any>;
    reason?: string;
}
export declare function emitDomainTrustFromLinkGuard(scan: LinkGuardScanInput): Promise<void>;
export declare function getLinkGuardDomainScore(domain: string): number;
export declare function overrideLinkGuardDomain(domain: string, classification: 'safe' | 'unsafe', actor: string, note?: string): Promise<void>;
export declare function snapshotLinkGuardScores(): {
    domain: string;
    score: number;
}[];