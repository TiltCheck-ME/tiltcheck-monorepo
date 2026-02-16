/**
 * AI Gateway HTTP Server
 * 
 * Express server wrapper for the AI Gateway service.
 * Provides REST API endpoints for all 7 AI applications.
 */

import express from 'express';
import cors from 'cors';
import { aiGateway } from './src/index.js';

const app = express();
const PORT = process.env.AI_GATEWAY_PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const status = aiGateway.getStatus();
  res.json({
    status: 'ok',
    service: 'ai-gateway',
    mode: status.mode,
    model: status.model,
    cacheSize: status.cacheSize,
    timestamp: Date.now()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  const status = aiGateway.getStatus();
  res.json({
    ...status,
    applications: [
      'survey-matching',
      'card-generation',
      'moderation',
      'tilt-detection',
      'nl-commands',
      'recommendations',
      'support'
    ]
  });
});

// Generic AI processing endpoint
app.post('/api/process', async (req, res) => {
  try {
    const response = await aiGateway.process(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Application-specific endpoints
app.post('/api/survey-matching', async (req, res) => {
  try {
    const response = await aiGateway.process({
      application: 'survey-matching',
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/card-generation', async (req, res) => {
  try {
    const response = await aiGateway.process({
      application: 'card-generation',
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/moderation', async (req, res) => {
  try {
    const response = await aiGateway.process({
      application: 'moderation',
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tilt-detection', async (req, res) => {
  try {
    const response = await aiGateway.process({
      application: 'tilt-detection',
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/nl-commands', async (req, res) => {
  try {
    const response = await aiGateway.process({
      application: 'nl-commands',
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/recommendations', async (req, res) => {
  try {
    const response = await aiGateway.process({
      application: 'recommendations',
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/support', async (req, res) => {
  try {
    const response = await aiGateway.process({
      application: 'support',
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cache management
app.post('/api/cache/clear', (req, res) => {
  aiGateway.clearExpiredCache();
  res.json({ success: true, message: 'Expired cache entries cleared' });
});

app.get('/api/cache/stats', (req, res) => {
  res.json(aiGateway.getCacheStats());
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const status = aiGateway.getStatus();
  console.log(`[AIGateway] HTTP Server listening on port ${PORT}`);
  console.log(`[AIGateway] Mode: ${status.mode}, Model: ${status.model}`);
  console.log(`[AIGateway] Endpoints:`);
  console.log(`  - GET  /health`);
  console.log(`  - GET  /status`);
  console.log(`  - POST /api/process`);
  console.log(`  - POST /api/survey-matching`);
  console.log(`  - POST /api/card-generation`);
  console.log(`  - POST /api/moderation`);
  console.log(`  - POST /api/tilt-detection`);
  console.log(`  - POST /api/nl-commands`);
  console.log(`  - POST /api/recommendations`);
  console.log(`  - POST /api/support`);
});

export default app;
