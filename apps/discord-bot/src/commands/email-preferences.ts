import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { updateOnboardingState } from '@tiltcheck/discord-utils';
import fs from 'fs';
import path from 'path';

const PREFS_FILE = process.env.EMAIL_PREFS_FILE || path.join(process.cwd(), 'data', 'email-prefs.json');

interface EmailPreferences {
  email?: string;
  emailVerified: boolean;
  transactionReceipts: boolean;
  securityAlerts: boolean;
  pendingTipReminders: boolean;
}

// In-memory store
const emailPrefs = new Map<string, EmailPreferences>();

// Load from disk
function loadPrefs() {
  try {
    fs.mkdirSync(path.dirname(PREFS_FILE), { recursive: true });
    if (fs.existsSync(PREFS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PREFS_FILE, 'utf-8'));
      Object.entries(data).forEach(([userId, prefs]) => {
        emailPrefs.set(userId, prefs as EmailPreferences);
      });
    }
  } catch (error) {
    console.error('[EmailPrefs] Failed to load preferences:', error);
  }
}

// Save to disk
function savePrefs() {
  try {
    const data: Record<string, EmailPreferences> = {};
    emailPrefs.forEach((prefs, userId) => {
      data[userId] = prefs;
    });
    fs.writeFileSync(PREFS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[EmailPrefs] Failed to save preferences:', error);
  }
}

// Load on startup
loadPrefs();

// Get user preferences
export function getEmailPrefs(userId: string): EmailPreferences {
  return emailPrefs.get(userId) || {
    emailVerified: false,
    transactionReceipts: false,
    securityAlerts: false,
    pendingTipReminders: false,
  };
}

// Update user email
export function setUserEmail(userId: string, email: string) {
  const prefs = getEmailPrefs(userId);
  prefs.email = email;
  prefs.emailVerified = false; // Requires verification
  emailPrefs.set(userId, prefs);
  savePrefs();
}

// Verify user email
export function verifyUserEmail(userId: string) {
  const prefs = getEmailPrefs(userId);
  if (prefs.email) {
    prefs.emailVerified = true;
    emailPrefs.set(userId, prefs);
    savePrefs();
  }
}

// Update preferences
export function updatePrefs(userId: string, updates: Partial<EmailPreferences>) {
  const prefs = getEmailPrefs(userId);
  Object.assign(prefs, updates);
  emailPrefs.set(userId, prefs);
  savePrefs();
}

// Simple email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const emailPreferencesCommand = {
  data: new SlashCommandBuilder()
    .setName('email-preferences')
    .setDescription('Manage your email notification preferences')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set your email address')
        .addStringOption(option =>
          option
            .setName('email')
            .setDescription('Your email address')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current email preferences')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Toggle email notification types')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Notification type to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'Transaction Receipts', value: 'transactionReceipts' },
              { name: 'Security Alerts', value: 'securityAlerts' },
              { name: 'Pending Tip Reminders', value: 'pendingTipReminders' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your email address from our system')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === 'set') {
      const email = interaction.options.getString('email', true);

      if (!isValidEmail(email)) {
        return interaction.reply({
          content: '❌ Invalid email address. Please provide a valid email.',
          ephemeral: true,
        });
      }

      setUserEmail(userId, email);

      // Mark onboarding step as complete
      await updateOnboardingState(userId, { hasSetupEmail: true });

      // TODO: Send verification email via Resend
      // For now, auto-verify in development
      if (process.env.NODE_ENV !== 'production') {
        verifyUserEmail(userId);
      }

      return interaction.reply({
        content: `✅ Email set to: \`${email}\`\n\n` +
          (process.env.NODE_ENV === 'production'
            ? '📧 A verification email has been sent. Click the link to confirm.'
            : '✅ Email verified (development mode).\n\n') +
          `Use \`/email-preferences toggle\` to choose which notifications you want to receive.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'view') {
      const prefs = getEmailPrefs(userId);

      if (!prefs.email) {
        return interaction.reply({
          content: '📧 **Email Preferences**\n\n' +
            '❌ No email address set.\n\n' +
            'Use `/email-preferences set` to add your email and start receiving notifications!',
          ephemeral: true,
        });
      }

      const status = (enabled: boolean) => enabled ? '✅ Enabled' : '❌ Disabled';

      return interaction.reply({
        content: `📧 **Email Preferences**\n\n` +
          `**Email:** \`${prefs.email}\`\n` +
          `**Status:** ${prefs.emailVerified ? '✅ Verified' : '⚠️ Not verified'}\n\n` +
          `**Notifications:**\n` +
          `• Transaction Receipts: ${status(prefs.transactionReceipts)}\n` +
          `• Security Alerts: ${status(prefs.securityAlerts)}\n` +
          `• Pending Tip Reminders: ${status(prefs.pendingTipReminders)}\n\n` +
          `Use \`/email-preferences toggle\` to change your preferences.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'toggle') {
      const prefs = getEmailPrefs(userId);

      if (!prefs.email) {
        return interaction.reply({
          content: '❌ Please set your email first using `/email-preferences set`',
          ephemeral: true,
        });
      }

      const type = interaction.options.getString('type', true) as keyof Omit<EmailPreferences, 'email' | 'emailVerified'>;
      const newValue = !prefs[type];

      updatePrefs(userId, { [type]: newValue });

      const typeName = {
        transactionReceipts: 'Transaction Receipts',
        securityAlerts: 'Security Alerts',
        pendingTipReminders: 'Pending Tip Reminders',
      }[type];

      return interaction.reply({
        content: `✅ ${typeName} ${newValue ? 'enabled' : 'disabled'}`,
        ephemeral: true,
      });
    }

    if (subcommand === 'remove') {
      const prefs = getEmailPrefs(userId);

      if (!prefs.email) {
        return interaction.reply({
          content: '❌ No email address to remove.',
          ephemeral: true,
        });
      }

      emailPrefs.delete(userId);
      savePrefs();

      return interaction.reply({
        content: '✅ Your email address has been removed from our system.\n\n' +
          'You will no longer receive any email notifications.',
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: '❌ Unknown subcommand',
      ephemeral: true,
    });
  },
};

export default emailPreferencesCommand;
