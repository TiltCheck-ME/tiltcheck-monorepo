/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */

export const EXT_CONFIG = {
    API_BASE_URL: 'https://api.tiltcheck.me',
    HUB_URL: 'https://tiltcheck.me/dashboard',
    DASHBOARD_URL: 'https://hub.tiltcheck.me/dashboard',
    AI_GATEWAY_URL: 'https://api.tiltcheck.me/ai',
    WEB_APP_URL: 'https://tiltcheck.me',
    DISCORD_CLIENT_ID: '1445916179163250860',
    // Operations & Revenue (GCP Bill Fund)
    OPERATIONS_WALLET: 'BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi',
    PROTOCOL_FEE_BPS: 250, // 2.5% service fee
};

/**
 * Get the current extension runtime ID
 */
export function getExtensionId(): string | undefined {
    return typeof chrome !== 'undefined' ? chrome.runtime?.id : undefined;
}

/**
 * Generate the Discord Login URL
 */
export function getDiscordLoginUrl(source = 'extension') {
    const url = new URL(`${EXT_CONFIG.API_BASE_URL}/auth/discord/login`);
    // The API handles OAuth + callback and posts a message back to the extension window.
    url.searchParams.set('source', source);
    if (source === 'extension') {
        // Content scripts run on page origins, so derive extension origin from runtime id.
        const runtimeId = getExtensionId();
        if (runtimeId) {
            url.searchParams.set('opener_origin', `chrome-extension://${runtimeId}`);
            url.searchParams.set('ext_id', runtimeId);
        }
    }
    // Preserve the caller info for debugging/analytics (not required by API).
    if (source && source !== 'extension') {
        url.searchParams.set('source_detail', source);
    }
    return url.toString();
}
