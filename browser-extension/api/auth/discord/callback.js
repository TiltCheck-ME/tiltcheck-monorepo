/**
 * Vercel Serverless Function: Discord OAuth Callback
 */

import { createClient } from '@supabase/supabase-js';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
}

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('<h1>Error: No authorization code</h1>');
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `https://${req.headers.host}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    return res.status(500).send('<h1>Error: Discord not configured</h1>');
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const { access_token } = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const discordUser = await userResponse.json();
    const userId = `discord_${discordUser.id}`;
    const sessionToken = `tk_${Math.random().toString(36).substring(2)}`;

    // Create or update user
    if (supabase) {
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          username: discordUser.username,
          discord_id: discordUser.id,
          tier: 'free'
        });

      if (upsertError) console.error('Supabase upsert error:', upsertError);

      const { error: vaultError } = await supabase
        .from('vaults')
        .upsert({ user_id: userId, balance: 0, locked: false });

      if (vaultError) console.error('Supabase vault error:', vaultError);
    }

    // Send token to extension via postMessage
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>TiltGuard Login Success</title></head>
        <body>
          <h1>✅ Login Successful!</h1>
          <p>Redirecting back to extension...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'TILTGUARD_AUTH_SUCCESS',
                token: '${sessionToken}',
                user: ${JSON.stringify({ id: userId, username: discordUser.username, tier: 'free' })}
              }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              document.body.innerHTML = '<h1>✅ Authenticated</h1><p>You can close this window.</p>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.status(500).send(`<h1>Error: ${error.message}</h1>`);
  }
}
