/**
 * AI Service - Smart Help Assistant
 * Context-aware help and FAQ generation
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface HelpContext {
  userId: string;
  recentCommands?: string[];
  userLevel?: 'new' | 'intermediate' | 'advanced';
  previousQuestions?: string[];
}

export interface HelpResponse {
  answer: string;
  relatedCommands: string[];
  confidence: number;
}

const AI_ENABLED = !!process.env.OPENAI_API_KEY;

const KNOWLEDGE_BASE = `
# TiltCheck Ecosystem Knowledge Base

## JustTheTip - Non-Custodial Tipping
- **Commands**: /tip, /register-magic, /register-phantom, /balance
- **Fee**: Flat $0.07 (0.0007 SOL)
- **Limits**: $0.10 - $100 USD
- **Wallets**: Magic Eden (email), Phantom, Solflare
- **Currencies**: SOL, USD (auto-converted)

## TriviaDrops - AI Trivia
- **Commands**: /triviadrop start, /triviadrop answer, /triviadrop leaderboard
- **Categories**: crypto, poker, sports, science, history, general
- **Points**: Easy (10), Medium (20), Hard (30)
- **Achievements**: Streaks, accuracy milestones

## Trust Engines - Casino Fairness
- **Commands**: /play-analyze, /trust-score
- **Metrics**: RTP deviation, volatility, win clustering
- **Score**: 0-100 composite fairness rating

## SusLink - URL Safety
- **Commands**: /suslink scan
- **Features**: Phishing detection, domain reputation

## LockVault - Self-Exclusion
- **Commands**: /lockvault lock, /lockvault status
- **Features**: Time-locked withdrawals, cooldowns
`;

/**
 * Generate smart help response
 */
export async function generateSmartHelp(
  question: string,
  context?: HelpContext
): Promise<HelpResponse> {
  if (!AI_ENABLED) {
    return fallbackHelp(question);
  }

  try {
    const userContext = buildUserContext(context);
    
    const systemPrompt = `You are TiltCheck Helper, a friendly expert on the TiltCheck ecosystem.

${KNOWLEDGE_BASE}

${userContext}

Guidelines:
- Be concise (2-4 sentences max)
- Include specific slash commands when relevant
- Use emojis sparingly for clarity
- If unsure, suggest /help command
- Never make up information not in the knowledge base`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      maxRetries: 2,
      temperature: 0.3
    });

    // Extract related commands from response
    const relatedCommands = extractCommands(result.text);

    return {
      answer: result.text,
      relatedCommands,
      confidence: 0.9
    };
  } catch (error) {
    console.error('[SmartHelp] Generation error:', error);
    return fallbackHelp(question);
  }
}

/**
 * Build user context string
 */
function buildUserContext(context?: HelpContext): string {
  if (!context) return '';
  
  let ctx = `User context:\n`;
  
  if (context.userLevel) {
    ctx += `- Experience level: ${context.userLevel}\n`;
  }
  
  if (context.recentCommands && context.recentCommands.length > 0) {
    ctx += `- Recently used: ${context.recentCommands.join(', ')}\n`;
  }
  
  if (context.previousQuestions && context.previousQuestions.length > 0) {
    ctx += `- Previous questions: ${context.previousQuestions.slice(-3).join('; ')}\n`;
  }
  
  return ctx;
}

/**
 * Extract command mentions from text
 */
function extractCommands(text: string): string[] {
  const commandRegex = /\/[\w-]+/g;
  const matches = text.match(commandRegex) || [];
  return [...new Set(matches)]; // Unique commands
}

/**
 * Fallback help (keyword matching)
 */
function fallbackHelp(question: string): HelpResponse {
  const lower = question.toLowerCase();
  
  // Tip-related
  if (/tip|send|transfer/i.test(lower)) {
    return {
      answer: `Use \`/tip\` to send SOL or USD to another user.\n\nExample: \`/tip user:@alice amount:5 currency:USD\`\n\n💡 Need a wallet first? Try \`/register-magic\` for instant setup (no app needed!)`,
      relatedCommands: ['/tip', '/register-magic', '/register-phantom', '/balance'],
      confidence: 0.7
    };
  }
  
  // Fee question
  if (/fee|cost|charge/i.test(lower)) {
    return {
      answer: `JustTheTip charges a flat $0.07 fee (0.0007 SOL).\n\nExample: Tip $5 → Recipient gets $4.93 ✅`,
      relatedCommands: ['/tip'],
      confidence: 0.8
    };
  }
  
  // Wallet registration
  if (/wallet|register|setup/i.test(lower)) {
    return {
      answer: `Register your Solana wallet:\n- \`/register-magic\` - Email-based (easiest)\n- \`/register-phantom\` - Browser extension\n- \`/register-solflare\` - Mobile app`,
      relatedCommands: ['/register-magic', '/register-phantom', '/register-solflare'],
      confidence: 0.75
    };
  }
  
  // Trivia
  if (/trivia|quiz|game/i.test(lower)) {
    return {
      answer: `Start a trivia game with \`/triviadrop start\`!\n\nCategories: crypto, poker, sports, science, history, general\n\nEarn points, build streaks, unlock achievements! 🏆`,
      relatedCommands: ['/triviadrop start', '/triviadrop leaderboard'],
      confidence: 0.7
    };
  }
  
  // Casino analysis
  if (/casino|trust|fair|analyze/i.test(lower)) {
    return {
      answer: `Analyze casino fairness with \`/play-analyze casino:<id>\`\n\nGet real-time RTP monitoring, volatility analysis, and trust scores. Know before you play! 🎰`,
      relatedCommands: ['/play-analyze', '/trust-score'],
      confidence: 0.7
    };
  }
  
  // Generic help
  return {
    answer: `Type \`/help\` to see all available commands!\n\nPopular features:\n🎯 \`/tip\` - Send SOL/USD\n🎲 \`/triviadrop\` - Play trivia\n🎰 \`/play-analyze\` - Check casino fairness`,
    relatedCommands: ['/help'],
    confidence: 0.5
  };
}

/**
 * Generate FAQ from common questions
 */
export async function generateFAQ(
  questions: string[],
  category?: string
): Promise<Array<{ question: string; answer: string }>> {
  if (!AI_ENABLED) {
    return STATIC_FAQ;
  }

  try {
    const categoryPrompt = category ? ` in the ${category} category` : '';
    
    const prompt = `Generate a comprehensive FAQ${categoryPrompt} for TiltCheck Discord bot.

${KNOWLEDGE_BASE}

Common user questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Return JSON array:
[
  {
    "question": "Clear, user-friendly question",
    "answer": "Concise answer with relevant commands"
  }
]

Max 10 FAQs. Include specific slash commands.`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      maxRetries: 2
    });

    return JSON.parse(result.text);
  } catch (error) {
    console.error('[FAQ] Generation error:', error);
    return STATIC_FAQ;
  }
}

/**
 * Static FAQ fallback
 */
const STATIC_FAQ = [
  {
    question: 'How do I tip someone?',
    answer: 'Use `/tip user:@username amount:5 currency:USD` to send a tip. You need a registered wallet first (`/register-magic` or `/register-phantom`).'
  },
  {
    question: 'What are the fees?',
    answer: 'JustTheTip charges a flat $0.07 fee per tip. Much cheaper than centralized platforms!'
  },
  {
    question: 'How do I register a wallet?',
    answer: 'Use `/register-magic` for email-based wallet (easiest) or `/register-phantom` if you have Phantom installed.'
  },
  {
    question: 'Can I tip in USDC or other tokens?',
    answer: 'Currently SOL and USD only. Jupiter swap integration for USDC/BONK coming soon!'
  },
  {
    question: 'How does TriviaDrops work?',
    answer: 'Start with `/triviadrop start category:crypto`. Answer correctly to earn points and build streaks! View rankings with `/triviadrop leaderboard`.'
  },
  {
    question: 'What do trust scores mean?',
    answer: 'Trust scores (0-100) measure casino fairness based on RTP accuracy, volatility consistency, and win distribution. Higher = more trustworthy.'
  },
  {
    question: 'How do I analyze a casino?',
    answer: 'Use `/play-analyze casino:stake-us` to start a real-time fairness analysis session. Get RTP deviation, clustering detection, and more.'
  },
  {
    question: 'Is my data safe?',
    answer: 'TiltCheck is non-custodial - we never hold your funds. Wallet registrations are encrypted and stored securely.'
  }
];

export { STATIC_FAQ };
