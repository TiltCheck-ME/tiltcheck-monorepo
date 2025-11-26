/**
 * Vercel Serverless Function: Dashboard Data
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Mock dashboard data (replace with Supabase queries in production)
  const data = {
    trust_score: 72,
    total_sessions: 145,
    total_wagered: 12450.00,
    total_won: 11890.50,
    pnl: -559.50,
    avg_session_time: 47,
    last_played: new Date().toISOString(),
    streak_days: 3,
    warnings: ['High tilt detected in last session'],
    achievements: ['First Week', 'Responsible Player']
  };

  res.status(200).json(data);
}
