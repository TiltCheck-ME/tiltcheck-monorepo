// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import { DiscordSDK, Events, RPCCloseCodes } from '@discord/embedded-app-sdk';

export interface Participant {
  id: string;
  username: string;
  avatar: string | null;
}

export interface DiscordBridgeState {
  userId: string;
  username: string;
  channelId: string | null;
  participants: Participant[];
  voiceActive: boolean;
  orientation: 'landscape' | 'portrait';
}

type EventHandler<T = unknown> = (data: T) => void;

export class DiscordBridge {
  private sdk: DiscordSDK;
  private state: DiscordBridgeState = {
    userId: '',
    username: 'Anonymous',
    channelId: null,
    participants: [],
    voiceActive: false,
    orientation: 'landscape'
  };
  private handlers: Map<string, EventHandler[]> = new Map();
  private accessToken: string | null = null;

  constructor(clientId: string) {
    this.sdk = new DiscordSDK(clientId);
  }

  async initialize(): Promise<DiscordBridgeState> {
    await this.sdk.ready();
    await this.authenticate();
    await this.subscribeToEvents();
    return this.state;
  }

  private async authenticate(): Promise<void> {
    const { code } = await this.sdk.commands.authorize({
      client_id: this.sdk.clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'rpc.activities.write']
    });

    const tokenRes = await fetch('/api/auth/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    const { access_token } = await tokenRes.json();
    this.accessToken = access_token;

    const auth = await this.sdk.commands.authenticate({ access_token });
    this.state.userId = auth.user.id;
    this.state.username = auth.user.username;
    this.state.channelId = this.sdk.channelId;
  }

  private async subscribeToEvents(): Promise<void> {
    // Participant updates
    await this.sdk.subscribe(
      Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE,
      (data) => {
        this.state.participants = (data.participants || []).map((p: { id: string; username: string; avatar?: string }) => ({
          id: p.id,
          username: p.username,
          avatar: p.avatar || null
        }));
        this.emit('participants', this.state.participants);
      }
    );

    // Voice state
    if (this.sdk.channelId) {
      await this.sdk.subscribe(
        Events.VOICE_STATE_UPDATE,
        (data) => {
          if (data.user?.id === this.state.userId) {
            this.state.voiceActive = !data.voice_state?.self_mute && !data.voice_state?.self_deaf;
            this.emit('voiceState', this.state.voiceActive);
          }
        },
        { channel_id: this.sdk.channelId }
      );
    }

    // Orientation
    await this.sdk.subscribe(
      Events.ORIENTATION_UPDATE,
      (data) => {
        this.state.orientation = data.screen_orientation === 0 ? 'portrait' : 'landscape';
        this.emit('orientation', this.state.orientation);
      }
    );
  }

  async openExternalLink(url: string): Promise<void> {
    await this.sdk.commands.openExternalLink({ url });
  }

  async inviteUserToActivity(): Promise<void> {
    await this.sdk.commands.openInviteDialog();
  }

  async setRichPresence(state: string, details: string): Promise<void> {
    await this.sdk.commands.setActivity({
      activity: {
        state,
        details,
        timestamps: { start: Date.now() }
      }
    });
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  getState(): DiscordBridgeState {
    return { ...this.state };
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getChannelId(): string | null {
    return this.state.channelId;
  }
}
