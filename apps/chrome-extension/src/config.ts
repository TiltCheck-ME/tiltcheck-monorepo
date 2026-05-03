/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

export const EXT_CONFIG = {
    API_BASE_URL: 'https://api.tiltcheck.me',
    HUB_URL: 'https://api.tiltcheck.me',
    DASHBOARD_URL: 'https://dashboard.tiltcheck.me/dashboard',
    AI_GATEWAY_URL: 'https://api.tiltcheck.me/ai',
    WEB_APP_URL: 'https://tiltcheck.me',
    DISCORD_CLIENT_ID: '1445916179163250860',
    // Operations & Revenue (GCP Bill Fund)
    OPERATIONS_WALLET: 'BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi',
    PROTOCOL_FEE_BPS: 250, // 2.5% service fee
};

export const TELEMETRY_BASE_PATH = '/v1/telemetry';
export const TELEMETRY_PATH = `${TELEMETRY_BASE_PATH}/round`;
export const WIN_SECURE_PATH = `${TELEMETRY_BASE_PATH}/win-secure`;
export const TELEMETRY_REQUEST_HEADERS = Object.freeze({
    'Content-Type': 'application/json',
    'X-Requested-With': 'TiltCheckExtension',
});

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

export function getHubEndpoint(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizeBaseUrl(EXT_CONFIG.HUB_URL)}${normalizedPath}`;
}

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
