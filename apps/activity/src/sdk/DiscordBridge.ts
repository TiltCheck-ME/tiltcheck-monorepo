// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import { DiscordSDK, Events } from '@discord/embedded-app-sdk';

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
  private readonly clientId: string;
  private sdk: DiscordSDK | null = null;
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
    this.clientId = clientId;
  }

  async initialize(): Promise<DiscordBridgeState> {
    const sdk = this.getOrCreateSdk();

    // 8-second timeout — fall to demo mode if Discord SDK hangs
    await Promise.race([
      sdk.ready(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Discord SDK ready() timeout')), 8000)
      )
    ]);

    await this.authenticate(sdk);
    await this.subscribeToEvents(sdk);
    return this.state;
  }

  private getOrCreateSdk(): DiscordSDK {
    if (this.sdk) {
      return this.sdk;
    }

    try {
      this.sdk = new DiscordSDK(this.clientId);
      return this.sdk;
    } catch (error) {
      throw new Error(this.formatSdkInitError(error), { cause: error });
    }
  }

  private formatSdkInitError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return `Discord SDK unavailable outside Discord: ${error.message}`;
    }

    return 'Discord SDK unavailable outside Discord.';
  }

  private async authenticate(sdk: DiscordSDK): Promise<void> {
    const { code } = await sdk.commands.authorize({
      client_id: sdk.clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'rpc.activities.write']
    });

    const tokenRes = await fetch('https://api.tiltcheck.me/auth/discord/activity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    const { access_token } = await tokenRes.json();
    this.accessToken = access_token;

    const auth = await sdk.commands.authenticate({ access_token });
    this.state.userId = auth.user.id;
    this.state.username = auth.user.username;
    this.state.channelId = sdk.channelId;
  }

  private async subscribeToEvents(sdk: DiscordSDK): Promise<void> {
    // Participant updates
    await sdk.subscribe(
      Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE,
      (data) => {
        this.state.participants = (data.participants || []).map((p: { id: string; username: string; avatar?: string | null }) => ({
          id: p.id,
          username: p.username,
          avatar: p.avatar ?? null
        }));
        this.emit('participants', this.state.participants);
      }
    );

    // Voice state
    if (sdk.channelId) {
      await sdk.subscribe(
        Events.VOICE_STATE_UPDATE,
        (data) => {
          if (data.user?.id === this.state.userId) {
            this.state.voiceActive = !data.voice_state?.self_mute && !data.voice_state?.self_deaf;
            this.emit('voiceState', this.state.voiceActive);
          }
        },
        { channel_id: sdk.channelId }
      );
    }

    // Orientation
    await sdk.subscribe(
      Events.ORIENTATION_UPDATE,
      (data) => {
        this.state.orientation = data.screen_orientation === 0 ? 'portrait' : 'landscape';
        this.emit('orientation', this.state.orientation);
      }
    );
  }

  async openExternalLink(url: string): Promise<void> {
    if (this.sdk) {
      await this.sdk.commands.openExternalLink({ url });
      return;
    }

    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async inviteUserToActivity(): Promise<void> {
    if (!this.sdk) {
      return;
    }

    await this.sdk.commands.openInviteDialog();
  }

  async setRichPresence(state: string, details: string): Promise<void> {
    if (!this.sdk) {
      return;
    }

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
