/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_BASE = process.env.TILTCHECK_API_URL ?? 'https://api.tiltcheck.me';
const MONOREPO_ROOT = process.env.MONOREPO_ROOT ?? resolve(import.meta.dirname, '../../..');

// ---------------------------------------------------------------------------
// Static casino data (loaded from casinos.json at startup, fallback inline)
// ---------------------------------------------------------------------------
interface CasinoEntry {
  name: string;
  grade: string;
  risk: string;
  category: string;
}

function loadCasinos(): CasinoEntry[] {
  const jsonPath = resolve(MONOREPO_ROOT, 'apps/web/src/data/casinos.json');
  try {
    if (existsSync(jsonPath)) {
      return JSON.parse(readFileSync(jsonPath, 'utf8')) as CasinoEntry[];
    }
  } catch {
    // fall through to inline data
  }
  // Minimal fallback so server stays functional without the monorepo filesystem
  return [
    { name: 'Chumba Casino', grade: 'B+', risk: 'Low', category: 'Sweeps' },
    { name: 'Global Poker', grade: 'B+', risk: 'Low', category: 'Sweeps' },
    { name: 'Pulsz', grade: 'B', risk: 'Low', category: 'Sweeps' },
    { name: 'Stake.us', grade: 'B-', risk: 'Medium', category: 'Sweeps' },
    { name: 'Stake', grade: 'B', risk: 'Medium', category: 'Crypto' },
    { name: 'Roobet', grade: 'B-', risk: 'Medium', category: 'Crypto' },
    { name: 'Rollbit', grade: 'C+', risk: 'Medium', category: 'Crypto' },
    { name: 'Planet 7 Casino', grade: 'F', risk: 'Critical', category: 'Scam' },
    { name: 'Raging Bull Casino', grade: 'F', risk: 'Critical', category: 'Scam' },
  ];
}

const CASINOS: CasinoEntry[] = loadCasinos();

// ---------------------------------------------------------------------------
// Site context (returned for the overview resource and get_site_context tool)
// ---------------------------------------------------------------------------
const SITE_CONTEXT = `# TiltCheck — AI Agent Context

## What TiltCheck Is
Responsible gaming audit layer for degens. Not a casino. Not financial advice.
Audits casino behavior, scores operator trustworthiness, and gives players tools to protect winnings.
Primary goal: redeem-to-win (help users secure profits, not just prevent losses).

## Core Tools
- Casino Trust Engine: community-backed trust scores (A+ to F) for sweepstakes, crypto, offshore operators
- RTP Drift Detection: detects when a casino's RTP deviates from stated values
- Domain Verifier: checks any casino domain against license registry and SusLink threat DB
- Shadow-Ban Tracker: community-reported withdrawal delays, silent ToS changes, account restrictions
- LockVault (Auto-Vault): non-custodial profit lock — auto-moves winnings out of reach on trigger
- CollectClock: sweepstakes bonus tracker — cooldowns, redemption windows across platforms
- JustTheTip: Solana micro-tip tool, non-custodial
- Degen Trivia Arena: skill-based trivia game for session cooldowns
- Forensic Seed Audit: provably fair seed verification

## Operator Categories
- Sweeps: US sweepstakes (Chumba, Global Poker, Pulsz, Stake.us, McLuck) — legal, no real-money gambling
- Crypto: offshore crypto-native (Stake, Roobet, Rollbit, BC.Game)
- Regulated: US state-licensed (DraftKings, FanDuel, BetMGM)
- Offshore: offshore accepting US players without state license
- Grey Market: unclear or partial licensing
- Scam: documented unpaid winnings, deceptive practices, failed license checks

## Key URLs
- Home: https://tiltcheck.me
- Casino Trust Engine: https://tiltcheck.me/casinos
- Bonuses: https://tiltcheck.me/bonuses
- Domain Verifier: https://tiltcheck.me/tools/domain-verifier
- Auto-Vault: https://tiltcheck.me/tools/auto-vault
- Shadow-Ban Tracker: https://tiltcheck.me/tools/scan-scams
- Extension: https://tiltcheck.me/extension
- Touch Grass: https://tiltcheck.me/touch-grass
- Help/SOS: https://tiltcheck.me/sos

## API Base: ${API_BASE}
- GET /rgaas/casino-scores — live trust scores for all tracked casinos
- GET /rgaas/domain-check?domain= — SusLink + license scan
- GET /rgaas/license-check?domain= — license registry lookup
- GET /rgaas/shadow-bans — current community-reported flags
- GET /rgaas/scam-domains — known scam domain list
- POST /rgaas/tilt/evaluate — evaluate a session for tilt signals
- POST /rgaas/email-ingest — parse casino marketing email for trust signals
- GET /health — API health check

## Tech Stack
Frontend: Next.js 16 (App Router), Tailwind CSS, TypeScript
API: Express, TypeScript, Node.js 18+
Auth: Discord OAuth2
Wallet: Solana / Phantom (non-custodial — no private keys stored)
DB: Supabase (PostgreSQL)
Deploy: Railway (all services containerized)
Monorepo: pnpm workspaces + Turborepo

## Brand Rules
- Tone: direct, blunt, degen-friendly. No apologies. No fluff. No emojis in code or copy.
- Tagline: "Made for Degens. By Degens."
- Non-custodial: never holds user funds or private keys
- Copyright header required on every file: © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
- UI footer must display: "Made for Degens. By Degens."
`;

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------
const server = new Server(
  { name: 'tiltcheck-mcp', version: '1.0.0' },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// ---------------------------------------------------------------------------
// Resources — static context docs AI agents can "read"
// ---------------------------------------------------------------------------
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'tiltcheck://context',
      name: 'TiltCheck Site Context',
      description: 'Full context about TiltCheck — what it is, tools, API, brand rules. Start here.',
      mimeType: 'text/markdown',
    },
    {
      uri: 'tiltcheck://casinos',
      name: 'Casino List',
      description: 'All casinos tracked by TiltCheck with trust grade, risk level, and category.',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const { uri } = req.params;
  if (uri === 'tiltcheck://context') {
    return { contents: [{ uri, mimeType: 'text/markdown', text: SITE_CONTEXT }] };
  }
  if (uri === 'tiltcheck://casinos') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(CASINOS, null, 2),
        },
      ],
    };
  }
  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
});

// ---------------------------------------------------------------------------
// Tools — callable functions AI agents can invoke
// ---------------------------------------------------------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_site_context',
      description:
        'Returns full context about the TiltCheck ecosystem — mission, tools, API endpoints, brand rules, and tech stack. Call this first when working on TiltCheck.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_casino_scores',
      description:
        'Fetches live trust scores for all casinos tracked by TiltCheck. Returns grade, risk, score, and data source (live vs snapshot).',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_casino_info',
      description: 'Look up a specific casino by name. Returns grade, risk, and category from the trust engine.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Casino name (partial match, case-insensitive). E.g. "chumba", "stake", "roobet"',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'check_domain',
      description:
        'Scans a casino domain against TiltCheck\'s SusLink threat database and license registry. Returns threat level and license status.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Domain to check. E.g. "chumba.com" or "somesketchycasino.net"',
          },
        },
        required: ['domain'],
      },
    },
    {
      name: 'list_api_endpoints',
      description: 'Returns all public TiltCheck RGaaS API endpoints with descriptions and example usage.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_shadow_bans',
      description: 'Returns current community-reported casino flags: withdrawal delays, silent ToS changes, account restrictions.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
  ],
}));

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  switch (name) {
    case 'get_site_context':
      return { content: [{ type: 'text', text: SITE_CONTEXT }] };

    case 'get_casino_scores': {
      try {
        const res = await fetch(`${API_BASE}/rgaas/casino-scores`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const data = await res.json() as { casinos: unknown[]; updatedAt: string; source: string };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch {
        // Fallback to static casino data
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { casinos: CASINOS, source: 'static', note: 'Live API unavailable. Static data shown.' },
                null,
                2,
              ),
            },
          ],
        };
      }
    }

    case 'get_casino_info': {
      const query = String((args as Record<string, unknown>)?.name ?? '').toLowerCase();
      const matches = CASINOS.filter((c) => c.name.toLowerCase().includes(query));
      if (matches.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No casinos found matching "${query}". Try a partial name like "stake", "pulsz", or "roobet".`,
            },
          ],
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }] };
    }

    case 'check_domain': {
      const domain = String((args as Record<string, unknown>)?.domain ?? '');
      if (!domain) throw new McpError(ErrorCode.InvalidParams, 'domain is required');
      try {
        const [domainRes, licenseRes] = await Promise.all([
          fetch(`${API_BASE}/rgaas/domain-check?domain=${encodeURIComponent(domain)}`, {
            signal: AbortSignal.timeout(5000),
          }),
          fetch(`${API_BASE}/rgaas/license-check?domain=${encodeURIComponent(domain)}`, {
            signal: AbortSignal.timeout(5000),
          }),
        ]);
        const results: Record<string, unknown> = { domain };
        if (domainRes.ok) results.domainScan = await domainRes.json();
        if (licenseRes.ok) results.licenseCheck = await licenseRes.json();
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      } catch (err) {
        throw new McpError(ErrorCode.InternalError, `Domain check failed: ${String(err)}`);
      }
    }

    case 'list_api_endpoints':
      return {
        content: [
          {
            type: 'text',
            text: `# TiltCheck RGaaS API — ${API_BASE}

GET  /health                           — API health check
GET  /rgaas/casino-scores              — Live trust scores for all tracked casinos
GET  /rgaas/domain-check?domain=       — SusLink + threat scan for a casino domain
GET  /rgaas/license-check?domain=      — License registry lookup for a domain
GET  /rgaas/shadow-bans               — Community-reported casino flags
GET  /rgaas/scam-domains              — Known scam domain list
POST /rgaas/tilt/evaluate             — Evaluate a session object for tilt signals
                                         Body: { sessionData: { bets, losses, duration, ... } }
POST /rgaas/email-ingest              — Parse a casino marketing email for trust signals
                                         Body: { raw: "<email content>" }

All endpoints return JSON. No auth required for read endpoints.
`,
          },
        ],
      };

    case 'get_shadow_bans': {
      try {
        const res = await fetch(`${API_BASE}/rgaas/shadow-bans`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: 'Shadow-ban data unavailable (API offline or no reports). Check https://tiltcheck.me/tools/scan-scams for the latest flags.',
            },
          ],
        };
      }
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
// Server running — logs go to stderr so they don't pollute the MCP stdio channel
process.stderr.write('TiltCheck MCP server running on stdio\n');
