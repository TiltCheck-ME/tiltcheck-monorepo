// THE DEGEN LAWS: No emojis. Blunt tone. Math maths.
// This script handles Discord OAuth. It's for identifying you, not for holding your damn keys.

const DISCORD_CLIENT_ID = '1342618997321564344'; // <<< REPLACE THIS WITH YOUR ACTUAL DISCORD CLIENT ID
// You can find this in your Discord Developer Portal under your application's OAuth2 -> General tab.
// Make sure to add `https://<YOUR_EXTENSION_ID>.chromiumapp.org/discord` to your Redirects list.

const DISCORD_REDIRECT_URI = chrome.identity.getRedirectURL('discord'); // Chrome handles this for you. Don't mess it up.
const DISCORD_SCOPES = ['identify', 'email', 'guilds']; // Just enough to know who you are. No more.

interface AuthSession {
    accessToken: string;
    refreshToken?: string; // Not used in implicit grant, but good for future.
    expiresAt: number; // Unix timestamp for when the token bites the dust.
    userId?: string; // Discord user ID, if we can get it.
    username?: string; // Discord username, for display.
}

const STORAGE_KEY = 'tiltcheck_auth_session';

/**
 * Initiates the Discord OAuth flow. Get ready to click.
 * @returns Promise<AuthSession | null> The authenticated session, or null if it failed.
 */
async function login(): Promise<AuthSession | null> {
    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.searchParams.append('client_id', DISCORD_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'token'); // Implicit grant flow for extensions. No backend needed for token exchange.
    authUrl.searchParams.append('redirect_uri', DISCORD_REDIRECT_URI);
    authUrl.searchParams.append('scope', DISCORD_SCOPES.join(' '));
    authUrl.searchParams.append('prompt', 'none'); // Don't annoy the user if they're already logged in.

    try {
        const redirectUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl.toString(),
            interactive: true, // Make the user actually do something.
        });

        if (!redirectUrl) {
            console.error('OAuth flow got nothing. User probably bailed.');
            return null;
        }

        const params = new URLSearchParams(redirectUrl.split('#')[1]); // Discord uses hash fragment for implicit grant.
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');

        if (!accessToken || !expiresIn) {
            console.error('No token or expiry in redirect. Something went wrong, degen.');
            return null;
        }

        const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000; // Calculate expiry time.
        const session: AuthSession = {
            accessToken,
            expiresAt,
        };

        // Optionally fetch user info to get Discord ID and username.
        try {
            const userInfoResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (userInfoResponse.ok) {
                const userInfo = await userInfoResponse.json();
                session.userId = userInfo.id;
                session.username = userInfo.username;
                console.log(`Authenticated Discord user: ${userInfo.username} (${userInfo.id}).`);
            } else {
                console.warn('Failed to fetch Discord user info. Token might be bad, or Discord is being difficult.');
            }
        } catch (e) {
            console.warn('Error fetching Discord user info:', e);
        }

        await saveSession(session);
        console.log('Discord session saved. You are now identified.');
        return session;

    } catch (error) {
        console.error('Discord OAuth flow failed:', error);
        return null;
    }
}

/**
 * Retrieves the current authentication session. If it's expired, it's garbage.
 * @returns Promise<AuthSession | null> The active session, or null if none/expired.
 */
async function getSession(): Promise<AuthSession | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const session: AuthSession | undefined = result[STORAGE_KEY];

    if (!session || !session.accessToken || session.expiresAt <= Date.now()) {
        console.log('No active Discord session found, or it expired. Get logged in, degen.');
        return null;
    }
    return session;
}

/**
 * Saves the authentication session. Don't lose it.
 * @param session The session to save.
 */
async function saveSession(session: AuthSession): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

/**
 * Clears the current authentication session. You're on your own now.
 */
async function logout(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
    console.log('Discord session cleared. Logged out.');
}

// Export functions for direct use in background script if needed.
export { login, getSession, logout };