/**
 * Vercel Serverless Function: Discord OAuth Redirect
 */

export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = `${process.env.VERCEL_URL || req.headers.host}/api/auth/discord/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Discord not configured' });
  }

  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
  
  res.redirect(authUrl);
}
