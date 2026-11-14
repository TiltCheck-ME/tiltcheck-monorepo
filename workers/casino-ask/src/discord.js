// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * /ask for the TiltCheck Discord app, served over HTTP interactions (no gateway bot needed).
 * Discord signs every request; we check it against DISCORD_PUBLIC_KEY before anything else.
 */

export const ASK_COMMAND = {
  name: 'ask',
  type: 1,
  description: "Ask about a casino's terms. Answers come from its own pages and TiltCheck's records.",
  dm_permission: true,
  options: [
    {
      type: 3,
      name: 'question',
      description: 'For example: How long does Acebet take to redeem?',
      required: true,
      max_length: 300,
    },
  ],
};

function hexToBytes(hex) {
  const clean = String(hex || '').trim();
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Ed25519 check of X-Signature-Ed25519 over timestamp + raw body. */
export async function verifyDiscordRequest(publicKeyHex, signatureHex, timestamp, rawBody) {
  const key = hexToBytes(publicKeyHex);
  const sig = hexToBytes(signatureHex);
  if (!key || key.length !== 32 || !sig || sig.length !== 64 || !timestamp) return false;
  try {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, cryptoKey, sig, new TextEncoder().encode(timestamp + rawBody));
  } catch {
    return false;
  }
}

/** Discord message text for an answer: the answer, then its links (angle brackets stop link previews). */
export function formatForDiscord(question, result) {
  const lines = [`> ${String(question).replace(/\s+/g, ' ').slice(0, 300)}`, result.answer];
  if (result.nearest) lines.push(`Closest thing on record: ${result.nearest}`);
  const links = result.sources && result.sources.length ? result.sources : [];
  if (links.length) {
    lines.push('Source' + (links.length > 1 ? 's' : '') + ':');
    for (const s of links) lines.push(`- [${s.title.replace(/[[\]]/g, '')}](<${s.url}>)`);
  } else if (result.checked && result.checked.length) {
    lines.push('Checked:');
    for (const s of result.checked.slice(0, 5)) lines.push(`- [${s.title.replace(/[[\]]/g, '')}](<${s.url}>)`);
  }
  let text = lines.join('\n');
  if (text.length > 1900) text = text.slice(0, 1897) + '...';
  return text;
}

function optionValue(data, name) {
  const opt = (data && data.options ? data.options : []).find((o) => o.name === name);
  return opt ? String(opt.value || '') : '';
}

/**
 * @param {object} body parsed interaction
 * @param {{ env:object, waitUntil:(p:Promise<any>)=>void, answer:(q:string)=>Promise<object>, allow:(key:string)=>Promise<boolean>, fetchImpl?:Function }} deps
 * @returns {Promise<object>} the immediate interaction response
 */
export async function handleInteraction(body, deps) {
  const { waitUntil, answer, allow, fetchImpl = fetch } = deps;
  if (body.type === 1) return { type: 1 };
  // The app's Activity entry point (/launch, command type 4): hand it back to Discord so the
  // Touch Grass Activity keeps launching now that interactions come to this worker.
  if (body.type === 2 && body.data && body.data.type === 4) return { type: 12 };
  if (body.type !== 2 || !body.data || body.data.name !== 'ask') {
    return { type: 4, data: { content: "That command isn't running right now. Try /ask, or see https://tiltcheck.me", flags: 64 } };
  }
  const user = (body.member && body.member.user) || body.user || {};
  const question = optionValue(body.data, 'question').trim();
  if (!question) return { type: 4, data: { content: 'Add a question, like: How long does Acebet take to redeem?', flags: 64 } };
  if (!(await allow(`discord:${user.id || 'anon'}`))) {
    return { type: 4, data: { content: 'Slow down. Try again in a minute.', flags: 64 } };
  }
  const url = `https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`;
  waitUntil(
    (async () => {
      let content;
      try {
        content = formatForDiscord(question, await answer(question));
      } catch {
        content = 'The answer service did not respond. Try again in a minute.';
      }
      await fetchImpl(url, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, allowed_mentions: { parse: [] }, flags: 4 }),
      });
    })(),
  );
  return { type: 5 };
}
