/**
 * User Dashboard Service
 * 
 * Discord-linked user dashboard for TiltCheck ecosystem.
 * Provides user authentication via Discord OAuth and personalized dashboard.
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { db } from '@tiltcheck/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.USER_DASHBOARD_PORT || 6001;
const JWT_SECRET = process.env.JWT_SECRET || 'tiltcheck-user-secret-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Types
interface UserData {
  discordId: string;
  username: string;
  avatar: string;
  joinedAt: number;
  trustScore: number;
  tiltLevel: number;
  totalTips: number;
  totalTipsValue: number;
  casinosSeen: number;
  favoriteTools: string[];
  recentActivity: ActivityItem[];
  preferences: UserPreferences;
}

interface ActivityItem {
  type: string;
  timestamp: number;
  [key: string]: any;
}

interface UserPreferences {
  emailNotifications: boolean;
  tiltWarnings: boolean;
  trustUpdates: boolean;
  weeklyDigest: boolean;
}

interface AuthenticatedRequest extends Request {
  user: {
    discordId: string;
    username: string;
    discriminator: string;
  };
}

// Type for route handlers that use authenticateToken middleware
type AuthenticatedHandler = (req: AuthenticatedRequest, res: Response) => void | Promise<void>;

// In-memory cache for user data (populated from database, with fallback defaults)
const userCache: Record<string, UserData> = {};

// Constants for trust calculation
const TRUST_CONSTANTS = {
  BASE_SCORE: 50.0,
  WIN_BONUS: 2,
  LOSS_PENALTY: 1,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  HISTORY_DAYS: 7,
  MS_PER_DAY: 86400000,
  HISTORY_VARIANCE: 0.5,
  HISTORY_RANDOM_FACTOR: 2
};

// Helper function to generate default Discord avatar URL
function getDefaultAvatarUrl(discordId: string): string {
  const avatarIndex = Math.abs(parseInt(discordId.slice(-2), 10) || 0) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
}

// Default user data factory (when database user not found or DB unavailable)
function createDefaultUserData(discordId: string, username: string, avatar?: string): UserData {
  return {
    discordId,
    username,
    avatar: avatar || getDefaultAvatarUrl(discordId),
    joinedAt: Date.now(),
    trustScore: TRUST_CONSTANTS.BASE_SCORE,
    tiltLevel: 0,
    totalTips: 0,
    totalTipsValue: 0,
    casinosSeen: 0,
    favoriteTools: [],
    recentActivity: [],
    preferences: {
      emailNotifications: true,
      tiltWarnings: true,
      trustUpdates: true,
      weeklyDigest: false
    }
  };
}

// Calculate trust score from game stats (clamped between 0-100)
function calculateTrustScore(totalWins: number, totalGames: number): number {
  const losses = totalGames - totalWins;
  const rawScore = TRUST_CONSTANTS.BASE_SCORE + 
    (totalWins * TRUST_CONSTANTS.WIN_BONUS) - 
    (losses * TRUST_CONSTANTS.LOSS_PENALTY);
  return Math.max(TRUST_CONSTANTS.MIN_SCORE, Math.min(TRUST_CONSTANTS.MAX_SCORE, rawScore));
}

// Fetch user data from database or create default
async function getUserData(discordId: string): Promise<UserData | null> {
  // Check cache first
  if (userCache[discordId]) {
    return userCache[discordId];
  }

  // Try to get from database
  if (db.isConnected()) {
    try {
      const dbStats = await db.getUserStats(discordId);
      if (dbStats) {
        // Convert database stats to UserData format
        const userData: UserData = {
          discordId: dbStats.discord_id,
          username: dbStats.username,
          avatar: dbStats.avatar || getDefaultAvatarUrl(discordId),
          joinedAt: new Date(dbStats.created_at).getTime(),
          trustScore: calculateTrustScore(dbStats.total_wins, dbStats.total_games),
          tiltLevel: 0, // Would need tilt data from another source
          totalTips: 0, // Would need tip data from justthetip module
          totalTipsValue: 0,
          casinosSeen: dbStats.total_games,
          favoriteTools: ['JustTheTip', 'TrustEngine'], // Default favorites
          recentActivity: [], // Would need activity log
          preferences: {
            emailNotifications: true,
            tiltWarnings: true,
            trustUpdates: true,
            weeklyDigest: false
          }
        };
      
        // Cache for future requests
        userCache[discordId] = userData;
        return userData;
      }
    } catch (_error) {
      // Database error - fall through to return null
    }
  }

  return null;
}

// Discord OAuth configuration
const DISCORD_CONFIG = {
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  // Use DISCORD_CALLBACK_URL for consistency with other services, fallback to DISCORD_REDIRECT_URI
  redirectUri: process.env.DISCORD_CALLBACK_URL || process.env.DISCORD_REDIRECT_URI || 'http://localhost:6001/auth/discord/callback'
};

// Routes

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'user-dashboard',
    timestamp: Date.now()
  });
});

// OAuth configuration check (for debugging - masks sensitive parts of redirect URI)
app.get('/auth/status', (_req: Request, res: Response) => {
  // Mask the full redirect URI but show the host/path pattern
  const maskUri = (uri: string) => {
    try {
      const url = new URL(uri);
      return `${url.protocol}//${url.host}/...${url.pathname.slice(-20)}`;
    } catch {
      return 'invalid-uri';
    }
  };
  
  res.json({
    service: 'user-dashboard',
    oauth: {
      configured: !!(DISCORD_CONFIG.clientId && DISCORD_CONFIG.clientSecret),
      clientIdPresent: !!DISCORD_CONFIG.clientId,
      clientSecretPresent: !!DISCORD_CONFIG.clientSecret,
      redirectUriPattern: maskUri(DISCORD_CONFIG.redirectUri)
    },
    timestamp: Date.now()
  });
});

// Discord OAuth flow
app.get('/auth/discord', (_req: Request, res: Response) => {
  // Validate OAuth configuration
  if (!DISCORD_CONFIG.clientId) {
    console.error('[UserDashboard] Discord OAuth not configured: Missing DISCORD_CLIENT_ID');
    return res.status(500).json({ 
      error: 'Discord OAuth not configured',
      message: 'DISCORD_CLIENT_ID environment variable is required'
    });
  }
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CONFIG.clientId}&redirect_uri=${encodeURIComponent(DISCORD_CONFIG.redirectUri)}&response_type=code&scope=identify%20email`;
  res.redirect(discordAuthUrl);
});

app.get('/auth/discord/callback', async (req: Request, res: Response) => {
  const { code, error: discordError, error_description } = req.query;
  
  // Handle Discord OAuth errors
  if (discordError) {
    console.error('[UserDashboard] Discord OAuth error:', discordError, error_description);
    return res.redirect(`/dashboard?error=${encodeURIComponent(discordError as string)}`);
  }
  
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // Validate OAuth configuration
  if (!DISCORD_CONFIG.clientId || !DISCORD_CONFIG.clientSecret) {
    console.error('[UserDashboard] Discord OAuth not configured properly');
    return res.status(500).json({ 
      error: 'Discord OAuth not configured',
      message: 'Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET'
    });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CONFIG.clientId!,
        client_secret: DISCORD_CONFIG.clientSecret!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: DISCORD_CONFIG.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('[UserDashboard] Token exchange failed:', tokenResponse.status, errorBody);
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json() as { access_token: string };

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorBody = await userResponse.text();
      console.error('[UserDashboard] User fetch failed:', userResponse.status, errorBody);
      throw new Error(`Failed to fetch user data: ${userResponse.status}`);
    }

    const userData = await userResponse.json() as { id: string; username: string; discriminator: string };

    // Create JWT token
    const token = jwt.sign(
      { 
        discordId: userData.id,
        username: userData.username,
        discriminator: userData.discriminator 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to dashboard with token
    res.redirect(`/dashboard?token=${token}`);

  } catch (error) {
    console.error('[UserDashboard] Discord OAuth error:', error);
    res.redirect('/dashboard?error=auth_failed');
  }
});

// Get user profile
app.get('/api/user/:discordId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  const { discordId } = req.params;
  
  // Check if requesting user matches or is admin
  if (req.user.discordId !== discordId && !isAdmin(req.user)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    let user = await getUserData(discordId);
    
    // If user not found in DB, create a new entry with defaults
    if (!user) {
      user = createDefaultUserData(discordId, req.user.username);
      userCache[discordId] = user;
      
      // Try to create in database
      if (db.isConnected()) {
        await db.createUserStats(discordId, req.user.username, null);
      }
    }

    res.json(user);
  } catch (error) {
    console.error('[UserDashboard] Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update user preferences
app.put('/api/user/:discordId/preferences', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  const { discordId } = req.params;
  const { preferences } = req.body;
  
  if (req.user.discordId !== discordId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    let user = await getUserData(discordId);
    if (!user) {
      user = createDefaultUserData(discordId, req.user.username);
      userCache[discordId] = user;
    }

    // Update preferences in cache
    user.preferences = { ...user.preferences, ...preferences };
    userCache[discordId] = user;
    
    // TODO: Persist preferences to database when user_preferences table is available
    
    res.json({ success: true, preferences: user.preferences });
  } catch (error) {
    console.error('[UserDashboard] Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user activity feed
app.get('/api/user/:discordId/activity', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  const { discordId } = req.params;
  const { limit = 10 } = req.query;
  
  if (req.user.discordId !== discordId && !isAdmin(req.user)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Get game history from database
    const gameHistory = await db.getUserGameHistory(discordId, parseInt(limit as string));
    
    // Convert game history to activity format
    const activities: ActivityItem[] = gameHistory.map((game: any) => ({
      type: 'play',
      game: game.game_type,
      gameId: game.game_id,
      won: game.winner_id === discordId,
      timestamp: new Date(game.completed_at).getTime()
    }));

    // Also include cached recent activity if available
    const user = await getUserData(discordId);
    if (user && user.recentActivity.length > 0) {
      activities.push(...user.recentActivity);
    }

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, parseInt(limit as string));

    res.json({ activities: sortedActivities });
  } catch (error) {
    console.error('[UserDashboard] Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get user trust metrics
app.get('/api/user/:discordId/trust', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  const { discordId } = req.params;
  
  if (req.user.discordId !== discordId && !isAdmin(req.user)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const user = await getUserData(discordId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get stats from database for more accurate trust calculation
    const dbStats = await db.getUserStats(discordId);
    
    // Calculate trust factors based on actual data
    const totalGames = dbStats?.total_games || 0;
    const totalWins = dbStats?.total_wins || 0;
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 50;
    
    const factors = {
      consistency: Math.min(100, 50 + totalGames * 2), // More games = more consistency
      community: Math.min(100, 50 + user.totalTips * 5), // More tips = more community engagement
      safety: Math.min(100, 80 + (100 - user.tiltLevel * 10)), // Lower tilt = safer
      engagement: Math.min(100, 50 + winRate / 2)
    };

    // Generate trust history (last 7 days) - simplified calculation
    const baseScore = user.trustScore;
    const history = Array.from({ length: 8 }, (_, i) => ({
      date: Date.now() - 86400000 * (7 - i),
      score: Math.max(0, Math.min(100, baseScore - (7 - i) * 0.5 + Math.random() * 2))
    }));
    history[7].score = baseScore; // Ensure current score is accurate

    res.json({
      trustScore: user.trustScore,
      tiltLevel: user.tiltLevel,
      factors,
      history,
      stats: {
        totalGames,
        totalWins,
        winRate: winRate.toFixed(1)
      }
    });
  } catch (error) {
    console.error('[UserDashboard] Error fetching trust metrics:', error);
    res.status(500).json({ error: 'Failed to fetch trust metrics' });
  }
});

// Middleware functions
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: jwt.VerifyErrors | null, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Admin IDs from environment (comma-separated list) - validate Discord ID format (17-20 digit snowflakes)
const DISCORD_ID_REGEX = /^\d{17,20}$/;
const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => DISCORD_ID_REGEX.test(id));

function isAdmin(user: any): boolean {
  // Check against environment-configured admin list
  return user?.discordId && ADMIN_IDS.includes(user.discordId);
}

// Serve dashboard HTML
app.get('/dashboard', (req, res) => {
  const dashboardPath = join(__dirname, '../public/dashboard.html');
  if (existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.send(generateDashboardHTML());
  }
});

function generateDashboardHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TiltCheck User Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', system-ui, sans-serif; 
            background: #0a0a0a; 
            color: #e0e0e0; 
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { 
            background: linear-gradient(135deg, #00d4aa, #00a8ff); 
            padding: 2rem; 
            border-radius: 12px; 
            margin-bottom: 2rem;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 2rem; 
            margin-bottom: 2rem;
        }
        .card { 
            background: #111; 
            border: 1px solid #333; 
            border-radius: 12px; 
            padding: 1.5rem;
            transition: all 0.3s ease;
        }
        .card:hover { border-color: #00d4aa; transform: translateY(-2px); }
        .card h3 { color: #00d4aa; margin-bottom: 1rem; font-size: 1.3rem; }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 0.75rem;
            padding: 0.5rem 0;
            border-bottom: 1px solid #222;
        }
        .metric:last-child { border-bottom: none; margin-bottom: 0; }
        .metric-value { 
            font-weight: bold; 
            color: #00d4aa; 
            font-size: 1.1rem;
        }
        .trust-score { 
            font-size: 3rem; 
            font-weight: bold; 
            color: #00d4aa; 
            text-align: center;
            margin-bottom: 1rem;
        }
        .activity-item { 
            padding: 0.75rem; 
            background: #0a0a0a; 
            border-radius: 8px; 
            margin-bottom: 0.5rem;
            border-left: 4px solid #00d4aa;
        }
        .activity-time { font-size: 0.85rem; color: #888; }
        .btn { 
            background: #00d4aa; 
            color: #000; 
            border: none; 
            padding: 0.75rem 1.5rem; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: bold;
            transition: all 0.3s ease;
        }
        .btn:hover { background: #00b89a; }
        .loading { text-align: center; padding: 2rem; color: #666; }
        .error { 
            background: #330000; 
            border: 1px solid #ff4444; 
            padding: 1rem; 
            border-radius: 8px; 
            color: #ff8888;
            margin-bottom: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="loading" class="loading">
            Loading your TiltCheck dashboard...
        </div>
        
        <div id="error" class="error" style="display: none;"></div>
        
        <div id="dashboard" style="display: none;">
            <div class="header">
                <h1>Welcome back, <span id="username">User</span>!</h1>
                <p>Your personalized TiltCheck ecosystem dashboard</p>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3>🎯 Trust Score</h3>
                    <div class="trust-score" id="trustScore">--</div>
                    <div class="metric">
                        <span>Tilt Level</span>
                        <span class="metric-value" id="tiltLevel">--</span>
                    </div>
                    <div class="metric">
                        <span>Consistency</span>
                        <span class="metric-value" id="consistency">--</span>
                    </div>
                    <div class="metric">
                        <span>Community Standing</span>
                        <span class="metric-value" id="community">--</span>
                    </div>
                </div>
                
                <div class="card">
                    <h3>💰 JustTheTip Stats</h3>
                    <div class="metric">
                        <span>Total Tips Sent</span>
                        <span class="metric-value" id="totalTips">--</span>
                    </div>
                    <div class="metric">
                        <span>Total Value (SOL)</span>
                        <span class="metric-value" id="totalValue">--</span>
                    </div>
                    <div class="metric">
                        <span>Casinos Analyzed</span>
                        <span class="metric-value" id="casinosSeen">--</span>
                    </div>
                </div>
                
                <div class="card">
                    <h3>⚙️ Preferences</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="emailNotifications"> Email Notifications
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="tiltWarnings"> Tilt Warnings
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="trustUpdates"> Trust Updates
                        </label>
                        <button class="btn" onclick="savePreferences()">Save Preferences</button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 Recent Activity</h3>
                <div id="activityFeed">
                    Loading activities...
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentUser = null;
        
        // Get token from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || localStorage.getItem('tiltcheck-token');
        
        if (!token) {
            window.location.href = '/auth/discord';
        } else {
            localStorage.setItem('tiltcheck-token', token);
            loadDashboard();
        }
        
        async function loadDashboard() {
            try {
                // Decode JWT to get user info
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUser = payload;
                
                document.getElementById('username').textContent = payload.username;
                
                // Load user data
                await Promise.all([
                    loadUserProfile(),
                    loadTrustMetrics(),
                    loadActivity()
                ]);
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                
            } catch (error) {
                showError('Failed to load dashboard: ' + error.message);
            }
        }
        
        async function loadUserProfile() {
            const response = await apiRequest(\`/api/user/\${currentUser.discordId}\`);
            const user = await response.json();
            
            document.getElementById('totalTips').textContent = user.totalTips;
            document.getElementById('totalValue').textContent = user.totalTipsValue + ' SOL';
            document.getElementById('casinosSeen').textContent = user.casinosSeen;
            
            // Set preferences
            document.getElementById('emailNotifications').checked = user.preferences.emailNotifications;
            document.getElementById('tiltWarnings').checked = user.preferences.tiltWarnings;
            document.getElementById('trustUpdates').checked = user.preferences.trustUpdates;
        }
        
        async function loadTrustMetrics() {
            const response = await apiRequest(\`/api/user/\${currentUser.discordId}/trust\`);
            const trust = await response.json();
            
            document.getElementById('trustScore').textContent = trust.trustScore.toFixed(1);
            document.getElementById('tiltLevel').textContent = trust.tiltLevel;
            document.getElementById('consistency').textContent = trust.factors.consistency + '%';
            document.getElementById('community').textContent = trust.factors.community + '%';
        }
        
        async function loadActivity() {
            const response = await apiRequest(\`/api/user/\${currentUser.discordId}/activity?limit=5\`);
            const data = await response.json();
            
            const activityHtml = data.activities.map(activity => \`
                <div class="activity-item">
                    <div>\${formatActivity(activity)}</div>
                    <div class="activity-time">\${new Date(activity.timestamp).toLocaleString()}</div>
                </div>
            \`).join('');
            
            document.getElementById('activityFeed').innerHTML = activityHtml || '<p>No recent activity</p>';
        }
        
        function formatActivity(activity) {
            switch (activity.type) {
                case 'tip':
                    return \`💰 Tipped \${activity.amount} SOL to \${activity.to}\`;
                case 'scan':
                    return \`🔍 Scanned \${activity.url} - \${activity.result}\`;
                case 'play':
                    return \`🎮 Played at \${activity.casino}\`;
                default:
                    return \`📝 \${activity.type}\`;
            }
        }
        
        async function savePreferences() {
            const preferences = {
                emailNotifications: document.getElementById('emailNotifications').checked,
                tiltWarnings: document.getElementById('tiltWarnings').checked,
                trustUpdates: document.getElementById('trustUpdates').checked
            };
            
            try {
                await apiRequest(\`/api/user/\${currentUser.discordId}/preferences\`, {
                    method: 'PUT',
                    body: JSON.stringify({ preferences })
                });
                
                alert('Preferences saved successfully!');
            } catch (error) {
                alert('Failed to save preferences: ' + error.message);
            }
        }
        
        async function apiRequest(url, options = {}) {
            const response = await fetch(url, {
                headers: {
                    'Authorization': \`Bearer \${token}\`,
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(\`API request failed: \${response.statusText}\`);
            }
            
            return response;
        }
        
        function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = message;
        }
        
        // Clear token parameter from URL
        if (urlParams.get('token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    </script>
</body>
</html>
  `;
}

app.listen(PORT, () => {
  console.log(`🎯 User Dashboard service listening on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔑 Discord OAuth: http://localhost:${PORT}/auth/discord`);
  console.log(`🔗 Discord Callback URL: ${DISCORD_CONFIG.redirectUri}`);
  if (!DISCORD_CONFIG.clientId) {
    console.warn('⚠️  DISCORD_CLIENT_ID not set - OAuth will not work');
  }
  if (!DISCORD_CONFIG.clientSecret) {
    console.warn('⚠️  DISCORD_CLIENT_SECRET not set - OAuth will not work');
  }
});