// api.js - Supabase + TiltCheck API helpers
// NOTE: Fill in SUPABASE_URL and SUPABASE_ANON_KEY and optionally gameplay table / RPC names.

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'; // <- replace
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // <- replace (store securely later)

// Storage keys
const STORAGE_KEYS = {
  supabaseSession: 'supabaseSession', // {access_token, refresh_token, expires_at, user}
  eventQueue: 'gameplayEventQueue'
};

// Fetch wrapper with auth
async function supabaseFetch(path, opts = {}) {
  const session = await getSession();
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...opts.headers
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers });
  if (res.status === 401) {
    const refreshed = await refreshSession(session);
    if (refreshed) return supabaseFetch(path, opts); // retry once
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return res.json();
}

// Session management
async function getSession() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.supabaseSession], data => {
      resolve(data[STORAGE_KEYS.supabaseSession] || null);
    });
  });
}

async function setSession(session) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.supabaseSession]: session }, resolve);
  });
}

// Refresh session via Supabase auth endpoint using refresh_token
async function refreshSession(session) {
  if (!session?.refresh_token) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!res.ok) return false;
    const newSession = await res.json();
    await setSession(newSession);
    return true;
  } catch (e) {
    console.warn('Supabase refresh failed', e);
    return false;
  }
}

// Launch Discord OAuth via Supabase using chrome.identity
async function startDiscordLogin() {
  // Build authorize URL (PKCE optional — simplified here)
  const redirectUrl = chrome.identity.getRedirectURL('supabase');
  const providerUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectUrl)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: providerUrl, interactive: true }, async responseUrl => {
      if (chrome.runtime.lastError || !responseUrl) {
        return reject(new Error(chrome.runtime.lastError?.message || 'Login failed'));
      }
      // Supabase returns access token in fragment (#access_token=...)
      const parsed = new URL(responseUrl.replace('#', '?')); // convert fragment to query
      const access_token = parsed.searchParams.get('access_token');
      const refresh_token = parsed.searchParams.get('refresh_token');
      const expires_in = parsed.searchParams.get('expires_in');
      const token_type = parsed.searchParams.get('token_type');

      if (!access_token) return reject(new Error('No access token in redirect'));

      const session = {
        access_token,
        refresh_token,
        expires_at: Date.now() + (parseInt(expires_in || '3600', 10) * 1000),
        token_type
      };
      await setSession(session);
      resolve(session);
    });
  });
}

// Gameplay Event Queue
async function enqueueEvent(evt) {
  const queue = await getQueue();
  queue.push({ ...evt, ts: Date.now() });
  // Cap queue length
  if (queue.length > 200) queue.splice(0, queue.length - 200);
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.eventQueue]: queue }, resolve);
  });
}

async function getQueue() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.eventQueue], data => {
      resolve(data[STORAGE_KEYS.eventQueue] || []);
    });
  });
}

async function flushQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return { flushed: 0 };
  try {
    // Example: insert into Postgres via REST table gameplay_events
    const res = await supabaseFetch('/rest/v1/gameplay_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(queue.map(e => ({
        event_type: e.type,
        amount: e.amount || null,
        balance: e.balance || null,
        metadata: e.metadata || {},
        occurred_at: new Date(e.ts).toISOString()
      })))
    });
    // Clear queue after successful send
    await new Promise(resolve => chrome.storage.local.set({ [STORAGE_KEYS.eventQueue]: [] }, resolve));
    return { flushed: queue.length };
  } catch (e) {
    console.warn('Flush failed, will retry later', e.message);
    return { flushed: 0, error: e.message };
  }
}

// Periodic flusher (called from background)
function startAutoFlush(intervalMs = 5000) {
  setInterval(() => flushQueue(), intervalMs);
}

// Export to window for other scripts
window.TiltAPI = {
  startDiscordLogin,
  getSession,
  enqueueEvent,
  flushQueue,
  startAutoFlush,
  supabaseFetch
};
