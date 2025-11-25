/**
 * TiltCheck Dashboard Service
 * 
 * Provides personalized web dashboards for TiltCheck users.
 * Integrates trust analytics, tilt monitoring, and cooldown management.
 */

import express from 'express';
import cors from 'cors';
import {
  generateMainDashboardHTML,
  generateTrustDashboardHTML,
  generateTiltDashboardHTML,
  generateCooldownDashboardHTML
} from './templates.js';
import {
  getUserTrust,
  getCasinoTrust,
  getUserTiltData,
  getUserCooldownData,
  getUserDashboardData
} from './trust-engine.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['https://tiltcheck.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dashboard', timestamp: new Date().toISOString() });
});

// Main dashboard route
app.get('/dashboard', async (req, res) => {
  try {
    const discordId = req.query.discord as string;
    
    if (!discordId) {
      return res.status(400).send('Discord ID required. Format: /dashboard?discord=YOUR_DISCORD_ID');
    }
    
    // Get user data from trust engines
    const userData = await getUserDashboardData(discordId);
    const html = generateMainDashboardHTML(discordId, userData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Dashboard temporarily unavailable');
  }
});

// Trust dashboard
app.get('/dashboard/trust', async (req, res) => {
  try {
    const discordId = req.query.discord as string;
    
    if (!discordId) {
      return res.status(400).send('Discord ID required');
    }
    
    // Get trust data from trust engines
    const userTrust = await getUserTrust(discordId);
    const casinoData = await getCasinoTrust();
    const html = generateTrustDashboardHTML(discordId, userTrust, casinoData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Trust dashboard error:', error);
    res.status(500).send('Trust dashboard temporarily unavailable');
  }
});

// Tilt monitoring dashboard
app.get('/dashboard/tilt', async (req, res) => {
  try {
    const discordId = req.query.discord as string;
    
    if (!discordId) {
      return res.status(400).send('Discord ID required');
    }
    
    // Get tilt data from monitoring system
    const tiltData = await getUserTiltData(discordId);
    const html = generateTiltDashboardHTML(discordId, tiltData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Tilt dashboard error:', error);
    res.status(500).send('Tilt dashboard temporarily unavailable');
  }
});

// Cooldown management dashboard
app.get('/dashboard/cooldown', async (req, res) => {
  try {
    const discordId = req.query.discord as string;
    
    if (!discordId) {
      return res.status(400).send('Discord ID required');
    }
    
    // Get cooldown data
    const cooldownData = await getUserCooldownData(discordId);
    const html = generateCooldownDashboardHTML(discordId, cooldownData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Cooldown dashboard error:', error);
    res.status(500).send('Cooldown dashboard temporarily unavailable');
  }
});

// API Routes

// Get trust data API
app.get('/api/trust/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const trustData = await getUserTrust(discordId);
    res.json(trustData);
  } catch (error) {
    console.error('Trust API error:', error);
    res.status(500).json({ error: 'Failed to fetch trust data' });
  }
});

// Get casino scores API
app.get('/api/casinos', async (req, res) => {
  try {
    const casinoData = await getCasinoTrust();
    res.json(casinoData);
  } catch (error) {
    console.error('Casino API error:', error);
    res.status(500).json({ error: 'Failed to fetch casino data' });
  }
});

// Server-Sent Events for real-time updates
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send initial connection event
  res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
  
  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);
  
  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TiltCheck Dashboard Server running on port ${PORT}`);
  console.log(`Access dashboards at: http://localhost:${PORT}/dashboard?discord=YOUR_DISCORD_ID`);
});