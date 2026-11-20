/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 */

const WORKER_ORIGIN = 'https://collectclock-api.j-chapman7.workers.dev';

/**
 * api.tiltcheck.me does not resolve, so every data call goes to the live
 * collectclock-api worker. Only call the routes in WORKER_ROUTES: the worker
 * answers any other path with 200 and its health JSON, which looks like success.
 */
export const EXT_CONFIG = {
    API_BASE_URL: WORKER_ORIGIN,
    WORKER_API_URL: WORKER_ORIGIN,
    DISCORD_REDIRECT_URI: `${WORKER_ORIGIN}/auth/callback`,
    HUB_URL: WORKER_ORIGIN,
    DASHBOARD_URL: 'https://tiltcheck.me/dashboard',
    WEB_APP_URL: 'https://tiltcheck.me',
    DISCORD_CLIENT_ID: '1445916179163250860',
    // Operations & Revenue (GCP Bill Fund)
    OPERATIONS_WALLET: 'BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi',
    PROTOCOL_FEE_BPS: 250, // 2.5% service fee
};

/** Routes the collectclock-api worker really serves for the extension. */
export const WORKER_ROUTES = Object.freeze({
    /** POST { access_token } (Discord) -> { session, name, avatar }. */
    AUTH_TOKEN: '/auth/token',
    /** GET with Bearer session -> { staff, beta, canEdit }, 401 when signed out. */
    ME: '/me',
    /** POST with Bearer session -> deletes that session. */
    LOGOUT: '/logout',
    /** POST with Bearer session, { kind: 'feedback', message } -> relayed to staff by the worker. 401 when signed out. */
    SUPPORT: '/support',
    /** POST { schema: 1, version, day, counts } (JSON, <= 1 KB, no auth) -> { ok: true }; 400 bad batch, 429 day full. */
    BETA_COUNTS: '/beta/counts',
});

/**
 * Features whose backend does not exist yet. Each one stays off (no network
 * call, UI hidden) until the worker grows a route for it.
 */
type BackendFeatureName =
    | 'serverStatus'
    | 'onboardingStatus'
    | 'serverExclusions'
    | 'vaultRules'
    | 'analyzer'
    | 'telemetry'
    | 'cooldownApi'
    | 'linkScan'
    | 'lounge'
    | 'betaTelemetry';

export const BACKEND_FEATURES: Readonly<Record<BackendFeatureName, boolean>> = Object.freeze({
    /** Tilt score, P/L and live session from the server. */
    serverStatus: false,
    /** Onboarding checklist state. */
    onboardingStatus: false,
    /** Exclusions synced from a Discord account. */
    serverExclusions: false,
    /** Vault rules synced from a Discord account. */
    vaultRules: false,
    /** Live analyzer socket. */
    analyzer: false,
    /** Round and win telemetry. */
    telemetry: false,
    /** On-chain cooldown check and stream through the API. */
    cooldownApi: false,
    /** Link scan before opening casino-looking URLs. */
    linkScan: false,
    /** Lounge chat panel on casino tabs (activity.tiltcheck.me does not resolve). */
    lounge: false,
    /**
     * Opt-in anonymous beta counts (beta-telemetry.ts) to WORKER_ROUTES.BETA_COUNTS.
     * On at build time so sending works once a user opts in; the Settings
     * toggle stays off by default and nothing is counted or sent before it.
     */
    betaTelemetry: true,
});

export type BackendFeature = BackendFeatureName;

export function isBackendFeatureEnabled(feature: BackendFeature): boolean {
    return BACKEND_FEATURES[feature] === true;
}

export function getWorkerEndpoint(route: string): string {
    const normalizedPath = route.startsWith('/') ? route : `/${route}`;
    return `${normalizeBaseUrl(EXT_CONFIG.WORKER_API_URL)}${normalizedPath}`;
}

/**
 * Where opt-in beta counts are POSTed: a worker path (resolved against
 * WORKER_API_URL) or a full https URL. Empty means the sender stays a stub.
 */
export const BETA_TELEMETRY_ENDPOINT: string = WORKER_ROUTES.BETA_COUNTS;

/**
 * Page Chrome opens when an opted-in user removes the extension (counts
 * removals; only ?v=<version> is added). Empty means no uninstall page.
 */
export const BETA_UNINSTALL_URL = '';

/**
 * Feedback: signed-in users post to WORKER_ROUTES.SUPPORT (the worker relays
 * it to staff, so no Discord webhook lives in the extension). Signed-out users
 * see FEEDBACK_FALLBACK_URL as a link when it is set (for example a Discord
 * invite or a form). Empty means the button asks them to sign in.
 */
export const FEEDBACK_FALLBACK_URL = '';
export const FEEDBACK_MAX_LENGTH = 1000;

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
 * Generate the direct Discord OAuth URL using the unified ecosystem client ID and callback
 */
export function getDirectDiscordOAuthUrl(nonce?: string): string {
    const n = nonce || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    const params = new URLSearchParams({
        client_id: EXT_CONFIG.DISCORD_CLIENT_ID,
        response_type: 'token',
        scope: 'identify',
        redirect_uri: EXT_CONFIG.DISCORD_REDIRECT_URI,
        state: `h.${n}`,
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
