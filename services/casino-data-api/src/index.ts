/**
 * Casino Data Collection API
 * 
 * API service for collecting casino trust data from various sources.
 * Used by AI agents to gather and analyze casino information.
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);

const app = express();
const PORT = process.env.CASINO_API_PORT || 6002;
const API_KEY = process.env.CASINO_API_KEY || 'tiltcheck-casino-collector-2024';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health endpoint for monitoring
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: [
      'GET  /api/casinos - List all casinos',
      'GET  /api/casinos/:id - Get specific casino',
      'POST /api/casinos/:id - Submit casino data',
      'POST /api/casinos/bulk - Bulk update casinos',
      'GET  /api/trust/:id? - Get trust scores',
      'GET  /api/templates - Data collection templates',
      'GET  /api/collection/status - Collection statistics'
    ]
  });
});

// Data storage paths
const DATA_DIR = join(process.cwd(), 'data');
const CASINO_DATA_PATH = join(DATA_DIR, 'casinos.json');
const CASINO_TRUST_PATH = join(DATA_DIR, 'casino-trust.json');

// Casino data structure
interface CasinoData {
  id: string;
  name: string;
  baseURL: string;
  collectionTimestamp: number;
  basicInfo: {
    licenseNumber?: string;
    regulator?: string;
    founded?: string;
    headquarters?: string;
    operator?: string;
    status: 'live' | 'suspended' | 'investigating';
  };
  rtpData?: {
    advertised: number[];
    verified?: number[];
    games: Array<{
      name: string;
      provider: string;
      rtp: number;
      variance: 'low' | 'medium' | 'high';
    }>;
  };
  regulatory?: {
    licenses: Array<{
      jurisdiction: string;
      number: string;
      status: 'active' | 'expired' | 'suspended';
      expires?: string;
    }>;
    compliance: {
      kyc: boolean;
      aml: boolean;
      responsibleGaming: boolean;
      fairPlay: boolean;
    };
  };
  security?: {
    ssl: boolean;
    twoFactor: boolean;
    encryption: string;
    dataProtection: string;
    auditedBy?: string[];
    lastAudit?: string;
  };
  financial?: {
    currencies: string[];
    paymentMethods: string[];
    withdrawalLimits: {
      min: number;
      max: number;
      currency: string;
    };
    withdrawalTimes: {
      processing: string;
      typical: string;
    };
  };
  reputation?: {
    trustpilot?: number;
    askgamblers?: number;
    casinomeister?: string;
    complaints: {
      total: number;
      resolved: number;
      unresolved: number;
    };
    blacklists: string[];
  };
  operations?: {
    uptime: number;
    responseTime: number;
    supportChannels: string[];
    languages: string[];
    restrictedCountries: string[];
  };
  gameFairness?: {
    provablyFair: boolean;
    rngTested: boolean;
    thirdPartyAudits: string[];
    gameProviders: string[];
  };
  social?: {
    publicSentiment: number; // -100 to 100
    redditMentions: number;
    twitterFollowers?: number;
    communityRating?: number;
  };
}

// API Routes

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'casino-data-api',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// Authentication middleware
function authenticateAPI(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

// Get all casinos
app.get('/api/casinos', authenticateAPI, async (req, res) => {
  try {
    const casinos = await loadCasinos();
    const { format = 'full', status } = req.query;
    
    let filteredCasinos = Object.values(casinos);
    
    if (status) {
      filteredCasinos = filteredCasinos.filter(casino => 
        casino.basicInfo.status === status
      );
    }
    
    if (format === 'summary') {
      const summary = filteredCasinos.map(casino => ({
        id: casino.id,
        name: casino.name,
        status: casino.basicInfo.status,
        regulator: casino.basicInfo.regulator,
        collectionTimestamp: casino.collectionTimestamp
      }));
      return res.json({ casinos: summary, count: summary.length });
    }
    
    return res.json({ casinos: filteredCasinos, count: filteredCasinos.length });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load casinos' });
  }
});

// Get specific casino
app.get('/api/casinos/:casinoId', authenticateAPI, async (req, res) => {
  try {
    const casinos = await loadCasinos();
    const casino = casinos[req.params.casinoId];
    
    if (!casino) {
      return res.status(404).json({ error: 'Casino not found' });
    }
    
    return res.json(casino);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load casino data' });
  }
});

// Submit casino data (for AI agents)
app.post('/api/casinos/:casinoId', authenticateAPI, async (req, res) => {
  try {
    const { casinoId } = req.params;
    const casinoData: CasinoData = {
      id: casinoId,
      collectionTimestamp: Date.now(),
      ...req.body
    };
    
    // Validate required fields
    if (!casinoData.name || !casinoData.baseURL) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, baseURL' 
      });
    }
    
    const casinos = await loadCasinos();
    casinos[casinoId] = casinoData;
    
    await saveCasinos(casinos);
    
    // Update trust scores
    await updateTrustScore(casinoId, casinoData);
    
    return res.json({ 
      success: true, 
      casinoId,
      timestamp: casinoData.collectionTimestamp 
    });
    
  } catch (error) {
    console.error('Failed to save casino data:', error);
    return res.status(500).json({ error: 'Failed to save casino data' });
  }
});

// Bulk update endpoint for AI agents
app.post('/api/casinos/bulk', authenticateAPI, async (req, res) => {
  try {
    const { casinos: newCasinos } = req.body;
    
    if (!Array.isArray(newCasinos)) {
      return res.status(400).json({ error: 'Expected array of casinos' });
    }
    
    const existingCasinos = await loadCasinos();
    let updatedCount = 0;
    const errors = [];
    
    for (const casinoData of newCasinos) {
      try {
        if (!casinoData.id || !casinoData.name) {
          errors.push({ casino: casinoData.id || 'unknown', error: 'Missing required fields' });
          continue;
        }
        
        casinoData.collectionTimestamp = Date.now();
        existingCasinos[casinoData.id] = casinoData;
        await updateTrustScore(casinoData.id, casinoData);
        updatedCount++;
        
      } catch (error) {
        errors.push({ casino: casinoData.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    await saveCasinos(existingCasinos);
    
    return res.json({
      success: true,
      updated: updatedCount,
      errors,
      timestamp: Date.now()
    });
    
  } catch (_error) {
    return res.status(500).json({ error: 'Bulk update failed' });
  }
});

// Get trust scores
app.get('/api/trust/:casinoId?', authenticateAPI, async (req, res) => {
  try {
    const trustData = await loadTrustData();
    
    if (req.params.casinoId) {
      const casinoTrust = trustData.casino?.casinos?.[req.params.casinoId];
      if (!casinoTrust) {
        return res.status(404).json({ error: 'Trust data not found for casino' });
      }
      return res.json(casinoTrust);
    }
    
    return res.json(trustData);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load trust data' });
  }
});

// Data collection templates for AI agents
app.get('/api/templates', authenticateAPI, (_req, res) => {
  res.json({
    casinoDataTemplate: {
      id: 'casino-identifier',
      name: 'Casino Name',
      baseURL: 'https://casino.com',
      basicInfo: {
        licenseNumber: 'License number if available',
        regulator: 'MGA, UKGC, Curacao, etc.',
        founded: 'Year founded',
        headquarters: 'Location',
        operator: 'Operating company',
        status: 'live | suspended | investigating'
      },
      rtpData: {
        advertised: [95.0, 96.5, 98.0],
        games: [
          {
            name: 'Game name',
            provider: 'Provider name',
            rtp: 96.5,
            variance: 'low | medium | high'
          }
        ]
      },
      regulatory: {
        licenses: [
          {
            jurisdiction: 'Malta Gaming Authority',
            number: 'MGA/B2C/123/2019',
            status: 'active | expired | suspended',
            expires: '2025-12-31'
          }
        ],
        compliance: {
          kyc: true,
          aml: true,
          responsibleGaming: true,
          fairPlay: true
        }
      },
      security: {
        ssl: true,
        twoFactor: false,
        encryption: 'TLS 1.3',
        dataProtection: 'GDPR compliant',
        auditedBy: ['eCOGRA', 'iTech Labs'],
        lastAudit: '2024-01-15'
      },
      financial: {
        currencies: ['USD', 'EUR', 'BTC'],
        paymentMethods: ['Visa', 'Mastercard', 'Skrill'],
        withdrawalLimits: {
          min: 10,
          max: 5000,
          currency: 'USD'
        },
        withdrawalTimes: {
          processing: '24 hours',
          typical: '1-3 business days'
        }
      },
      reputation: {
        trustpilot: 4.2,
        askgamblers: 8.1,
        complaints: {
          total: 45,
          resolved: 40,
          unresolved: 5
        },
        blacklists: []
      }
    },
    requiredFields: [
      'id', 'name', 'baseURL', 'basicInfo.status'
    ],
    dataCategories: [
      'Basic Information',
      'RTP Data', 
      'Regulatory Compliance',
      'Security Features',
      'Financial Operations',
      'Reputation Metrics',
      'Operational Data',
      'Game Fairness',
      'Social Sentiment'
    ]
  });
});

// Helper functions
async function loadCasinos(): Promise<Record<string, CasinoData>> {
  try {
    const data = await fs.readFile(CASINO_DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveCasinos(casinos: Record<string, CasinoData>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CASINO_DATA_PATH, JSON.stringify(casinos, null, 2));
}

async function loadTrustData(): Promise<any> {
  try {
    const data = await fs.readFile(CASINO_TRUST_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { casino: { casinos: {} } };
  }
}

async function updateTrustScore(casinoId: string, casinoData: CasinoData): Promise<void> {
  try {
    const trustData = await loadTrustData();
    
    if (!trustData.casino) trustData.casino = { casinos: {} };
    if (!trustData.casino.casinos) trustData.casino.casinos = {};
    
    // Calculate basic trust score based on available data
    let score = 50; // Base score
    
    // License and regulatory bonus
    if (casinoData.basicInfo.regulator) score += 15;
    if (casinoData.regulatory?.licenses?.length) score += 10;
    
    // Security features
    if (casinoData.security?.ssl) score += 5;
    if (casinoData.security?.auditedBy?.length) score += 10;
    
    // Reputation
    if (casinoData.reputation) {
      if (casinoData.reputation.trustpilot && casinoData.reputation.trustpilot > 4) score += 8;
      if (casinoData.reputation.complaints) {
        const resolvedRatio = casinoData.reputation.complaints.resolved / 
                             Math.max(casinoData.reputation.complaints.total, 1);
        score += resolvedRatio * 10;
      }
    }
    
    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    trustData.casino.casinos[casinoId] = {
      lastScore: score,
      totalDelta: 0,
      timestamp: Date.now(),
      factors: {
        regulatory: casinoData.regulatory ? 85 : 50,
        security: casinoData.security ? 90 : 60,
        reputation: casinoData.reputation ? 75 : 50,
        operations: casinoData.operations ? 80 : 60
      }
    };
    
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CASINO_TRUST_PATH, JSON.stringify(trustData, null, 2));
    
  } catch (error) {
    console.error('Failed to update trust score:', error);
  }
}

// Collection status endpoint
app.get('/api/collection/status', authenticateAPI, async (_req, res) => {
  try {
    const casinos = await loadCasinos();
    const allCasinos = Object.values(casinos);
    
    const stats = {
      totalCasinos: allCasinos.length,
      byStatus: {
        live: allCasinos.filter(c => c.basicInfo.status === 'live').length,
        suspended: allCasinos.filter(c => c.basicInfo.status === 'suspended').length,
        investigating: allCasinos.filter(c => c.basicInfo.status === 'investigating').length
      },
      dataCompleteness: {
        hasRTP: allCasinos.filter(c => c.rtpData).length,
        hasRegulatory: allCasinos.filter(c => c.regulatory).length,
        hasSecurity: allCasinos.filter(c => c.security).length,
        hasReputation: allCasinos.filter(c => c.reputation).length
      },
      lastUpdated: allCasinos.length > 0 ? 
        Math.max(...allCasinos.map(c => c.collectionTimestamp)) : 0
    };
    
    return res.json(stats);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to get collection status' });
  }
});

app.listen(PORT, () => {
  console.log(`🎰 Casino Data API listening on port ${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /api/casinos - List all casinos`);
  console.log(`   GET  /api/casinos/:id - Get specific casino`);
  console.log(`   POST /api/casinos/:id - Submit casino data`);
  console.log(`   POST /api/casinos/bulk - Bulk update casinos`);
  console.log(`   GET  /api/trust/:id? - Get trust scores`);
  console.log(`   GET  /api/templates - Data collection templates`);
  console.log(`   GET  /api/collection/status - Collection statistics`);
});