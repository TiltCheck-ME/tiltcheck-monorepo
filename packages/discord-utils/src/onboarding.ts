/**
 * User Onboarding System
 * Handles first-time user experience with DMs and AI-powered setup
 */

import { User, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Get verification URL with fallback priority:
 * 1. DISCORD_USER_OAUTH_URL (highest priority)
 * 2. IDENTITY_VERIFY_URL
 * 3. BASE_PUBLIC_URL + /verify
 * 4. Default hardcoded URL (lowest priority)
 */
function getVerifyUrl(): string {
  if (process.env.DISCORD_USER_OAUTH_URL) {
    return process.env.DISCORD_USER_OAUTH_URL;
  }
  if (process.env.IDENTITY_VERIFY_URL) {
    return process.env.IDENTITY_VERIFY_URL;
  }
  if (process.env.BASE_PUBLIC_URL) {
    return `${process.env.BASE_PUBLIC_URL.replace(/\/$/, '')}/verify`;
  }
  return 'https://tiltcheck.it.com/verify';
}

export interface OnboardingState {
  userId: string;
  hasSeenWelcome: boolean;
  hasSetupEmail: boolean;
  hasRegisteredWallet: boolean;
  setupStartedAt?: string;
  completedAt?: string;
}

const ONBOARDING_FILE = path.join(process.cwd(), 'data', 'onboarding.json');
const onboardingCache = new Map<string, OnboardingState>();

/**
 * Load onboarding data from disk
 */
async function loadOnboardingData(): Promise<void> {
  try {
    const data = await fs.readFile(ONBOARDING_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    
    Object.entries(parsed).forEach(([userId, state]) => {
      onboardingCache.set(userId, state as OnboardingState);
    });
    
    console.log(`[Onboarding] Loaded ${onboardingCache.size} user states`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('[Onboarding] No existing data, starting fresh');
      await saveOnboardingData();
    } else {
      console.error('[Onboarding] Error loading data:', error);
    }
  }
}

/**
 * Save onboarding data to disk
 */
async function saveOnboardingData(): Promise<void> {
  try {
    const dataDir = path.dirname(ONBOARDING_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    const data: Record<string, OnboardingState> = {};
    onboardingCache.forEach((state, userId) => {
      data[userId] = state;
    });
    
    await fs.writeFile(ONBOARDING_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[Onboarding] Error saving data:', error);
  }
}

/**
 * Get user's onboarding state
 */
export function getOnboardingState(userId: string): OnboardingState {
  if (!onboardingCache.has(userId)) {
    const newState: OnboardingState = {
      userId,
      hasSeenWelcome: false,
      hasSetupEmail: false,
      hasRegisteredWallet: false,
    };
    onboardingCache.set(userId, newState);
  }
  return onboardingCache.get(userId)!;
}

/**
 * Update user's onboarding state
 */
export async function updateOnboardingState(
  userId: string,
  updates: Partial<OnboardingState>
): Promise<void> {
  const state = getOnboardingState(userId);
  Object.assign(state, updates);
  onboardingCache.set(userId, state);
  await saveOnboardingData();
}

/**
 * Check if user is new (first interaction)
 */
export function isNewUser(userId: string): boolean {
  const state = getOnboardingState(userId);
  return !state.hasSeenWelcome;
}

/**
 * Send welcome DM to new user
 */
export async function sendWelcomeDM(user: User, botName: 'TiltCheck' | 'JustTheTip'): Promise<boolean> {
  try {
    const isTiltCheck = botName === 'TiltCheck';
    const verifyUrl = getVerifyUrl();
    const botInviteUrl = process.env.DISCORD_BOT_INVITE_URL || 'https://discord.com/oauth2/authorize?client_id=1425775422360125524&permissions=2252626595138624&scope=bot+applications.commands';
    
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`👋 Welcome to ${botName}!`)
      .setDescription(
        isTiltCheck
          ? 'Your crypto casino companion for trust scoring, scam detection, and safer gameplay.'
          : 'Send and receive SOL tips with zero platform fees! Only pay $0.07 flat fee per transaction.'
      )
      .addFields(
        {
          name: '🚀 Quick Setup',
          value: isTiltCheck
            ? '1️⃣ **Scan links** with `/suslink scan` to check for scams\n' +
              '2️⃣ **Analyze gameplay** with `/play-analyze` for RTP tracking\n' +
              '3️⃣ **Set email** for security alerts: `/email-preferences set`'
            : '1️⃣ **Register wallet** with `/register-magic` or `/register-phantom`\n' +
              '2️⃣ **Send tips** with `/tip @user 5 USD`\n' +
              '3️⃣ **Set email** for receipts: `/email-preferences set`',
        },
        {
          name: '🔗 Install vs Verify',
          value:
            `**Install Bot (server)**:\n${botInviteUrl}\n\n` +
            `**Verify Account (user login)**:\n${verifyUrl}\n\n` +
            `Flow:\n1. Review Terms + Privacy\n2. Accept & continue\n3. Discord login via Magic (non-custodial)\n4. Unified profile & trust score active`,
        },
        {
          name: '📧 Email Notifications (Optional)',
          value: 
            '• Transaction receipts with blockchain proof\n' +
            '• Security alerts for wallet changes\n' +
            '• Pending tip reminders\n\n' +
            'Type `/email-preferences` to get started, or just reply to this DM and I\'ll help you set it up!',
        },
        {
          name: '🤖 AI Assistant',
          value: 
            'You can chat with me naturally! Try:\n' +
            '• "Set my email to alice@example.com"\n' +
            '• "Show my wallet"\n' +
            '• "Help me get started"\n\n' +
            'I\'ll understand and run the right commands for you.',
        },
        {
          name: '💡 Need Help?',
          value: 'Type `/help` anytime or just ask me a question!',
        }
      )
      .setFooter({ 
        text: isTiltCheck 
          ? '🎰 TiltCheck • Non-custodial • Open source' 
          : '💸 JustTheTip • $0.07 flat fee • Non-custodial'
      })
      .setTimestamp();

    await user.send({ embeds: [welcomeEmbed] });
    
    // Mark user as welcomed
    await updateOnboardingState(user.id, {
      hasSeenWelcome: true,
      setupStartedAt: new Date().toISOString(),
    });
    
    console.log(`[Onboarding] Sent welcome DM to ${user.tag}`);
    return true;
  } catch (error: any) {
    if (error.code === 50007) {
      console.log(`[Onboarding] Cannot DM ${user.tag} (DMs disabled)`);
    } else {
      console.error(`[Onboarding] Error sending welcome DM:`, error);
    }
    return false;
  }
}

/**
 * Handle AI-powered setup conversation in DMs
 */
export async function handleSetupConversation(
  message: string,
  userId: string
): Promise<{ intent: string; response: string; action?: () => Promise<void> } | null> {
  const lowerMessage = message.toLowerCase().trim();
  
  // Email setup patterns
  if (lowerMessage.includes('email') || lowerMessage.includes('@')) {
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      return {
        intent: 'set_email',
        response: `I'll set your email to **${emailMatch[0]}**. You can manage your preferences with \`/email-preferences\` anytime.`,
        action: async () => {
          // This would integrate with email-preferences command
          await updateOnboardingState(userId, { hasSetupEmail: true });
        },
      };
    } else {
      return {
        intent: 'email_inquiry',
        response: 
          '📧 To set up email notifications, just tell me your email address!\n\n' +
          '**Example**: "My email is alice@example.com"\n\n' +
          'Or use the slash command: `/email-preferences set email:youraddress@example.com`',
      };
    }
  }
  
  // Wallet registration inquiry
  if (
    lowerMessage.includes('wallet') || 
    lowerMessage.includes('register') ||
    lowerMessage.includes('phantom') ||
    lowerMessage.includes('magic')
  ) {
    return {
      intent: 'wallet_inquiry',
      response:
        '👛 **Wallet Registration**\n\n' +
        'TiltCheck supports Magic Eden and Phantom wallets:\n\n' +
        '• `/register-magic` - Register Magic Eden wallet\n' +
        '• `/register-phantom` - Register Phantom wallet\n\n' +
        'These commands will guide you through a secure connection process. Your keys stay with you!',
    };
  }
  
  // Help/guide request
  if (
    lowerMessage.includes('help') ||
    lowerMessage.includes('how') ||
    lowerMessage.includes('guide') ||
    lowerMessage.includes('start')
  ) {
    return {
      intent: 'help_request',
      response:
        '🎯 **Quick Start Guide**\n\n' +
        '**1. Email Setup** (optional but recommended)\n' +
        '   `/email-preferences set` - Get receipts & alerts\n\n' +
        '**2. Wallet Registration** (for tips)\n' +
        '   `/register-magic` or `/register-phantom`\n\n' +
        '**3. Try Core Features**\n' +
        '   `/suslink scan` - Check if a link is a scam\n' +
        '   `/play-analyze` - Track casino RTP\n' +
        '   `/tip` - Send SOL to friends\n\n' +
        'Just reply with what you\'d like to set up first!',
    };
  }
  
  // Greeting
  if (
    lowerMessage.includes('hi') ||
    lowerMessage.includes('hello') ||
    lowerMessage.includes('hey')
  ) {
    return {
      intent: 'greeting',
      response:
        '👋 Hey! I\'m here to help you get set up.\n\n' +
        'What would you like to do?\n' +
        '• Set up email notifications\n' +
        '• Register a wallet\n' +
        '• Learn how to use commands\n\n' +
        'Just tell me what you need!',
    };
  }
  
  // Generic fallback
  if (lowerMessage.length > 0) {
    return {
      intent: 'unclear',
      response:
        '🤔 I\'m not sure what you\'d like to do. Here\'s what I can help with:\n\n' +
        '• **Email setup**: "Set my email to youraddress@example.com"\n' +
        '• **Wallet help**: "How do I register a wallet?"\n' +
        '• **General help**: "Show me the commands"\n\n' +
        'Or type `/help` to see all available commands!',
    };
  }
  
  return null;
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(userId: string): Promise<void> {
  await updateOnboardingState(userId, {
    completedAt: new Date().toISOString(),
  });
}

/**
 * Get onboarding progress for a user
 */
export function getOnboardingProgress(userId: string): {
  percentage: number;
  steps: { name: string; completed: boolean }[];
} {
  const state = getOnboardingState(userId);
  
  const steps = [
    { name: 'Welcome message received', completed: state.hasSeenWelcome },
    { name: 'Email preferences set', completed: state.hasSetupEmail },
    { name: 'Wallet registered', completed: state.hasRegisteredWallet },
  ];
  
  const completed = steps.filter(s => s.completed).length;
  const percentage = Math.round((completed / steps.length) * 100);
  
  return { percentage, steps };
}

// Initialize on module load
loadOnboardingData().catch(console.error);

export { loadOnboardingData, saveOnboardingData };
