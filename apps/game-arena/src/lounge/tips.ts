/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

import { createHmac } from 'node:crypto';

// TODO: lawyer must review before mainnet. SOLANA_RPC stays devnet.
// TODO: receiver-derived fresh addresses per tip. Server currently maps username -> address privately.

export type TipRole = 'sender' | 'receiver' | 'other';

export type PublicTipView = {
  tipId: string;
  fromLabel: string;
  toLabel: string;
  amountUsd: string;
  line: string;
  knownParties: boolean;
};

export type RawTip = {
  tipId: string;
  senderId: string;
  receiverId: string;
  senderUsername: string;
  receiverUsername: string;
  amountUsd: string;
  senderWallet: string;
  receiverWallet: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
};

export type TipParties = Pick<
  RawTip,
  'tipId' | 'senderId' | 'receiverId' | 'senderUsername' | 'receiverUsername' | 'amountUsd'
>;

const LABEL_MIN = 1000;
const LABEL_MAX = 9999;

export function viewerDegenLabel(secret: string, viewerId: string, tipId: string, role: TipRole): string {
  const digest = createHmac('sha256', secret).update(`${viewerId}:${tipId}:${role}`).digest();
  const n = digest.readUInt32BE(0);
  const num = LABEL_MIN + (n % (LABEL_MAX - LABEL_MIN + 1));
  return `Degen #${num}`;
}

export function renderTipForViewer(secret: string, viewerId: string, tip: TipParties): PublicTipView {
  const isSender = viewerId === tip.senderId;
  const isReceiver = viewerId === tip.receiverId;
  if (isSender || isReceiver) {
    const fromLabel = isSender ? `You (${tip.senderUsername})` : tip.senderUsername;
    const toLabel = isReceiver ? `You (${tip.receiverUsername})` : tip.receiverUsername;
    const line = isSender
      ? `You tipped ${tip.receiverUsername} $${tip.amountUsd}. Only you two see the names.`
      : `${tip.senderUsername} tipped you $${tip.amountUsd}. Only you two see the names.`;
    return {
      tipId: tip.tipId,
      fromLabel,
      toLabel,
      amountUsd: tip.amountUsd,
      line,
      knownParties: true,
    };
  }
  const fromLabel = viewerDegenLabel(secret, viewerId, tip.tipId, 'sender');
  const toLabel = viewerDegenLabel(secret, viewerId, tip.tipId, 'receiver');
  const view: PublicTipView = {
    tipId: tip.tipId,
    fromLabel,
    toLabel,
    amountUsd: tip.amountUsd,
    line: `${fromLabel} tipped ${toLabel} $${tip.amountUsd}.`,
    knownParties: false,
  };
  return hidePartiesFromBystander(view, tip);
}

export function hidePartiesFromBystander(view: PublicTipView, tip: TipParties): PublicTipView {
  const blob = JSON.stringify(view).toLowerCase();
  for (const name of [tip.senderUsername, tip.receiverUsername]) {
    const needle = String(name).trim().toLowerCase();
    if (needle.length < 3 || needle.startsWith('degen')) continue;
    if (blob.includes(needle)) {
      throw new Error('tip parties leaked to a bystander');
    }
  }
  return view;
}

export function publicTipAnnouncement(tipId: string): { tipId: string } {
  return { tipId };
}

export function publicTipPayload(view: PublicTipView): PublicTipView {
  return view;
}

export class InFlightTipLock {
  private keys = new Set<string>();

  acquire(senderId: string): boolean {
    if (this.keys.has(senderId)) return false;
    this.keys.add(senderId);
    return true;
  }

  release(senderId: string): void {
    this.keys.delete(senderId);
  }
}

export class IdempotencyStore<T> {
  private map = new Map<string, T>();

  remember(key: string, value: T): T {
    const existing = this.map.get(key);
    if (existing) return existing;
    this.map.set(key, value);
    return value;
  }

  get(key: string): T | undefined {
    return this.map.get(key);
  }
}

export type BudgetRow = { remaining: number };

export function atomicDebit(rows: Map<string, BudgetRow>, id: string, amount: number): number | null {
  const row = rows.get(id);
  if (!row || amount <= 0 || row.remaining < amount) return null;
  row.remaining -= amount;
  return row.remaining;
}

export function shouldAnnounceTip(tip: Pick<RawTip, 'commitment'>): boolean {
  return tip.commitment === 'confirmed' || tip.commitment === 'finalized';
}

export function stripWalletsFromView(view: PublicTipView): PublicTipView {
  const json = JSON.stringify(view);
  if (/[1-9A-HJ-NP-Za-km-z]{32,44}/.test(json)) {
    throw new Error('wallet leaked into public tip view');
  }
  return view;
}
