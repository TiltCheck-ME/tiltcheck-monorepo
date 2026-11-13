// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Discord Embedded App SDK setup. Adapted from apps/activity/src/sdk/DiscordBridge.ts.
// Flow: ready() -> authorize() -> POST /api/activity/token -> authenticate().
// Outside Discord (no frame_id in the URL) we skip all of this and run as a guest.

import { DiscordSDK, Events } from '@discord/embedded-app-sdk';
import { roomKeyFor, type RoomUser } from '../shared/protocol.js';

export const CLIENT_ID: string = import.meta.env.VITE_DISCORD_CLIENT_ID || '1445916179163250860';
/** Relative on purpose: Discord's proxy maps /api to the worker. */
export const TOKEN_PATH = '/api/activity/token';

const READY_MS = 8_000;
const HANDSHAKE_MS = 18_000;

export interface Participant {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Session {
  mode: 'discord' | 'guest';
  user: RoomUser;
  instanceId: string;
  /**
   * Room this session joins: g-<guild>-c-<channel> in a server channel, so every launch in that
   * channel shares one table; the instance id in DMs, group DMs and guest mode.
   */
  roomId: string;
  /** Discord access token, or a guest:<name> token for the dev worker. */
  token: string;
  /** Guild the Activity runs in (null in DMs and guest mode). Only feeds the anonymous live-tables count. */
  guildId: string | null;
  sdk: DiscordSDK | null;
}

export function isInsideDiscord(search: string = location.search): boolean {
  return new URLSearchParams(search).has('frame_id');
}

export function avatarUrl(id: string, avatar: string | null, size = 64): string {
  if (avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=${size}`;
  let idx = 0;
  try {
    idx = /^\d+$/.test(id) ? Number((BigInt(id) >> 22n) % 6n) : id.length % 6;
  } catch {
    idx = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function timeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms))]);
}

type ParticipantLike = { id: string; username: string; global_name?: string | null; nickname?: string; avatar?: string | null };

function toParticipant(p: ParticipantLike): Participant {
  return { id: p.id, name: p.nickname || p.global_name || p.username, avatar: p.avatar ?? null };
}

export async function startDiscord(onParticipants: (list: Participant[]) => void): Promise<Session> {
  const sdk = new DiscordSDK(CLIENT_ID);

  const handshake = async (): Promise<Session> => {
    await timeout(sdk.ready(), READY_MS, 'Discord ready');

    const { code } = await sdk.commands.authorize({
      client_id: CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    });

    const res = await fetch(TOKEN_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
    const { access_token } = (await res.json()) as { access_token?: string };
    if (!access_token) throw new Error('Token exchange returned no token');

    const auth = await sdk.commands.authenticate({ access_token });
    const user: RoomUser = {
      id: auth.user.id,
      name: auth.user.global_name || auth.user.username,
      avatar: auth.user.avatar ?? null,
    };

    // 2026 name (renamed from getInstanceConnectedParticipants, Discord changelog Oct 6 2026).
    try {
      const { participants } = await sdk.commands.getActivityInstanceConnectedParticipants();
      onParticipants(participants.map(toParticipant));
    } catch {
      /* the room's own member list still works */
    }
    await sdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, (data: { participants: ParticipantLike[] }) => {
      onParticipants((data.participants ?? []).map(toParticipant));
    });

    return { mode: 'discord', user, instanceId: sdk.instanceId, roomId: roomKeyFor(sdk.instanceId, sdk.channelId), token: access_token, guildId: sdk.guildId ?? null, sdk };
  };

  return timeout(handshake(), HANDSHAKE_MS, 'Discord handshake');
}

export function startGuest(search: string = location.search): Session {
  const params = new URLSearchParams(search);
  const name = (params.get('name') || 'Guest Degen').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 24) || 'Guest Degen';
  const id = `guest-${name.replace(/\s+/g, '').toLowerCase() || 'degen'}`;
  const instanceId = params.get('room') || 'local-dev';
  return {
    mode: 'guest',
    user: { id, name, avatar: null },
    instanceId,
    roomId: instanceId,
    token: `guest:${id.slice('guest-'.length)}`,
    guildId: null,
    sdk: null,
  };
}
