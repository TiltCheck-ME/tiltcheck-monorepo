<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 -->

# Discord OAuth for the Chrome extension

The extension cannot host a public HTTPS redirect endpoint. Discord therefore redirects to the **TiltCheck API** (`/auth/discord/callback`). The API completes the exchange, then `postMessage` hands the JWT back to `auth-bridge.html` (extension origin), which writes `chrome.storage.local` for the sidebar to pick up.

Made for Degens. By Degens.

---

## Discord Developer Portal redirect URIs

Register these **exact** redirect URLs on the Discord application used by TiltCheck (same client ID as `DISCORD_CLIENT_ID` / `TILT_DISCORD_CLIENT_ID` in the API):

| Environment | Redirect URI |
| :--- | :--- |
| Production | `https://api.tiltcheck.me/auth/discord/callback` |
| Local API dev | `http://localhost:8080/auth/discord/callback` (only if you run the API on that host/port) |
| Local API dev | `http://127.0.0.1:8080/auth/discord/callback` (optional mirror of the above) |

**Risk note:** Do not add arbitrary redirect URIs. Discord will accept whatever is listed; keep the list minimal so stolen authorization codes cannot be exchanged from random hosts.

**Rollback note:** If extension login breaks after a deploy, verify the API still uses the same callback path and that the Discord app still lists that URI.

---

## End-to-end flow (clean profile)

1. User clicks **Connect Discord** in the sidebar. Content script asks the service worker to open `auth-bridge.html?authUrl=...`.
2. `auth-bridge` opens a **popup** to `GET /auth/discord/login?source=extension&opener_origin=chrome-extension://<id>&ext_id=<id>`.
3. API redirects to Discord; user approves or denies.
4. Discord redirects to `.../auth/discord/callback` on the API with `code` and `state`.
5. On success, the callback page runs in the **popup** and `postMessage`s `{ type: 'discord-auth', token, user }` to `window.opener` (the `auth-bridge` tab). Target origin is the trusted `chrome-extension://` origin from cookies/state.
6. `auth-bridge` writes `authToken` / `userData` to `chrome.storage.local` and closes.
7. The sidebar **polls** storage (500 ms) for up to **5 minutes** until tokens appear, or until an error marker / timeout fires.

---

## Failure handling

| Case | Behavior |
| :--- | :--- |
| User denies Discord (`access_denied`) | API returns an HTML error page in the popup and `postMessage`s `{ type: 'discord-auth-error', ... }` to `auth-bridge` when the extension opener can be resolved. Sidebar reads `discord_oauth_error` from storage and exits the connecting state immediately. |
| Invalid or expired OAuth state | Same HTML + optional `discord-auth-error` handoff for extension-shaped callbacks (cookie `oauth_source=extension` or `ext_` state prefix). Otherwise JSON for pure web callbacks. |
| Poll timeout (5 min) | Sidebar shows a timeout message and clears the connecting spinner. |
| Bridge tab blocked | `open_auth_bridge` returns `success: false`; sidebar tells the user to check popup blockers. |

---

## Local development

- Point `EXT_CONFIG.API_BASE_URL` in `src/config.ts` at your local API if needed, or pass a dev API URL only after updating `background.js` `isAllowedAuthUrl` and `auth-bridge.js` origin checks to allow that host.
- The packaged extension in production always targets `https://api.tiltcheck.me` unless you change `config.ts` for a dev build.

---

## Related files

- `src/sidebar/auth.ts` — login flow, polling, timeout
- `src/auth-bridge.js` / `src/auth-bridge.html` — popup opener and `postMessage` receiver
- `src/background.js` — opens the bridge tab; validates auth URL origin
- `apps/api/src/routes/auth.ts` — Discord login, callback, extension HTML errors
