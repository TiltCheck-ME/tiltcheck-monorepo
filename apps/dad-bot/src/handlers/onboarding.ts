// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// DAD Bot — Onboarding

import type { User } from 'discord.js';

const onboardedUsers = new Set<string>();

export function needsOnboarding(userId: string): boolean {
  return !onboardedUsers.has(userId);
}

export function markOnboarded(userId: string): void {
  onboardedUsers.add(userId);
}

export async function checkAndOnboard(user: User): Promise<void> {
  if (onboardedUsers.has(user.id)) return;
  onboardedUsers.add(user.id);
  await user.send(
    `Welcome to Degens Against Decency.\n\nUse \`/help\` to see available commands.\nStart a game with \`/lobby create\`.`
  ).catch(() => {});
}
