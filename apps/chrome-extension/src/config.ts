/**
 * (c) 2024-2025 TiltCheck Ecosystem. All Rights Reserved.
 */

export const EXT_CONFIG = {
    API_BASE_URL: 'https://tiltcheck-api-164294266634.us-central1.run.app',
    AI_GATEWAY_URL: 'https://tiltcheck-api-164294266634.us-central1.run.app/ai',
    WEB_APP_URL: 'https://tiltcheck-web-164294266634.us-central1.run.app',
    DISCORD_CLIENT_ID: '1445916179163250860',
    // Keep in sync with API OAuth scope configuration.
    DISCORD_SCOPES: ['identify', 'identify.premium'],
    // The redirect URI must be exactly what is in the Discord Developer Portal
    DISCORD_REDIRECT_URI: 'https://tiltcheck-api-164294266634.us-central1.run.app/auth/discord/callback'
};

/**
 * Generate the Discord Login URL
 */
export function getDiscordLoginUrl(source = 'extension') {
    const url = new URL(`${EXT_CONFIG.API_BASE_URL}/auth/discord/login`);
    // The API handles OAuth + callback and posts a message back to the extension window.
    url.searchParams.set('source', source);
    if (source === 'extension') {
        // Content scripts run on page origins, so derive extension origin from runtime id.
        const runtimeId = typeof chrome !== 'undefined' ? chrome.runtime?.id : undefined;
        if (runtimeId) {
            url.searchParams.set('opener_origin', `chrome-extension://${runtimeId}`);
        }
    }
    // Preserve the caller info for debugging/analytics (not required by API).
    if (source && source !== 'extension') {
        url.searchParams.set('source_detail', source);
    }
    return url.toString();
}

