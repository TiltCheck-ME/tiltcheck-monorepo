// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// "Invite friends": Discord's own channel-invite dialog (Embedded App SDK openInviteDialog, no extra
// OAuth scope per Discord's SDK reference). Hidden in guest mode and whenever the SDK is missing.

import { COPY } from '../copy.js';

export interface InviteSdk {
  commands: { openInviteDialog?: () => Promise<unknown> };
}

let sdk: InviteSdk | null = null;

/** main.ts sets this after the Discord handshake; null (guest mode, no SDK) hides every button. */
export function setInviteSdk(next: InviteSdk | null): void {
  sdk = next && typeof next.commands?.openInviteDialog === 'function' ? next : null;
}

export function canInvite(): boolean {
  return sdk !== null;
}

const ICON = `<svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 3 17.5V19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 8v6M16 11h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

/** The button, or nothing when inviting isn't possible here. */
export function inviteButton(extra = ''): string {
  if (!sdk) return '';
  return `<button type="button" class="btn btn--sm btn--invite ${extra}" data-invite>${ICON}<span>${COPY.invite}</span></button>`;
}

/** Open Discord's invite dialog. Errors (dialog refused, old client) end in a short toast, nothing more. */
export async function openInvite(toast: (msg: string) => void): Promise<void> {
  const open = sdk?.commands.openInviteDialog;
  if (!open) return;
  try {
    await open.call(sdk!.commands);
  } catch {
    toast(COPY.inviteFailed);
  }
}
