/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 */

export const EXT_CONFIG = {
    API_BASE_URL: 'https://api.tiltcheck.me',
    AI_GATEWAY_URL: 'https://ai-gateway.tiltcheck.me',
    WEB_APP_URL: 'https://tiltcheck.me',
    DISCORD_CLIENT_ID: '1445916179163250860',
    // Standard scopes only to avoid "invalid scope" errors
    DISCORD_SCOPES: ['identify', 'email'],
    // The redirect URI must be exactly what is in the Discord Developer Portal
    DISCORD_REDIRECT_URI: 'https://tiltcheck.me/auth/discord/callback'
};

/**
 * Generate the Discord Login URL
 */
export function getDiscordLoginUrl(source = 'extension') {
    const params = new URLSearchParams({
        client_id: EXT_CONFIG.DISCORD_CLIENT_ID,
        response_type: 'code',
        redirect_uri: EXT_CONFIG.DISCORD_REDIRECT_URI,
        scope: EXT_CONFIG.DISCORD_SCOPES.join(' '),
        state: source // Helps identify if login came from popup or sidebar
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
