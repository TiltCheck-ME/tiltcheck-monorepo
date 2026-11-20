// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// One-time: generate a VAPID key pair and store it as Worker secrets VAPID_PUBLIC / VAPID_PRIVATE.
// The private key goes straight to Cloudflare and is never printed or written to disk.
// Refuses to run if VAPID_PUBLIC already exists (rotating keys silently breaks every subscription).
//   CLOUDFLARE_API_TOKEN=... node scripts/set-vapid.mjs            # real
//   node scripts/set-vapid.mjs --dry-run                           # generate + self-check only
const ACCOUNT = '6604734f6224c90d45b3d817f9dfab23', SCRIPT = 'collectclock-api';
const dry = process.argv.includes('--dry-run');
const b64u = b => Buffer.from(b).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
const priv = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d;
// self-check: the stored form re-imports and signs
const { vapidAuth } = await import('../src/push.js');
const h = await vapidAuth('https://web.push.apple.com/x', { VAPID_PUBLIC: pub, VAPID_PRIVATE: priv });
if (!/^vapid t=.+\..+\..+, k=/.test(h)) throw new Error('self-check failed');
if (dry) { console.log(`dry run ok: public key ${pub.length} chars, private key ${priv.length} chars (not shown)`); process.exit(0); }
const tok = process.env.CLOUDFLARE_API_TOKEN; if (!tok) throw new Error('CLOUDFLARE_API_TOKEN not set');
const api = (p, init = {}) => fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}${p}`, { ...init, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', ...(init.headers || {}) } }).then(r => r.json());
const have = await api('/secrets');
if (!have.success) throw new Error('could not list secrets: ' + JSON.stringify(have.errors));
if (have.result.some(s => s.name === 'VAPID_PUBLIC' || s.name === 'VAPID_PRIVATE')) { console.log('VAPID secrets already exist; not touching them.'); process.exit(0); }
for (const [name, text] of [['VAPID_PRIVATE', priv], ['VAPID_PUBLIC', pub]]) {
  const r = await api('/secrets', { method: 'PUT', body: JSON.stringify({ name, text, type: 'secret_text' }) });
  console.log(name, r.success ? 'stored' : 'FAILED ' + JSON.stringify(r.errors));
  if (!r.success) process.exit(1);
}
console.log('VAPID public key (safe to share):', pub);
