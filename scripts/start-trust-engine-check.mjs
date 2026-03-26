import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const persistDir = process.env.TRUST_ENGINES_PERSIST_DIR || path.join(repoRoot, 'data');
const logDir = process.env.TRUST_ENGINES_LOG_DIR || path.join(repoRoot, 'logs');

process.env.TRUST_ENGINES_PERSIST_DIR = persistDir;
process.env.TRUST_ENGINES_LOG_DIR = logDir;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-not-for-production';
process.env.SERVICE_JWT_SECRET = process.env.SERVICE_JWT_SECRET || 'dev-service-jwt-secret-not-for-production';
process.env.SERVICE_ID = process.env.SERVICE_ID || 'trust-engine-local';
process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://local:local@localhost:5432/tiltcheck';

const trustModulePath = path.join(repoRoot, 'packages', 'trust-engines', 'dist', 'index.js');
const trust = await import(trustModulePath);

const service = trust.trustEngines;

const sampleCasino = 'myvegas.com';
const score = service.getCasinoScore(sampleCasino);
const breakdown = service.getCasinoBreakdown(sampleCasino);
const explanation = service.explainCasinoScore(sampleCasino);

console.log(JSON.stringify({
  status: 'started',
  persistDir,
  sampleCasino,
  sampleScore: score,
  sampleBreakdown: breakdown,
  sampleExplanationHead: Array.isArray(explanation) ? explanation.slice(0, 2) : []
}, null, 2));

service.shutdown();

console.log(JSON.stringify({ status: 'shutdown-complete' }, null, 2));
