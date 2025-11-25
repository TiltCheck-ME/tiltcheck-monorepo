/**
 * QualifyFirst Web Service
 * 
 * Progressive Web App for survey matching and completion tracking.
 * Integrates with TiltCheck cooldown system for positive redirection.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { microtaskEngine, MICROTASK_CATALOG, type MicrotaskCompletion } from '../../modules/qualifyfirst/src/microtasks-engine.js';
import { AIGateway, AI_GATEWAY_CONFIGS } from '../../modules/qualifyfirst/src/ai-gateway-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.QUALIFYFIRST_PORT || 3004;

// Initialize AI Gateway
const aiGateway = new AIGateway({
  ...AI_GATEWAY_CONFIGS.development,
  apiKey: process.env.AI_GATEWAY_KEY || 'demo-key'
});

// Mock QualifyFirst functionality (to be replaced with actual module)
const mockQualifyFirst = {
  predictSurveyMatch: (userProfile: any) => {
    // Mock survey matching logic
    const surveys = [
      {
        id: 'survey-1',
        title: 'Gaming Preferences Survey',
        provider: 'SurveyMonkey',
        reward: '$2.50',
        duration: '8 minutes',
        match: Math.random() > 0.3 ? 85 : 45,
        tags: ['gaming', 'entertainment', 'preferences'],
        description: 'Share your gaming habits and preferences for market research'
      },
      {
        id: 'survey-2', 
        title: 'Financial Services Survey',
        provider: 'Toluna',
        reward: '$3.75',
        duration: '12 minutes',
        match: Math.random() > 0.4 ? 72 : 38,
        tags: ['finance', 'banking', 'cryptocurrency'],
        description: 'Help financial services companies understand customer needs'
      },
      {
        id: 'survey-3',
        title: 'Online Shopping Behavior',
        provider: 'Ipsos',
        reward: '$1.85',
        duration: '5 minutes', 
        match: Math.random() > 0.2 ? 92 : 51,
        tags: ['shopping', 'e-commerce', 'retail'],
        description: 'Quick survey about your online shopping preferences and habits'
      }
    ];
    
    return surveys.map(survey => ({
      ...survey,
      match: survey.match + (userProfile.trustScore || 0) * 0.1 // Slight boost for trusted users
    })).sort((a, b) => b.match - a.match);
  },
  
  updateUserProfile: (discordId: string, profileData: any) => {
    // Mock profile update - in real implementation, this would save to database
    console.log(`Updated profile for ${discordId}:`, profileData);
    return true;
  },
  
  getUserProfile: (discordId: string) => {
    // Mock profile data - in real implementation, fetch from database
    return {
      discordId,
      age: 25,
      interests: ['gaming', 'technology', 'finance'],
      trustScore: 75,
      surveysCompleted: 12,
      totalEarnings: 47.50,
      averageCompletion: 87,
      lastActive: new Date().toISOString()
    };
  }
};

// Middleware
app.use(cors({
  origin: ['https://tiltcheck.com', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'qualifyfirst', timestamp: new Date().toISOString() });
});

// Main QualifyFirst app route
app.get('/qualify', (req, res) => {
  const discordId = req.query.discord as string;
  const source = req.query.source as string; // 'cooldown', 'direct', etc.
  
  if (!discordId) {
    return res.status(400).send(`
      <html>
        <head><title>QualifyFirst - Access Required</title></head>
        <body style="font-family: Inter, sans-serif; background: #0f0f12; color: #ffffff; padding: 40px; text-align: center;">
          <h1>🎯 QualifyFirst</h1>
          <p>Survey access requires Discord authentication.</p>
          <p><a href="/dashboard" style="color: #00d4aa;">Return to TiltCheck</a></p>
        </body>
      </html>
    `);
  }

  // Serve main app with user context
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// User profile routes
app.get('/api/profile/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const profile = mockQualifyFirst.getUserProfile(discordId);
    
    if (!profile) {
      // Create a new profile with default traits
      const newProfile = mockQualifyFirst.getUserProfile(discordId);
      return res.json({
        success: true,
        profile: {
          userId: newProfile.discordId,
          traits: newProfile.interests,
          completedSurveys: newProfile.surveysCompleted,
          failedScreeners: 0,
          earnings: newProfile.totalEarnings,
          createdAt: newProfile.lastActive,
        }
      });
    }
    
    res.json({
      success: true,
      profile: {
        userId: profile.discordId,
        traits: profile.interests,
        completedSurveys: profile.surveysCompleted,
        failedScreeners: 0,
        earnings: profile.totalEarnings,
        createdAt: profile.lastActive,
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

app.post('/api/profile/:discordId/traits', async (req, res) => {
  try {
    const { discordId } = req.params;
    const { traits } = req.body;
    
    mockQualifyFirst.updateUserProfile(discordId, traits);
    const profile = mockQualifyFirst.getUserProfile(discordId);
    
    res.json({
      success: true,
      profile: {
        userId: profile.discordId,
        traits: profile.interests,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update traits error:', error);
    res.status(500).json({ success: false, error: 'Failed to update traits' });
  }
});

// Survey matching routes
app.get('/api/matches/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const profile = mockQualifyFirst.getUserProfile(discordId);
    const matches = mockQualifyFirst.predictSurveyMatch(profile);
    
    res.json({
      success: true,
      matches: matches.map((m: any) => ({
        survey: {
          id: m.id,
          title: m.title,
          description: m.description,
          estimatedMinutes: parseInt(m.duration),
          payoutUSD: parseFloat(m.reward.replace('$', '')),
          source: m.provider
        },
        matchProbability: m.match,
        matchLevel: m.match > 80 ? 'HIGH' : m.match > 60 ? 'MEDIUM' : 'LOW',
        reasoning: `Match based on ${m.tags.join(', ')} interests`
      }))
    });
  } catch (error) {
    console.error('Match surveys error:', error);
    res.status(500).json({ success: false, error: 'Failed to match surveys' });
  }
});

// Recommended questions for profile building
app.get('/api/questions/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    // Mock questions based on profile gaps
    const questions = [
      { id: 'age', text: 'What is your age range?', options: ['18-24', '25-34', '35-44', '45+'] },
      { id: 'income', text: 'What is your household income?', options: ['<$50k', '$50-100k', '$100k+'] },
      { id: 'shopping', text: 'How often do you shop online?', options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] }
    ];
    
    res.json({ success: true, questions });
  } catch (error) {
    console.error('Questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get questions' });
  }
});

// User statistics
app.get('/api/stats/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const profile = mockQualifyFirst.getUserProfile(discordId);
    const stats = {
      surveysCompleted: profile.surveysCompleted,
      totalEarnings: profile.totalEarnings,
      averageCompletion: profile.averageCompletion,
      rank: 'Bronze',
      streakDays: 3
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// Add survey results
app.post('/api/survey-result', async (req, res) => {
  try {
    const result = req.body;
    console.log('Survey result recorded:', result);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Survey result error:', error);
    res.status(500).json({ success: false, error: 'Failed to record result' });
  }
});

// ===== MICROTASKS API ENDPOINTS =====

// Get available microtasks for user
app.get('/api/microtasks/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const userProfile = mockQualifyFirst.getUserProfile(discordId);
    
    const tasks = microtaskEngine.getRecommendedTasks(discordId, {
      trustScore: userProfile.trustScore,
      hasWallet: true, // Can check from TiltCheck integration
      completedTasks: [],
      skills: userProfile.interests
    });
    
    res.json({
      success: true,
      tasks: tasks.slice(0, 10), // Top 10 recommended tasks
      totalAvailable: tasks.length
    });
  } catch (error) {
    console.error('Microtasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch microtasks' });
  }
});

// Get all microtask categories
app.get('/api/microtasks/categories/all', async (req, res) => {
  try {
    const categories = {
      crypto: MICROTASK_CATALOG.filter(t => t.category === 'crypto' && t.active),
      reviews: MICROTASK_CATALOG.filter(t => t.category === 'reviews' && t.active),
      cashback: MICROTASK_CATALOG.filter(t => t.category === 'cashback' && t.active),
      blockchain: MICROTASK_CATALOG.filter(t => t.category === 'blockchain' && t.active),
      social: MICROTASK_CATALOG.filter(t => t.category === 'social' && t.active),
      testing: MICROTASK_CATALOG.filter(t => t.category === 'testing' && t.active)
    };
    
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Submit microtask completion
app.post('/api/microtasks/complete', async (req, res) => {
  try {
    const completion: MicrotaskCompletion = req.body;
    
    const result = await microtaskEngine.recordCompletion(completion);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Task completion error:', error);
    res.status(500).json({ success: false, error: 'Failed to record completion' });
  }
});

// Get user's microtask earnings
app.get('/api/microtasks/earnings/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const earnings = microtaskEngine.getUserEarnings(discordId);
    
    res.json({ success: true, earnings });
  } catch (error) {
    console.error('Earnings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch earnings' });
  }
});

// Get platform metrics (admin only - add auth later)
app.get('/api/microtasks/metrics/platform', async (req, res) => {
  try {
    const metrics = microtaskEngine.getPlatformMetrics();
    
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

// Initialize with sample surveys for testing
async function initializeSampleSurveys() {
  try {
    console.log('[QualifyFirst] Sample surveys initialized (mock mode)');
  } catch (error) {
    console.error('[QualifyFirst] Error initializing surveys:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`QualifyFirst Web Service running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}/qualify?discord=YOUR_DISCORD_ID`);
  
  // Initialize sample surveys
  await initializeSampleSurveys();
});