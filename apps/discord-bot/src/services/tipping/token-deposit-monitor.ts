/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Token Deposit Monitor
 *
 * Watches the bot wallet for incoming SPL token transfers.
 */

import {
    Connection,
    PublicKey,
    type ConfirmedSignatureInfo,
    type ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { type CreditManager, MIN_DEPOSIT_LAMPORTS } from '@tiltcheck/justthetip';
import { TokenSwapService, DEPOSIT_TOKENS } from './token-swap.js';

const POLL_INTERVAL_MS = 20_000;
const DEPOSIT_CODE_EXPIRY_MS = 60 * 60 * 1000;
const DEPOSIT_CODE_PREFIX = 'JTT-';

interface PendingDeposit {
    discordId: string;
    code: string;
    createdAt: number;
}

export class TokenDepositMonitor {
    private connection: Connection;
    private botWalletAddress: PublicKey;
    private creditManager: CreditManager;
    private swapService: TokenSwapService;
    private pendingDeposits: Map<string, PendingDeposit> = new Map();
    private processedSignatures: Set<string> = new Set();
    private lastSignatureByAddress: Map<string, string> = new Map();
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private onSwapDeposit?: (discordId: string, inputToken: string, outputLamports: number, signature: string) => void;

    constructor(
        connection: Connection,
        botWalletAddress: string,
        creditManager: CreditManager,
        swapService: TokenSwapService,
        opts?: {
            onSwapDeposit?: (discordId: string, inputToken: string, outputLamports: number, sig: string) => void;
        }
    ) {
        this.connection = connection;
        this.botWalletAddress = new PublicKey(botWalletAddress);
        this.creditManager = creditManager;
        this.swapService = swapService;
        this.onSwapDeposit = opts?.onSwapDeposit;
    }

    registerDepositCode(code: string, discordId: string): void {
        this.pendingDeposits.set(code.toUpperCase(), {
            discordId,
            code,
            createdAt: Date.now(),
        });
    }

    start(): void {
        if (this.pollTimer) return;
        console.log(`[TokenDepositMonitor] Started polling for SPL token deposits`);
        this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
        setTimeout(() => this.poll(), 5_000);
    }

    stop(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    private async poll(): Promise<void> {
        try {
            const watchedAddresses = await this.getWatchedAddresses();
            const bySignature = new Map<string, ConfirmedSignatureInfo>();

            for (const address of watchedAddresses) {
                const addressKey = address.toBase58();
                const opts: { limit: number; until?: string } = { limit: 30 };
                const lastSignature = this.lastSignatureByAddress.get(addressKey);
                if (lastSignature) {
                    opts.until = lastSignature;
                }

                const signatures: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(
                    address,
                    opts
                );

                if (!signatures.length) continue;
                this.lastSignatureByAddress.set(addressKey, signatures[0].signature);

                for (const sig of signatures) {
                    if (!bySignature.has(sig.signature)) {
                        bySignature.set(sig.signature, sig);
                    }
                }
            }

            if (!bySignature.size) return;

            const signatures = Array.from(bySignature.values()).sort((a, b) => {
                const aTime = a.blockTime ?? 0;
                const bTime = b.blockTime ?? 0;
                return aTime - bTime;
            });

            for (const sig of signatures) {
                if (this.processedSignatures.has(sig.signature)) continue;
                if (sig.err) continue;
                await this.processTransaction(sig.signature);
            }

            for (const [code, deposit] of this.pendingDeposits) {
                if (Date.now() - deposit.createdAt > DEPOSIT_CODE_EXPIRY_MS) {
                    this.pendingDeposits.delete(code);
                }
            }
        } catch (err) {
            console.error('[TokenDepositMonitor] Poll error:', err);
        }
    }

    private async getWatchedAddresses(): Promise<PublicKey[]> {
        const addresses = new Map<string, PublicKey>();
        addresses.set(this.botWalletAddress.toBase58(), this.botWalletAddress);

        const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
            this.botWalletAddress,
            { programId: tokenProgramId }
        );

        for (const account of tokenAccounts.value) {
            addresses.set(account.pubkey.toBase58(), account.pubkey);
        }

        return Array.from(addresses.values());
    }

    private async processTransaction(signature: string): Promise<void> {
        try {
            const tx = await this.connection.getParsedTransaction(signature, {
                maxSupportedTransactionVersion: 0,
            });
            if (!tx) return;

            const memo = this.extractMemo(tx);
            if (!memo) return;

            const normalizedMemo = memo.trim().toUpperCase();
            if (!normalizedMemo.startsWith(DEPOSIT_CODE_PREFIX)) return;

            const pendingDeposit = this.pendingDeposits.get(normalizedMemo);
            if (!pendingDeposit) return;

            const tokenTransfer = this.extractSplTokenTransfer(tx);
            if (!tokenTransfer) return;

            this.processedSignatures.add(signature);
            this.pendingDeposits.delete(normalizedMemo);

            const { mint, amount } = tokenTransfer;
            const tokenInfo = Object.entries(DEPOSIT_TOKENS).find(([, t]) => t.mint === mint);
            const tokenSymbol = tokenInfo?.[0] ?? 'UNKNOWN';

            const swapResult = await this.swapService.swapTokenToSOL(mint, amount);

            if (!swapResult.success || !swapResult.outputLamports) {
                console.error(`[TokenDepositMonitor] Swap failed for ${pendingDeposit.discordId}: ${swapResult.error}`);
                return;
            }

            await this.creditManager.deposit(pendingDeposit.discordId, swapResult.outputLamports, {
                signature: swapResult.signature,
                memo: `token-swap:${tokenSymbol}→SOL`,
            });

            this.onSwapDeposit?.(
                pendingDeposit.discordId,
                tokenSymbol,
                swapResult.outputLamports,
                swapResult.signature ?? signature
            );
        } catch (err) {
            console.error(`[TokenDepositMonitor] Error processing tx ${signature}:`, err);
        }
    }

    private extractSplTokenTransfer(
        tx: ParsedTransactionWithMeta
    ): { mint: string; amount: number } | null {
        const tokenBalances = tx.meta?.postTokenBalances;
        const preTokenBalances = tx.meta?.preTokenBalances;
        if (!tokenBalances || !preTokenBalances) return null;

        const botAddress = this.botWalletAddress.toBase58();

        for (const post of tokenBalances) {
            if (post.owner !== botAddress) continue;

            const pre = preTokenBalances.find((b) => b.accountIndex === post.accountIndex);
            const preAmount = parseInt(pre?.uiTokenAmount?.amount ?? '0');
            const postAmount = parseInt(post.uiTokenAmount?.amount ?? '0');
            const delta = postAmount - preAmount;

            if (delta <= 0) continue;

            const mint = post.mint;
            return { mint, amount: delta };
        }

        return null;
    }

    private extractMemo(tx: ParsedTransactionWithMeta): string | null {
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
            if ('program' in ix && ix.program === 'spl-memo') {
                if ('parsed' in ix) return String(ix.parsed);
            }
            const programId =
                'programId' in ix
                    ? typeof ix.programId === 'string'
                        ? ix.programId
                        : ix.programId.toBase58()
                    : null;
            if (
                programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
                programId === 'Memo1UhkJBfCR6MNB4GBYB8YHaiSyHrS'
            ) {
                if ('parsed' in ix) return String(ix.parsed);
                if ('data' in ix) {
                    try {
                        return Buffer.from(ix.data as string, 'base64').toString('utf-8');
                    } catch {
                        return null;
                    }
                }
            }
        }
        return null;
    }
}
