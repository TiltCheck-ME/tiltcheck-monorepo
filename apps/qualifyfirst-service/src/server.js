/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * QualifyFirst Service
 * Serves the PWA and provides API endpoints for survey matching
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { qualifyFirst } from '@tiltcheck/qualifyfirst';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.QUALIFYFIRST_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

// Create or get profile
app.post('/api/profile', async (req, res) => {
  try {
    const { userId, traits } = req.body;
    const profile = await qualifyFirst.createProfile(userId, traits);
    res.json({ success: true, profile: {
      userId: profile.userId,
      traits: Object.fromEntries(profile.traits),
      completedSurveys: profile.completedSurveys.length,
      failedScreeners: profile.failedScreeners.length,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = qualifyFirst.getProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    res.json({ success: true, profile: {
      userId: profile.userId,
      traits: Object.fromEntries(profile.traits),
      completedSurveys: profile.completedSurveys.length,
      failedScreeners: profile.failedScreeners.length,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update profile traits
app.patch('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { traits } = req.body;
    const profile = await qualifyFirst.updateUserTraits(userId, traits);
    res.json({ success: true, profile: {
      userId: profile.userId,
      traits: Object.fromEntries(profile.traits),
      updatedAt: profile.updatedAt
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get survey matches
app.get('/api/matches/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const matches = await qualifyFirst.matchSurveys(userId);
    res.json({ success: true, matches: matches.map(m => ({
      survey: {
        id: m.survey.id,
        title: m.survey.title,
        description: m.survey.description,
        estimatedMinutes: m.survey.estimatedMinutes,
        payoutUSD: m.survey.payoutUSD,
        source: m.survey.source
      },
      matchProbability: m.matchProbability,
      matchLevel: m.matchLevel,
      reasoning: m.reasoning
    }))});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user stats
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = qualifyFirst.getUserStats(userId);
    const earnings = qualifyFirst.getEarnings(userId);
    res.json({ success: true, stats: { ...stats, earningsUSD: earnings } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Request withdrawal
app.post('/api/withdraw', async (req, res) => {
  try {
    const { userId, amountUSD } = req.body;
    const result = await qualifyFirst.requestWithdrawal(userId, amountUSD);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get earnings balance
app.get('/api/earnings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const earnings = qualifyFirst.getEarnings(userId);
    res.json({ success: true, earningsUSD: earnings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recommended questions
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const questions = qualifyFirst.getRecommendedQuestions(userId);
    res.json({ success: true, questions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record survey result
app.post('/api/survey/result', async (req, res) => {
  try {
    const result = req.body;
    await qualifyFirst.recordSurveyResult(result);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a survey (for testing/demo)
app.post('/api/survey', async (req, res) => {
  try {
    const surveyData = req.body;
    const survey = await qualifyFirst.addSurvey(surveyData);
    res.json({ success: true, survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      estimatedMinutes: survey.estimatedMinutes,
      payoutUSD: survey.payoutUSD,
      source: survey.source
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'qualifyfirst' });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`QualifyFirst service running on port ${PORT}`);
});
