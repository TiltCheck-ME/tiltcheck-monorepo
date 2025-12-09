/**
 * Admin Panel: Game Archive Upload & AI Pattern Recognition
 * Personal gambling data analysis with AI insights
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SupabaseClient } from '@supabase/supabase-js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

interface GameSession {
  timestamp: string;
  game_type: string;
  bet_amount: number;
  win_amount: number;
  crypto_type: string;
  is_bonus_money: boolean;
  session_duration_minutes: number;
  casino: string;
  stake_bet_id?: string;
}

interface PatternInsight {
  pattern_type: string;
  description: string;
  confidence: number;
  data_points: number;
  recommendation?: string;
}

/**
 * Upload game archive CSV/JSON
 * POST /api/admin/game-archive/upload
 */
router.post('/upload', upload.single('archive'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const sessions = parseGameArchive(fileContent, req.file.mimetype);

    // Store in Supabase
    const supabase = req.app.get('supabase') as SupabaseClient;
    const { data, error } = await supabase
      .from('game_sessions')
      .insert(sessions.map(s => ({
        ...s,
        user_id: req.user?.id || 'admin', // From auth middleware
        uploaded_at: new Date().toISOString()
      })));

    if (error) throw error;

    res.json({
      success: true,
      sessions_uploaded: sessions.length,
      message: 'Game archive uploaded successfully'
    });
  } catch (err: any) {
    console.error('Game archive upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get AI pattern insights from game archive
 * GET /api/admin/game-archive/insights
 */
router.get('/insights', async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = req.app.get('supabase') as SupabaseClient;
    
    // Fetch all game sessions for this user
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', req.user?.id || 'admin')
      .order('timestamp', { ascending: true });

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      res.json({ insights: [], message: 'No data available' });
      return;
    }

    // Run AI pattern recognition
    const insights = await analyzePatterns(sessions);

    res.json({
      insights,
      total_sessions: sessions.length,
      date_range: {
        start: sessions[0].timestamp,
        end: sessions[sessions.length - 1].timestamp
      }
    });
  } catch (err: any) {
    console.error('Pattern analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Stake.com data via API (optional)
 * POST /api/admin/game-archive/stake-import
 */
router.post('/stake-import', async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey, startDate, endDate } = req.body;

    if (!apiKey) {
      res.status(400).json({ error: 'Stake API key required' });
      return;
    }

    // Fetch from Stake API
    const stakeData = await fetchStakeGameHistory(apiKey, startDate, endDate);
    
    // Convert to our format
    const sessions = stakeData.map((bet: any) => ({
      timestamp: bet.createdAt,
      game_type: bet.game?.name || 'unknown',
      bet_amount: bet.amount,
      win_amount: bet.payout || 0,
      crypto_type: bet.currency,
      is_bonus_money: bet.isBonus || false,
      session_duration_minutes: 0, // Stake doesn't track this
      casino: 'stake.com',
      stake_bet_id: bet.id
    }));

    // Store in Supabase
    const supabase = req.app.get('supabase') as SupabaseClient;
    const { error } = await supabase
      .from('game_sessions')
      .insert(sessions.map((s: GameSession) => ({
        ...s,
        user_id: req.user?.id || 'admin',
        uploaded_at: new Date().toISOString()
      })));

    if (error) throw error;

    res.json({
      success: true,
      sessions_imported: sessions.length,
      source: 'stake.com'
    });
  } catch (err: any) {
    console.error('Stake import error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Parse uploaded game archive file (CSV or JSON)
 */
function parseGameArchive(content: string, mimeType: string): GameSession[] {
  if (mimeType.includes('json')) {
    return JSON.parse(content);
  }

  // Parse CSV
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.trim());
      const session: any = {};
      
      headers.forEach((header, i) => {
        const value = values[i];
        
        // Auto-detect field types
        if (header.includes('timestamp') || header.includes('date')) {
          session.timestamp = value;
        } else if (header.includes('game') || header.includes('type')) {
          session.game_type = value;
        } else if (header.includes('bet') || header.includes('wager')) {
          session.bet_amount = parseFloat(value) || 0;
        } else if (header.includes('win') || header.includes('payout')) {
          session.win_amount = parseFloat(value) || 0;
        } else if (header.includes('crypto') || header.includes('currency')) {
          session.crypto_type = value;
        } else if (header.includes('bonus')) {
          session.is_bonus_money = value.toLowerCase() === 'true' || value === '1';
        } else if (header.includes('duration')) {
          session.session_duration_minutes = parseFloat(value) || 0;
        } else if (header.includes('casino')) {
          session.casino = value;
        }
      });

      return session as GameSession;
    });
}

/**
 * AI-powered pattern recognition
 * Analyzes time windows, crypto types, bonus vs deposit, etc.
 */
async function analyzePatterns(sessions: GameSession[]): Promise<PatternInsight[]> {
  const insights: PatternInsight[] = [];

  // 1. Time of day patterns
  const hourlyStats = analyzeTimeOfDay(sessions);
  if (hourlyStats.bestHour) {
    insights.push({
      pattern_type: 'time_of_day',
      description: `Best winning hour: ${hourlyStats.bestHour}:00 (${hourlyStats.winRate}% win rate)`,
      confidence: hourlyStats.confidence,
      data_points: hourlyStats.sessions,
      recommendation: `Consider playing between ${hourlyStats.bestHour}:00-${(hourlyStats.bestHour + 1) % 24}:00 for better odds`
    });
  }

  // 2. Day of week patterns
  const weekdayStats = analyzeDayOfWeek(sessions);
  if (weekdayStats.bestDay) {
    insights.push({
      pattern_type: 'day_of_week',
      description: `Best winning day: ${weekdayStats.bestDay} (${weekdayStats.winRate}% win rate)`,
      confidence: weekdayStats.confidence,
      data_points: weekdayStats.sessions,
      recommendation: `${weekdayStats.bestDay}s show better results in your history`
    });
  }

  // 3. Crypto type performance
  const cryptoStats = analyzeCryptoTypes(sessions);
  if (cryptoStats.bestCrypto) {
    insights.push({
      pattern_type: 'crypto_type',
      description: `Best performing crypto: ${cryptoStats.bestCrypto} (${cryptoStats.roi}% ROI)`,
      confidence: cryptoStats.confidence,
      data_points: cryptoStats.sessions,
      recommendation: `${cryptoStats.bestCrypto} has historically performed better for you`
    });
  }

  // 4. Bonus money vs deposited money
  const bonusStats = analyzeBonusVsDeposit(sessions);
  insights.push({
    pattern_type: 'bonus_vs_deposit',
    description: `Bonus money win rate: ${bonusStats.bonusWinRate}% vs Deposited: ${bonusStats.depositWinRate}%`,
    confidence: bonusStats.confidence,
    data_points: sessions.length,
    recommendation: bonusStats.bonusWinRate > bonusStats.depositWinRate 
      ? 'Bonus money shows better performance' 
      : 'Deposited money shows better performance'
  });

  // 5. Session duration patterns
  const durationStats = analyzeSessionDuration(sessions);
  if (durationStats.optimalDuration) {
    insights.push({
      pattern_type: 'session_duration',
      description: `Optimal session length: ${durationStats.optimalDuration} minutes`,
      confidence: durationStats.confidence,
      data_points: durationStats.sessions,
      recommendation: `Sessions around ${durationStats.optimalDuration} minutes show best results`
    });
  }

  // 6. Tilt detection (losing streaks)
  const tiltStats = detectTiltPatterns(sessions);
  if (tiltStats.detected) {
    insights.push({
      pattern_type: 'tilt_risk',
      description: `Tilt detected after ${tiltStats.streakLength} consecutive losses`,
      confidence: tiltStats.confidence,
      data_points: tiltStats.occurrences,
      recommendation: `⚠️ STOP after ${tiltStats.streakLength - 1} losses to avoid tilt`
    });
  }

  // 7. Game type performance
  const gameStats = analyzeGameTypes(sessions);
  if (gameStats.bestGame) {
    insights.push({
      pattern_type: 'game_type',
      description: `Best game: ${gameStats.bestGame} (${gameStats.roi}% ROI)`,
      confidence: gameStats.confidence,
      data_points: gameStats.sessions,
      recommendation: `Focus on ${gameStats.bestGame} for better returns`
    });
  }

  return insights;
}

// Helper analysis functions
function analyzeTimeOfDay(sessions: GameSession[]) {
  const hourlyData: { [hour: number]: { wins: number; total: number } } = {};
  
  sessions.forEach(s => {
    const hour = new Date(s.timestamp).getHours();
    if (!hourlyData[hour]) hourlyData[hour] = { wins: 0, total: 0 };
    hourlyData[hour].total++;
    if (s.win_amount > s.bet_amount) hourlyData[hour].wins++;
  });

  let bestHour = 0;
  let bestWinRate = 0;
  let bestSessions = 0;

  Object.entries(hourlyData).forEach(([hour, stats]) => {
    const winRate = (stats.wins / stats.total) * 100;
    if (winRate > bestWinRate && stats.total >= 10) { // Min 10 sessions
      bestWinRate = winRate;
      bestHour = parseInt(hour);
      bestSessions = stats.total;
    }
  });

  return {
    bestHour: bestSessions >= 10 ? bestHour : null,
    winRate: Math.round(bestWinRate),
    confidence: Math.min(bestSessions / 100, 1),
    sessions: bestSessions
  };
}

function analyzeDayOfWeek(sessions: GameSession[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayData: { [day: string]: { wins: number; total: number } } = {};
  
  sessions.forEach(s => {
    const day = days[new Date(s.timestamp).getDay()];
    if (!dayData[day]) dayData[day] = { wins: 0, total: 0 };
    dayData[day].total++;
    if (s.win_amount > s.bet_amount) dayData[day].wins++;
  });

  let bestDay = '';
  let bestWinRate = 0;
  let bestSessions = 0;

  Object.entries(dayData).forEach(([day, stats]) => {
    const winRate = (stats.wins / stats.total) * 100;
    if (winRate > bestWinRate && stats.total >= 5) {
      bestWinRate = winRate;
      bestDay = day;
      bestSessions = stats.total;
    }
  });

  return {
    bestDay: bestSessions >= 5 ? bestDay : null,
    winRate: Math.round(bestWinRate),
    confidence: Math.min(bestSessions / 50, 1),
    sessions: bestSessions
  };
}

function analyzeCryptoTypes(sessions: GameSession[]) {
  const cryptoData: { [crypto: string]: { profit: number; wagered: number; count: number } } = {};
  
  sessions.forEach(s => {
    if (!cryptoData[s.crypto_type]) {
      cryptoData[s.crypto_type] = { profit: 0, wagered: 0, count: 0 };
    }
    cryptoData[s.crypto_type].profit += (s.win_amount - s.bet_amount);
    cryptoData[s.crypto_type].wagered += s.bet_amount;
    cryptoData[s.crypto_type].count++;
  });

  let bestCrypto = '';
  let bestROI = -Infinity;
  let bestSessions = 0;

  Object.entries(cryptoData).forEach(([crypto, stats]) => {
    const roi = (stats.profit / stats.wagered) * 100;
    if (roi > bestROI && stats.count >= 10) {
      bestROI = roi;
      bestCrypto = crypto;
      bestSessions = stats.count;
    }
  });

  return {
    bestCrypto: bestSessions >= 10 ? bestCrypto : null,
    roi: Math.round(bestROI * 100) / 100,
    confidence: Math.min(bestSessions / 100, 1),
    sessions: bestSessions
  };
}

function analyzeBonusVsDeposit(sessions: GameSession[]) {
  const bonusWins = sessions.filter(s => s.is_bonus_money && s.win_amount > s.bet_amount).length;
  const bonusTotal = sessions.filter(s => s.is_bonus_money).length;
  const depositWins = sessions.filter(s => !s.is_bonus_money && s.win_amount > s.bet_amount).length;
  const depositTotal = sessions.filter(s => !s.is_bonus_money).length;

  return {
    bonusWinRate: bonusTotal > 0 ? Math.round((bonusWins / bonusTotal) * 100) : 0,
    depositWinRate: depositTotal > 0 ? Math.round((depositWins / depositTotal) * 100) : 0,
    confidence: Math.min((bonusTotal + depositTotal) / 200, 1)
  };
}

function analyzeSessionDuration(sessions: GameSession[]) {
  const validSessions = sessions.filter(s => s.session_duration_minutes > 0);
  if (validSessions.length < 10) return { optimalDuration: null, confidence: 0, sessions: 0 };

  // Group by duration buckets
  const buckets: { [range: string]: { wins: number; total: number } } = {};
  validSessions.forEach(s => {
    const bucket = Math.floor(s.session_duration_minutes / 15) * 15; // 15-min buckets
    const key = `${bucket}-${bucket + 15}`;
    if (!buckets[key]) buckets[key] = { wins: 0, total: 0 };
    buckets[key].total++;
    if (s.win_amount > s.bet_amount) buckets[key].wins++;
  });

  let bestBucket = '';
  let bestWinRate = 0;
  let bestCount = 0;

  Object.entries(buckets).forEach(([range, stats]) => {
    const winRate = (stats.wins / stats.total) * 100;
    if (winRate > bestWinRate && stats.total >= 5) {
      bestWinRate = winRate;
      bestBucket = range;
      bestCount = stats.total;
    }
  });

  const optimalDuration = bestBucket ? parseInt(bestBucket.split('-')[0]) + 7 : null;

  return {
    optimalDuration,
    confidence: Math.min(bestCount / 50, 1),
    sessions: bestCount
  };
}

function detectTiltPatterns(sessions: GameSession[]) {
  let maxStreak = 0;
  let currentStreak = 0;
  let streakOccurrences = 0;

  sessions.forEach(s => {
    if (s.win_amount < s.bet_amount) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      if (currentStreak >= 5) streakOccurrences++;
      currentStreak = 0;
    }
  });

  return {
    detected: maxStreak >= 5,
    streakLength: maxStreak,
    occurrences: streakOccurrences,
    confidence: Math.min(sessions.length / 100, 1)
  };
}

function analyzeGameTypes(sessions: GameSession[]) {
  const gameData: { [game: string]: { profit: number; wagered: number; count: number } } = {};
  
  sessions.forEach(s => {
    if (!gameData[s.game_type]) {
      gameData[s.game_type] = { profit: 0, wagered: 0, count: 0 };
    }
    gameData[s.game_type].profit += (s.win_amount - s.bet_amount);
    gameData[s.game_type].wagered += s.bet_amount;
    gameData[s.game_type].count++;
  });

  let bestGame = '';
  let bestROI = -Infinity;
  let bestSessions = 0;

  Object.entries(gameData).forEach(([game, stats]) => {
    const roi = (stats.profit / stats.wagered) * 100;
    if (roi > bestROI && stats.count >= 10) {
      bestROI = roi;
      bestGame = game;
      bestSessions = stats.count;
    }
  });

  return {
    bestGame: bestSessions >= 10 ? bestGame : null,
    roi: Math.round(bestROI * 100) / 100,
    confidence: Math.min(bestSessions / 100, 1),
    sessions: bestSessions
  };
}

/**
 * Fetch game history from Stake.com API
 */
async function fetchStakeGameHistory(apiKey: string, startDate: string, endDate: string) {
  // Stake API endpoint (example - check Stake docs for actual endpoint)
  const response = await fetch('https://api.stake.com/v1/bets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      startDate,
      endDate,
      limit: 10000
    })
  });

  if (!response.ok) {
    throw new Error(`Stake API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.bets || [];
}

export default router;
