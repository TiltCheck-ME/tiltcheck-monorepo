/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/auth - Discord OAuth Module
 * Discord OAuth2 authentication and user verification
 */

import type { 
  DiscordOAuthConfig, 
  DiscordUser, 
  DiscordTokens, 
  DiscordVerifyResult 
} from './types.js';

/**
 * Discord API endpoints
 */
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_OAUTH_AUTHORIZE = 'https://discord.com/oauth2/authorize';
const DISCORD_OAUTH_TOKEN = `${DISCORD_API_BASE}/oauth2/token`;
const DISCORD_USER_ME = `${DISCORD_API_BASE}/users/@me`;

/**
 * Default OAuth scopes for TiltCheck
 */
export const DEFAULT_SCOPES = ['identify', 'email'];

/**
 * Generate Discord OAuth2 authorization URL
 */
export function getAuthorizationUrl(
  config: DiscordOAuthConfig,
  state?: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
  });
  
  if (state) {
    params.set('state', state);
  }
  
  return `${DISCORD_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(
  code: string,
  config: DiscordOAuthConfig
): Promise<{ success: boolean; tokens?: DiscordTokens; error?: string }> {
  try {
    const response = await fetch(DISCORD_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Token exchange failed: ${error}` };
    }
    
    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    };
    
    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        scope: data.scope,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Refresh Discord access token
 */
export async function refreshTokens(
  refreshToken: string,
  config: DiscordOAuthConfig
): Promise<{ success: boolean; tokens?: DiscordTokens; error?: string }> {
  try {
    const response = await fetch(DISCORD_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Token refresh failed: ${error}` };
    }
    
    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    };
    
    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        scope: data.scope,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Get Discord user info from access token
 */
export async function getDiscordUser(
  accessToken: string
): Promise<{ success: boolean; user?: DiscordUser; error?: string }> {
  try {
    const response = await fetch(DISCORD_USER_ME, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to get user: ${error}` };
    }
    
    const data = await response.json() as {
      id: string;
      username: string;
      discriminator: string;
      global_name?: string;
      avatar?: string;
      email?: string;
      verified?: boolean;
      flags?: number;
      premium_type?: number;
    };
    
    return {
      success: true,
      user: {
        id: data.id,
        username: data.username,
        discriminator: data.discriminator,
        globalName: data.global_name,
        avatar: data.avatar,
        email: data.email,
        verified: data.verified,
        flags: data.flags,
        premiumType: data.premium_type,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Verify Discord OAuth callback and get user info
 * This is the main function to use in OAuth callback handlers
 */
export async function verifyDiscordOAuth(
  code: string,
  config: DiscordOAuthConfig
): Promise<DiscordVerifyResult> {
  // Exchange code for tokens
  const tokenResult = await exchangeCode(code, config);
  
  if (!tokenResult.success || !tokenResult.tokens) {
    return {
      valid: false,
      error: tokenResult.error || 'Failed to exchange code',
    };
  }
  
  // Get user info
  const userResult = await getDiscordUser(tokenResult.tokens.accessToken);
  
  if (!userResult.success || !userResult.user) {
    return {
      valid: false,
      error: userResult.error || 'Failed to get user info',
    };
  }
  
  return {
    valid: true,
    user: userResult.user,
    tokens: tokenResult.tokens,
  };
}

/**
 * Revoke Discord token
 */
export async function revokeToken(
  token: string,
  config: DiscordOAuthConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/oauth2/token/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Token revocation failed: ${error}` };
    }
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Generate Discord avatar URL
 */
export function getAvatarUrl(user: DiscordUser, size: number = 128): string {
  if (user.avatar) {
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`;
  }
  
  // Default avatar based on discriminator or user ID
  const defaultIndex = user.discriminator === '0' 
    ? (BigInt(user.id) >> 22n) % 6n 
    : parseInt(user.discriminator, 10) % 5;
  
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export type { DiscordOAuthConfig, DiscordUser, DiscordTokens, DiscordVerifyResult };
