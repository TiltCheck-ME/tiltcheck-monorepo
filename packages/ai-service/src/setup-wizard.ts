/**
 * AI-Powered Setup Wizard
 * Uses Vercel AI SDK to understand natural language setup requests
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const AI_ENABLED = !!process.env.OPENAI_API_KEY;

export const SetupIntentSchema = z.enum([
  'set_email',
  'register_wallet',
  'enable_notifications',
  'disable_notifications',
  'view_preferences',
  'help',
  'greeting',
  'unclear',
]);

export const SetupActionSchema = z.object({
  intent: SetupIntentSchema,
  email: z.string().email().optional(),
  walletType: z.enum(['phantom', 'magic', 'solflare']).optional(),
  notificationType: z.enum(['transaction_receipts', 'security_alerts', 'pending_tips']).optional(),
  enableNotification: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
  suggestedResponse: z.string(),
});

export type SetupIntent = z.infer<typeof SetupIntentSchema>;
export type SetupAction = z.infer<typeof SetupActionSchema>;

/**
 * Parse natural language setup request using AI
 */
export async function parseSetupRequest(
  userMessage: string,
  userId: string
): Promise<SetupAction> {
  if (!AI_ENABLED) {
    return fallbackSetupParser(userMessage);
  }

  try {
    const systemPrompt = `You are a helpful setup assistant for TiltCheck Discord bot.

Your job is to understand what the user wants to do and extract structured data.

Common setup tasks:
- Set email for notifications (e.g., "my email is alice@example.com")
- Register a wallet (e.g., "I want to use Phantom wallet")
- Enable/disable notification types
- Get help with setup

Parse the user's message and return ONLY valid JSON matching this schema:
{
  "intent": "set_email|register_wallet|enable_notifications|disable_notifications|view_preferences|help|greeting|unclear",
  "email": "valid email if provided",
  "walletType": "phantom|magic|solflare if mentioned",
  "notificationType": "transaction_receipts|security_alerts|pending_tips if mentioned",
  "enableNotification": true/false if toggling notifications,
  "confidence": 0-1 (how confident you are),
  "suggestedResponse": "friendly response to the user confirming action or asking for clarification"
}

Be friendly, conversational, and use the TiltCheck brand voice:
- Non-judgmental
- Helpful and encouraging
- Clear and direct
- Emoji usage is fine (✅, 📧, 👛)

Examples:

User: "my email is alice@example.com"
Response: {
  "intent": "set_email",
  "email": "alice@example.com",
  "confidence": 0.95,
  "suggestedResponse": "✅ Got it! I'll set your email to **alice@example.com**. You'll receive transaction receipts, security alerts, and tip reminders. Use \`/email-preferences\` to adjust what you receive."
}

User: "turn on receipt emails"
Response: {
  "intent": "enable_notifications",
  "notificationType": "transaction_receipts",
  "enableNotification": true,
  "confidence": 0.9,
  "suggestedResponse": "📧 Enabled transaction receipt emails! You'll get confirmation emails whenever you send or receive tips."
}

User: "I have a phantom wallet"
Response: {
  "intent": "register_wallet",
  "walletType": "phantom",
  "confidence": 0.85,
  "suggestedResponse": "👛 Great! To register your Phantom wallet, use the command \`/register-phantom\`. It'll guide you through a secure connection. Your keys stay with you!"
}

User: "help me get started"
Response: {
  "intent": "help",
  "confidence": 1.0,
  "suggestedResponse": "🎯 I can help you set up:\\n\\n**Email** - Get receipts and alerts\\n**Wallet** - Register Phantom or Magic Eden\\n**Preferences** - Choose which notifications you want\\n\\nWhat would you like to set up first?"
}

Now parse this user message:`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.3,
      maxTokens: 500,
    });

    const parsed = JSON.parse(result.text);
    return SetupActionSchema.parse(parsed);
  } catch (error) {
    console.error('[SetupWizard] AI parsing failed, using fallback:', error);
    return fallbackSetupParser(userMessage);
  }
}

/**
 * Fallback parser when AI is unavailable
 */
function fallbackSetupParser(message: string): SetupAction {
  const lower = message.toLowerCase().trim();
  
  // Email detection
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch || lower.includes('email')) {
    if (emailMatch) {
      return {
        intent: 'set_email',
        email: emailMatch[0],
        confidence: 0.8,
        suggestedResponse: `✅ I'll set your email to **${emailMatch[0]}**. Use \`/email-preferences\` to manage your notification settings.`,
      };
    } else {
      return {
        intent: 'set_email',
        confidence: 0.5,
        suggestedResponse: '📧 To set your email, just tell me the address! Example: "my email is alice@example.com"',
      };
    }
  }
  
  // Wallet detection
  if (lower.includes('phantom')) {
    return {
      intent: 'register_wallet',
      walletType: 'phantom',
      confidence: 0.8,
      suggestedResponse: '👛 To register your Phantom wallet, use `/register-phantom`. It\'ll guide you securely!',
    };
  }
  
  if (lower.includes('magic')) {
    return {
      intent: 'register_wallet',
      walletType: 'magic',
      confidence: 0.8,
      suggestedResponse: '👛 To register your Magic Eden wallet, use `/register-magic`. Quick and secure!',
    };
  }
  
  if (lower.includes('wallet')) {
    return {
      intent: 'register_wallet',
      confidence: 0.6,
      suggestedResponse: '👛 TiltCheck supports Phantom and Magic Eden wallets. Which do you use? Or try `/register-phantom` or `/register-magic`.',
    };
  }
  
  // Notification preferences
  if (lower.includes('receipt') || lower.includes('transaction')) {
    const enable = !lower.includes('off') && !lower.includes('disable') && !lower.includes('stop');
    return {
      intent: enable ? 'enable_notifications' : 'disable_notifications',
      notificationType: 'transaction_receipts',
      enableNotification: enable,
      confidence: 0.7,
      suggestedResponse: enable
        ? '📧 Transaction receipt emails enabled! You\'ll get confirmations for all tips.'
        : '📧 Transaction receipt emails disabled. You can re-enable anytime with `/email-preferences`.',
    };
  }
  
  if (lower.includes('security') || lower.includes('alert')) {
    const enable = !lower.includes('off') && !lower.includes('disable') && !lower.includes('stop');
    return {
      intent: enable ? 'enable_notifications' : 'disable_notifications',
      notificationType: 'security_alerts',
      enableNotification: enable,
      confidence: 0.7,
      suggestedResponse: enable
        ? '🔐 Security alert emails enabled! You\'ll be notified of any wallet changes.'
        : '🔐 Security alert emails disabled. You can re-enable anytime with `/email-preferences`.',
    };
  }
  
  // Help requests
  if (lower.includes('help') || lower.includes('how') || lower.includes('guide') || lower.includes('start')) {
    return {
      intent: 'help',
      confidence: 0.9,
      suggestedResponse:
        '🎯 **Quick Setup Guide**\\n\\n' +
        '**Email**: "Set my email to youraddress@example.com"\\n' +
        '**Wallet**: "I have a Phantom wallet"\\n' +
        '**Preferences**: "Turn on receipt emails"\\n\\n' +
        'Or use slash commands: `/email-preferences`, `/register-phantom`, `/help`',
    };
  }
  
  // Greetings
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
    return {
      intent: 'greeting',
      confidence: 0.95,
      suggestedResponse:
        '👋 Hey! I\'m your TiltCheck setup assistant. I can help you:\\n\\n' +
        '• Set up email notifications\\n' +
        '• Register your wallet\\n' +
        '• Configure preferences\\n\\n' +
        'What would you like to do?',
    };
  }
  
  // View preferences
  if (lower.includes('show') || lower.includes('view') || lower.includes('my')) {
    return {
      intent: 'view_preferences',
      confidence: 0.7,
      suggestedResponse: '📋 Use `/email-preferences view` to see all your current settings!',
    };
  }
  
  // Unclear intent
  return {
    intent: 'unclear',
    confidence: 0.3,
    suggestedResponse:
      '🤔 I\'m not sure what you\'d like to do. Try:\\n\\n' +
      '• "Set my email to alice@example.com"\\n' +
      '• "How do I register a wallet?"\\n' +
      '• "Turn on receipt emails"\\n\\n' +
      'Or use `/help` for all commands!',
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[\w.-]+@[\w.-]+\.\w{2,}$/;
  return emailRegex.test(email);
}

/**
 * Get setup completion percentage
 */
export function getSetupCompletionMessage(
  hasEmail: boolean,
  hasWallet: boolean
): { percentage: number; message: string } {
  const steps = [
    { name: 'Email setup', completed: hasEmail },
    { name: 'Wallet registration', completed: hasWallet },
  ];
  
  const completed = steps.filter(s => s.completed).length;
  const percentage = Math.round((completed / steps.length) * 100);
  
  let message = `⚡ Setup Progress: ${percentage}%\\n\\n`;
  
  steps.forEach(step => {
    message += step.completed ? `✅ ${step.name}\\n` : `⬜ ${step.name}\\n`;
  });
  
  if (percentage === 100) {
    message += '\\n🎉 All set! You\'re ready to use all features.';
  } else {
    const nextSteps = steps.filter(s => !s.completed).map(s => s.name);
    message += `\\n💡 Next: ${nextSteps.join(', ')}`;
  }
  
  return { percentage, message };
}
