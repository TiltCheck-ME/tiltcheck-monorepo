/**
 * Vercel Serverless Function: Vault Balance
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
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Return mock balance (replace with Supabase query)
    return res.status(200).json({
      balance: 0,
      locked: false,
      lock_duration: null
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
