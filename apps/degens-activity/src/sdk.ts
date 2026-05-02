// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Discord Embedded App SDK bridge — lean wrapper

import { DiscordSDK, Events } from '@discord/embedded-app-sdk';

export interface DiscordUser {
  id: string;
  username: string;
  channelId: string | null;
}

type Handler = (data: unknown) => void;

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1445916179163250860';
const TOKEN_ENDPOINT = import.meta.env.VITE_TOKEN_ENDPOINT || 'https://api.tiltcheck.me/auth/discord/activity/token';

let sdk: DiscordSDK | null = null;
let accessToken: string | null = null;
const handlers = new Map<string, Handler[]>();

function emit(event: string, data: unknown): void {
  handlers.get(event)?.forEach((h) => h(data));
}

export function on(event: string, handler: Handler): void {
  if (!handlers.has(event)) handlers.set(event, []);
  handlers.get(event)!.push(handler);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function initSDK(): Promise<DiscordUser> {
  // Outside Discord — demo mode
  if (window.self === window.top) {
    return { id: 'demo-0000', username: 'DEMO DEGEN', channelId: null };
  }

  sdk = new DiscordSDK(CLIENT_ID);
  await Promise.race([
    sdk.ready(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SDK timeout')), 8000)),
  ]);

  const { code } = await sdk.commands.authorize({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: ['identify', 'rpc.activities.write'],
    prompt: 'none',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);

  const { access_token } = (await res.json()) as { access_token: string };
  accessToken = access_token;
  const auth = await sdk.commands.authenticate({ access_token });

  // Subscribe to participant changes
  await sdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, (data) => {
    emit('participants', data.participants);
  });

  return {
    id: auth.user.id,
    username: auth.user.username,
    channelId: sdk.channelId,
  };
}

export async function openExternal(url: string): Promise<void> {
  if (sdk) {
    await sdk.commands.openExternalLink({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

export async function invite(): Promise<void> {
  if (sdk) await sdk.commands.openInviteDialog();
}
