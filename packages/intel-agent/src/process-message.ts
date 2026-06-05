/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { createIntelTools, type CasinoSummary, type IntelTools } from '@tiltcheck/intel-tools';
import {
  buildListBlocks,
  buildLookupBlocks,
  resolveDataSource,
} from './block-builder.js';
import { routeIntelIntent } from './intent-router.js';
import type {
  IntelAgentContext,
  IntelChatResponse,
  IntelBlock,
  ProcessIntelMessageInput,
} from './types.js';

const METHODOLOGY_TEXT = `Grades run A+ through F from a curated baseline, then five pillars (payouts, proof quality, promo honesty, ops, community). Category modifiers shift the shape — Sweeps, Crypto, and Scam are not the same animal. When RGaaS matches an operator, live scores overlay the card with a timestamp. No match means snapshot only. We do not invent live data. Full methodology lives on /casinos#grading-methodology.`;

function personalLoginBlock(topic: string): IntelBlock[] {
  const reasons: Record<string, string> = {
    bonus: 'Bonus and reload status is tied to your Discord account.',
    session: 'Session stats and RTP drift are tied to your account history.',
    vault: 'Vault status and profit-lock handoff require a logged-in session.',
  };

  return [
    {
      type: 'login_prompt',
      reason: reasons[topic] ?? 'That question needs your account context.',
      handoff: topic === 'vault' ? 'vault' : topic === 'bonus' ? 'bonuses' : 'dashboard',
    },
    {
      type: 'cta',
      label: 'Log in with Discord',
      href: '/login?return=/ask',
    },
  ];
}

function unknownFallback(message: string): IntelBlock[] {
  return [
    {
      type: 'text',
      content: 'Ask about a casino by name, request a list (e.g. "US crypto casinos"), paste a domain to scan, or ask how grades work. I pull from the trust engine — I do not freestyle grades.',
    },
    {
      type: 'text',
      content: `You asked: "${message.slice(0, 160)}${message.length > 160 ? '…' : ''}"`,
    },
    {
      type: 'cta',
      label: 'Browse casino directory',
      href: '/casinos',
    },
  ];
}

export interface IntelAgentOptions {
  tools: IntelTools;
}

export function createIntelAgent(options: IntelAgentOptions) {
  const { tools } = options;

  async function processMessage(input: ProcessIntelMessageInput): Promise<IntelChatResponse> {
    const intent = routeIntelIntent(input.message);
    const { context } = input;

    if (intent.kind === 'personal') {
      if (!context.isAuthenticated) {
        return {
          blocks: personalLoginBlock(intent.topic),
          dataSource: 'snapshot',
          shareEligible: false,
        };
      }

      return {
        blocks: [
          {
            type: 'text',
            content: 'Personal session and bonus reads live in your dashboard for now. Intel chat handles public trust data; your account lane is separate.',
          },
          {
            type: 'cta',
            label: 'Open dashboard',
            href: '/dashboard',
          },
        ],
        dataSource: 'snapshot',
        shareEligible: false,
      };
    }

    if (intent.kind === 'methodology') {
      return {
        blocks: [
          { type: 'text', content: METHODOLOGY_TEXT },
          {
            type: 'cta',
            label: 'Read grading methodology',
            href: '/casinos#grading-methodology',
          },
        ],
        dataSource: 'snapshot',
        shareEligible: false,
      };
    }

    if (intent.kind === 'lookup') {
      const { matches, source } = await tools.lookupCasino(intent.name);
      let domainScan;

      const primary = matches[0];
      if (primary?.slug && intent.checkScam) {
        const domainGuess = `${intent.name.replace(/\s+/g, '').toLowerCase()}.com`;
        domainScan = await tools.checkDomain(domainGuess);
      }

      const blocks = buildLookupBlocks(matches, Boolean(intent.checkScam), domainScan);
      return {
        blocks,
        dataSource: source === 'live' || matches.some((m: CasinoSummary) => m.dataSource === 'live') ? 'mixed' : 'snapshot',
        shareEligible: matches.length > 0,
      };
    }

    if (intent.kind === 'list') {
      const { casinos, source } = await tools.listCasinos(intent.filters);
      const blocks = buildListBlocks(intent.title, intent.filters, casinos);
      return {
        blocks,
        dataSource: resolveDataSource(casinos) === 'snapshot' && source !== 'live' ? 'snapshot' : resolveDataSource(casinos),
        shareEligible: casinos.length > 0,
      };
    }

    if (intent.kind === 'domain') {
      const scan = await tools.checkDomain(intent.domain);
      return {
        blocks: [
          {
            type: 'text',
            content: `Domain scan for ${scan.domain}. Threat: ${scan.threatLevel}. License: ${scan.licenseStatus}. Not a legal ruling — cross-check the full verifier.`,
          },
          {
            type: 'domain_scan',
            domain: scan.domain,
            threatLevel: scan.threatLevel,
            licenseStatus: scan.licenseStatus,
          },
          {
            type: 'cta',
            label: 'Open domain verifier',
            href: `/tools/domain-verifier?domain=${encodeURIComponent(scan.domain)}`,
          },
        ],
        dataSource: 'live',
        shareEligible: false,
      };
    }

    return {
      blocks: unknownFallback(input.message),
      dataSource: 'snapshot',
      shareEligible: false,
    };
  }

  return { processMessage };
}

export type IntelAgent = ReturnType<typeof createIntelAgent>;

export function createDefaultIntelAgent(apiBase: string, casinos: import('@tiltcheck/intel-tools').CasinoRecord[]) {
  const tools = createIntelTools({ apiBase, casinos });
  return createIntelAgent({ tools });
}
