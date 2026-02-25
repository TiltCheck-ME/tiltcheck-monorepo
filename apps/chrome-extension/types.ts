/**
 * Core types for TiltCheck analysis
 */

export interface TiltState {
    userId: string;
    tiltScore: number;
    isTilted: boolean;
    lastUpdated: Date;
}

export type TiltLevel = 'CALM' | 'FRUSTRATED' | 'TILTED' | 'RAGE';