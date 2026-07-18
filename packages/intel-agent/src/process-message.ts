/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import {
  createIntelTools,
  type CasinoRecord,
  type CasinoSummary,
  type IntelTools,
  type OperatorFactRecord,
  type VipCurrencyRule,
} from '@tiltcheck/intel-tools';
import {
  buildListBlocks,
  buildLookupBlocks,
  buildOperatorFactAmbiguousBlocks,
  buildOperatorFactHitBlocks,
  buildOperatorFactMissBlocks,
  buildOperatorFactNoneBlocks,
  buildOperatorFactTypeBlocks,
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

function operatorFactResponse(blocks: IntelBlock[], shareEligible: boolean): IntelChatResponse {
  return {
    blocks,
    dataSource: 'snapshot',
    shareEligible,
  };
}

const VIP_CURRENCY_ALIASES: Record<string, readonly string[]> = {
  sc: ['sc', 'sweeps coin', 'sweeps coins'],
  gc: ['gc', 'gold coin', 'gold coins'],
  'sweeps coins': ['sc', 'sweeps coin', 'sweeps coins'],
  'sweeps coin': ['sc', 'sweeps coin', 'sweeps coins'],
  'gold coins': ['gc', 'gold coin', 'gold coins'],
  'gold coin': ['gc', 'gold coin', 'gold coins'],
};

function expandCurrencyHint(currencyHint: string): string[] {
  const normalized = currencyHint.toLowerCase().trim();
  const aliases = VIP_CURRENCY_ALIASES[normalized];
  return aliases ? [...aliases] : [normalized];
}

function vipRuleMatchesHint(rule: VipCurrencyRule, hintTerms: string[]): boolean {
  const haystack = `${rule.currencyName} ${rule.notes}`.toLowerCase();

  return hintTerms.some((term) => {
    if (term.length <= 3) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
    }
    return haystack.includes(term);
  });
}

function matchVipRules(rules: VipCurrencyRule[], currencyHint?: string): VipCurrencyRule[] {
  if (!currencyHint) {
    return rules;
  }

  const hintTerms = expandCurrencyHint(currencyHint);
  return rules.filter((rule) => vipRuleMatchesHint(rule, hintTerms));
}

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

    if (intent.kind === 'operator_vip_fact') {
      const answer = tools.getOperatorVipFacts(intent.name);
      if (answer.kind === 'hit') {
        const rules = matchVipRules(answer.rules, intent.currencyHint);
        if (intent.currencyHint && rules.length === 0) {
          return operatorFactResponse(
            buildOperatorFactMissBlocks(answer.record.name, answer.record.slug),
            true,
          );
        }
        return operatorFactResponse(
          buildOperatorFactHitBlocks(
            rules.map((rule) => ({
              content: rule.notes,
              sourceUrl: rule.sourceUrl,
              asOf: rule.asOf,
            })),
            answer.record.slug,
            answer.stale,
          ),
          true,
        );
      }
      if (answer.kind === 'miss') {
        return operatorFactResponse(buildOperatorFactMissBlocks(answer.record.name, answer.record.slug), true);
      }
      if (answer.kind === 'ambiguous') {
        return operatorFactResponse(buildOperatorFactAmbiguousBlocks(answer.matches), false);
      }
      return operatorFactResponse(buildOperatorFactNoneBlocks(intent.name), false);
    }

    if (intent.kind === 'operator_redemption_fact') {
      const answer = tools.getOperatorRedemptionFacts(intent.name);
      if (answer.kind === 'hit') {
        return operatorFactResponse(
          buildOperatorFactHitBlocks(
            [
              {
                content: answer.payload.claim,
                sourceUrl: answer.payload.sourceUrl,
                asOf: answer.payload.asOf,
              },
            ],
            answer.record.slug,
            answer.stale,
          ),
          true,
        );
      }
      if (answer.kind === 'miss') {
        return operatorFactResponse(buildOperatorFactMissBlocks(answer.record.name, answer.record.slug), true);
      }
      if (answer.kind === 'ambiguous') {
        return operatorFactResponse(buildOperatorFactAmbiguousBlocks(answer.matches), false);
      }
      return operatorFactResponse(buildOperatorFactNoneBlocks(intent.name), false);
    }

    if (intent.kind === 'operator_welcome_bonus_fact') {
      const answer = tools.getOperatorWelcomeBonusFacts(intent.name, intent.geoTag);
      if (answer.kind === 'hit') {
        return operatorFactResponse(
          buildOperatorFactHitBlocks(
            [
              {
                content: answer.payload.summary,
                sourceUrl: answer.payload.sourceUrl,
                asOf: answer.payload.asOf,
              },
            ],
            answer.record.slug,
            answer.stale,
          ),
          true,
        );
      }
      if (answer.kind === 'miss') {
        return operatorFactResponse(buildOperatorFactMissBlocks(answer.record.name, answer.record.slug), true);
      }
      if (answer.kind === 'ambiguous') {
        return operatorFactResponse(buildOperatorFactAmbiguousBlocks(answer.matches), false);
      }
      return operatorFactResponse(buildOperatorFactNoneBlocks(intent.name), false);
    }

    if (intent.kind === 'operator_fact_lookup') {
      const answer = tools.listAvailableFactTypes(intent.name);
      if (answer.kind === 'hit') {
        return operatorFactResponse(
          buildOperatorFactTypeBlocks(answer.record.name, answer.payload, answer.record.slug, answer.stale),
          true,
        );
      }
      if (answer.kind === 'miss') {
        return operatorFactResponse(buildOperatorFactMissBlocks(answer.record.name, answer.record.slug), true);
      }
      if (answer.kind === 'ambiguous') {
        return operatorFactResponse(buildOperatorFactAmbiguousBlocks(answer.matches), false);
      }
      return operatorFactResponse(buildOperatorFactNoneBlocks(intent.name), false);
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

export function createDefaultIntelAgent(
  apiBase: string,
  casinos: CasinoRecord[],
  operatorFacts?: OperatorFactRecord[],
) {
  const tools = createIntelTools({ apiBase, casinos, operatorFacts });
  return createIntelAgent({ tools });
}
