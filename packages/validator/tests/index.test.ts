
import { describe, it, expect } from 'vitest';
import {
    isValidSolanaAddress,
    isValidDiscordId,
    isValidURL,
    isCasinoURL,
    isValidAmount,
    isValidUsername,
    sanitizeInput,
    isValidEthereumAddress,
    isValidTransactionHash,
    isValidMultiplier
} from '../src/index.js';

describe('@tiltcheck/validator', () => {
    describe('isValidSolanaAddress', () => {
        it('should validate correct Solana addresses', () => {
            expect(isValidSolanaAddress('So11111111111111111111111111111111111111112')).toBe(true);
            expect(isValidSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
        });

        it('should reject invalid Solana addresses', () => {
            expect(isValidSolanaAddress('invalid-address')).toBe(false);
            expect(isValidSolanaAddress('0x1234567890123456789012345678901234567890')).toBe(false);
            expect(isValidSolanaAddress('')).toBe(false);
        });
    });

    describe('isValidDiscordId', () => {
        it('should validate correct Discord IDs', () => {
            expect(isValidDiscordId('1153034319271559328')).toBe(true);
            expect(isValidDiscordId('1445916179163250860')).toBe(true);
        });

        it('should reject invalid Discord IDs', () => {
            expect(isValidDiscordId('abc')).toBe(false);
            expect(isValidDiscordId('123')).toBe(false);
            expect(isValidDiscordId('')).toBe(false);
        });
    });

    describe('isValidEthereumAddress', () => {
        it('should validate correct Ethereum addresses', () => {
            expect(isValidEthereumAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(true);
            expect(isValidEthereumAddress('0x0000000000000000000000000000000000000000')).toBe(true);
        });

        it('should reject invalid Ethereum addresses', () => {
            expect(isValidEthereumAddress('0x123')).toBe(false);
            expect(isValidEthereumAddress('742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
            expect(isValidEthereumAddress('0xG42d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
        });
    });

    describe('isValidTransactionHash', () => {
        it('should validate correct Solana transaction hashes', () => {
            // 88 character base58 string
            const solSig = '5VERv8m9v7v8v9vAwv1v2v3v4v5v6v7v8v9vAwv1v2v3v4v5v6v7v8v9vAwv1v2v3v4v5v6v7v8v9vAwv1v2v3v4v5v6';
            expect(isValidTransactionHash(solSig)).toBe(true);
        });

        it('should validate correct EVM transaction hashes', () => {
            expect(isValidTransactionHash('0x90f81559e592728636e4926569101138805374431e2d4f23b7e45145b4a0984a', 'evm')).toBe(true);
        });

        it('should reject invalid transaction hashes', () => {
            expect(isValidTransactionHash('invalid-hash')).toBe(false);
            expect(isValidTransactionHash('0x123', 'evm')).toBe(false);
            expect(isValidTransactionHash('0x90f81559e592728636e4926569101138805374431e2d4f23b7e45145b4a0984g', 'evm')).toBe(false); // 'g' is not hex
        });
    });

    describe('isValidMultiplier', () => {
        it('should validate correct multipliers', () => {
            expect(isValidMultiplier(1.5)).toBe(true);
            expect(isValidMultiplier('2.0')).toBe(true);
            expect(isValidMultiplier(0.1)).toBe(true);
        });

        it('should reject invalid multipliers', () => {
            expect(isValidMultiplier(0)).toBe(false);
            expect(isValidMultiplier(-1)).toBe(false);
            expect(isValidMultiplier('abc')).toBe(false);
        });
    });

    describe('isCasinoURL', () => {
        it('should recognize casino URLs', () => {
            expect(isCasinoURL('https://stake.com/settings')).toBe(true);
            expect(isCasinoURL('https://roobet.com')).toBe(true);
            expect(isCasinoURL('http://bc.game')).toBe(true);
        });

        it('should not recognize non-casino URLs', () => {
            expect(isCasinoURL('https://google.com')).toBe(false);
            expect(isCasinoURL('https://github.com')).toBe(false);
        });
    });
});
