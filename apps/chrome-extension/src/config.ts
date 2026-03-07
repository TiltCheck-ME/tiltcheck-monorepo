/**
 * (c) 2024-2025 TiltCheck Ecosystem. All Rights Reserved.
 */

export const EXT_CONFIG = {
    API_BASE_URL: 'https://api.tiltcheck.me',
    AI_GATEWAY_URL: 'https://ai-gateway.tiltcheck.me',
    WEB_APP_URL: 'https://tiltcheck.me',
    DISCORD_CLIENT_ID: '1445916179163250860',
    // Standard scopes only to avoid "invalid scope" errors
    DISCORD_SCOPES: ['identify', 'email'],
    // The redirect URI must be exactly what is in the Discord Developer Portal
    DISCORD_REDIRECT_URI: 'https://api.tiltcheck.me/auth/discord/callback'
};

function getExtensionRuntimeOrigin(): string | undefined {
    try {
        const runtimeUrl = chrome?.runtime?.getURL?.('');
        if (!runtimeUrl) return undefined;
        return new URL(runtimeUrl).origin;
    } catch {
        return undefined;
    }
}

/**
 * Generate the Discord Login URL
 */
export function getDiscordLoginUrl(source = 'extension', openerOrigin?: string) {
    const url = new URL(`${EXT_CONFIG.API_BASE_URL}/auth/discord/login`);
    // The API handles OAuth + callback and posts a message back to the extension window.
    url.searchParams.set('source', source);
    if (source === 'extension') {
        const extensionOrigin = openerOrigin || getExtensionRuntimeOrigin();
        if (extensionOrigin) {
            url.searchParams.set('opener_origin', extensionOrigin);
        }
    }
    // Preserve the caller info for debugging/analytics (not required by API).
    if (source && source !== 'extension') {
        url.searchParams.set('source_detail', source);
    }
    return url.toString();
}

