/**
 * Vercel Serverless Function: Guest Authentication
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
  // CORS headers for browser extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = `guest_${Date.now()}`;
  const sessionToken = `tk_${Math.random().toString(36).substring(2)}`;

  try {
    if (supabase) {
      // Use Supabase database
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({ id: userId, username: 'Guest', tier: 'free' })
        .select()
        .single();

      if (userError) throw userError;

      const { error: vaultError } = await supabase
        .from('vaults')
        .insert({ user_id: userId, balance: 0, locked: false });

      if (vaultError) throw vaultError;

      return res.status(200).json({
        token: sessionToken,
        user: { id: userId, username: 'Guest', tier: 'free' }
      });
    } else {
      // In-memory fallback (development only)
      return res.status(200).json({
        token: sessionToken,
        user: { id: userId, username: 'Guest', tier: 'free' }
      });
    }
  } catch (error) {
    console.error('Guest auth error:', error);
    return res.status(500).json({ error: 'Failed to create guest session' });
  }
}
