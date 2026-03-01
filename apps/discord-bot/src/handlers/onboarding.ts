/**
 * Onboarding System for TiltCheck Safety Bot
 * Handles first-time user welcome and safety preferences
 *
 * Storage: Uses Supabase (free tier) with in-memory cache for fast reads.
 * Falls back to memory-only if Supabase is not configured.
 */
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  User,
  MessageComponentInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  DMChannel,
} from 'discord.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client for persistent storage (free tier)
let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('[Onboarding] Using Supabase for persistence (free tier)');
} else {
  console.log('[Onboarding] Supabase not configured - onboarding data will be stored in memory only');
}

// In-memory cache for fast reads
const onboardedUsers = new Set<string>();
const userPreferences = new Map<string, UserPreferences>();

interface UserPreferences {
  userId: string;
  discordId: string;
  joinedAt: number;
  notifications: {
    tips: boolean;
    trivia: boolean;
    promos: boolean;
  };
  riskLevel: 'conservative' | 'moderate' | 'degen';
  cooldownEnabled: boolean;
  dailyLimit?: number;
  hasAcceptedTerms: boolean;
  degenId?: string; // Future NFT-based ID
}

/**
 * Load onboarding data from Supabase into memory cache
 */
async function loadOnboardingData(): Promise<void> {
  if (!supabase) {
    console.log('[Onboarding] No Supabase configured, starting with empty cache');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*');

    if (error) {
      console.error('[Onboarding] Failed to load from Supabase:', error);
      return;
    }

    if (data) {
      for (const row of data) {
        if (row.is_onboarded) {
          onboardedUsers.add(row.discord_id);
        }

        const prefs: UserPreferences = {
          userId: row.discord_id,
          discordId: row.discord_id,
          joinedAt: new Date(row.joined_at).getTime(),
          notifications: {
            tips: row.notifications_tips,
            trivia: row.notifications_trivia,
            promos: row.notifications_promos,
          },
          riskLevel: row.risk_level || 'moderate',
          cooldownEnabled: row.cooldown_enabled,
          dailyLimit: row.daily_limit,
          hasAcceptedTerms: row.has_accepted_terms,
        };
        userPreferences.set(row.discord_id, prefs);
      }
      console.log(`[Onboarding] Loaded ${onboardedUsers.size} onboarded users from Supabase`);
    }
  } catch (error) {
    console.error('[Onboarding] Failed to load onboarding data:', error);
  }
}

/**
 * Save user onboarding to Supabase
 */
async function saveOnboardingToDb(userId: string, prefs: UserPreferences): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        discord_id: userId,
        is_onboarded: onboardedUsers.has(userId),
        has_accepted_terms: prefs.hasAcceptedTerms,
        risk_level: prefs.riskLevel,
        cooldown_enabled: prefs.cooldownEnabled,
        daily_limit: prefs.dailyLimit,
        notifications_tips: prefs.notifications.tips,
        notifications_trivia: prefs.notifications.trivia,
        notifications_promos: prefs.notifications.promos,
        joined_at: new Date(prefs.joinedAt).toISOString(),
      }, { onConflict: 'discord_id' });

    if (error) {
      console.error('[Onboarding] Failed to save to Supabase:', error);
    } else {
      console.log(`[Onboarding] Saved user ${userId} to Supabase`);
    }
  } catch (error) {
    console.error('[Onboarding] Failed to save onboarding data:', error);
  }
}

/**
 * Mark user as onboarded in Supabase
 */
async function markOnboardedInDb(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        discord_id: userId,
        is_onboarded: true,
        joined_at: new Date().toISOString(),
      }, { onConflict: 'discord_id' });

    if (error) {
      console.error('[Onboarding] Failed to mark onboarded in Supabase:', error);
    }
  } catch (error) {
    console.error('[Onboarding] Failed to mark onboarded:', error);
  }
}

// Load onboarding data on module initialization
loadOnboardingData().catch(console.error);

/**
 * Check if user needs onboarding
 */
export function needsOnboarding(userId: string): boolean {
  return !onboardedUsers.has(userId) && !userPreferences.has(userId);
}

/**
 * Mark user as onboarded
 */
export function markOnboarded(userId: string): void {
  onboardedUsers.add(userId);
  // Save immediately when user is onboarded
  markOnboardedInDb(userId).catch(console.error);
}

/**
 * Get user preferences
 */
export function getUserPreferences(userId: string): UserPreferences | undefined {
  return userPreferences.get(userId);
}

/**
 * Save user preferences
 */
export function saveUserPreferences(prefs: UserPreferences): void {
  userPreferences.set(prefs.userId, prefs);
  onboardedUsers.add(prefs.userId);
  // Persist to Supabase
  saveOnboardingToDb(prefs.userId, prefs).catch(console.error);
}

/**
 * Send welcome DM to new user
 */
export async function sendWelcomeDM(user: User): Promise<boolean> {
  try {
    const dmChannel = await user.createDM();

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x00D4AA)
      .setTitle('Welcome to TiltCheck')
      .setDescription(
        `Hi **${user.username}**. I'm **TiltCheck** - a safety bot for responsible play in Discord.\n\n` +
        `I'm here to help you:\n` +
        `- Scan links and spot scams\n` +
        `- Check casino trust and fairness signals\n` +
        `- Start cooldowns when you need a break\n` +
        `- Get safety nudges based on your risk level\n\n` +
        `This bot does not custody funds. Tips and wallets live in **JustTheTip**.\n\n` +
        `Ready to set up your safety preferences?`
      )
      .setThumbnail('https://tiltcheck.me/assets/logo/favicon-white.svg')
      .setFooter({ text: 'TiltCheck Safety Bot - Powered by TiltCheck - Est. 2024' });

    const getStartedBtn = new ButtonBuilder()
      .setCustomId('onboard_start')
      .setLabel('Get Started')
      .setStyle(ButtonStyle.Success);

    const learnMoreBtn = new ButtonBuilder()
      .setCustomId('onboard_learn')
      .setLabel('Learn More')
      .setStyle(ButtonStyle.Secondary);

    const maybeLaterBtn = new ButtonBuilder()
      .setCustomId('onboard_later')
      .setLabel('Maybe Later')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(getStartedBtn, learnMoreBtn, maybeLaterBtn);

    await dmChannel.send({ embeds: [welcomeEmbed], components: [row] });
    return true;
  } catch (error) {
    console.error('[Onboarding] Failed to send welcome DM:', error);
    return false;
  }
}

/**
 * Handle onboarding button interactions
 */
export async function handleOnboardingInteraction(
  interaction: MessageComponentInteraction
): Promise<void> {
  switch (interaction.customId) {
    case 'onboard_start':
      await showTermsAndConditions(interaction);
      break;

    case 'onboard_learn':
      await showLearnMore(interaction);
      break;

    case 'onboard_later':
      await interaction.update({
        content: 'No worries. When you are ready, run `/tiltcheck status` or `/help` to get started.',
        embeds: [],
        components: [],
      });
      break;

    case 'onboard_accept_terms':
      await showPreferences(interaction);
      break;

    case 'onboard_decline_terms':
      await interaction.update({
        content: 'All good. You can come back any time with `/tiltcheck status` or `/help`.',
        embeds: [],
        components: [],
      });
      break;

    case 'onboard_complete':
      await completeOnboarding(interaction);
      break;

    default:
      if (interaction.customId.startsWith('onboard_pref_')) {
        await handlePreferenceSelection(interaction);
      }
  }
}

/**
 * Show terms and conditions
 */
async function showTermsAndConditions(interaction: MessageComponentInteraction): Promise<void> {
  const termsEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('Quick Terms')
    .setDescription(
      `Before we proceed:\n\n` +
      `**Safety First**\n` +
      `TiltCheck provides tools like cooldowns and trust checks to help you stay in control.\n\n` +
      `**Your Responsibility**\n` +
      `You are responsible for your own decisions. Use these tools responsibly.\n\n` +
      `**No Financial Advice**\n` +
      `Nothing here is financial advice.\n\n` +
      `**Privacy**\n` +
      `We store your Discord ID and safety preferences only.\n\n` +
      `By continuing, you agree to use TiltCheck responsibly.`
    );

  const acceptBtn = new ButtonBuilder()
    .setCustomId('onboard_accept_terms')
    .setLabel('I Accept')
    .setStyle(ButtonStyle.Success);

  const declineBtn = new ButtonBuilder()
    .setCustomId('onboard_decline_terms')
    .setLabel('Decline')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(acceptBtn, declineBtn);

  await interaction.update({ embeds: [termsEmbed], components: [row] });
}

/**
 * Show learn more information
 */
async function showLearnMore(interaction: MessageComponentInteraction): Promise<void> {
  const learnEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('What is TiltCheck')
    .setDescription(
      `**TiltCheck** is a safety bot for responsible play in Discord.\n\n` +
      `**Check your status**\n` +
      `/tiltcheck status\n\n` +
      `**Start a cooldown**\n` +
      `/tiltcheck cooldown 30\n\n` +
      `**Scan a link**\n` +
      `/tiltcheck suslink scan url:<url>\n\n` +
      `**Check a casino**\n` +
      `/tiltcheck casino domain:<domain>\n\n` +
      `**Ecosystem**\n` +
      `Tips and wallets are handled by **JustTheTip**. Bonus timers and promos live in **CollectClock**.`
    )
    .setFooter({ text: 'Ready to get started? Click below.' });

  const startBtn = new ButtonBuilder()
    .setCustomId('onboard_start')
    .setLabel('Set Me Up')
    .setStyle(ButtonStyle.Success);

  const websiteBtn = new ButtonBuilder()
    .setLabel('Visit Website')
    .setStyle(ButtonStyle.Link)
    .setURL('https://tiltcheck.me');

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(startBtn, websiteBtn);

  await interaction.update({ embeds: [learnEmbed], components: [row] });
}

/**
 * Show preferences setup (via interaction update)
 */
async function showPreferences(interaction: MessageComponentInteraction): Promise<void> {
  const prefs: UserPreferences = userPreferences.get(interaction.user.id) ?? {
    userId: interaction.user.id,
    discordId: interaction.user.id,
    joinedAt: Date.now(),
    notifications: { tips: true, trivia: true, promos: false },
    riskLevel: 'moderate',
    cooldownEnabled: false,
    hasAcceptedTerms: true,
  };
  userPreferences.set(interaction.user.id, prefs);

  const prefsEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('Set Your Preferences')
    .setDescription(
      `Almost done. Customize your experience.\n\n` +
      `**Notifications**\n` +
      `Choose what you want to be notified about.\n\n` +
      `**Risk Level**\n` +
      `This affects default cooldown suggestions and safety nudges.`
    );

  const notifSelect = new StringSelectMenuBuilder()
    .setCustomId('onboard_pref_notifications')
    .setPlaceholder('Select notification preferences')
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Tip Notifications')
        .setDescription('Get notified when you receive tips (JustTheTip)')
        .setValue('tips')
        .setDefault(true),
      new StringSelectMenuOptionBuilder()
        .setLabel('Trivia Alerts')
        .setDescription('Get pinged when trivia drops start')
        .setValue('trivia'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Promo Updates')
        .setDescription('Hear about new promos and bonuses')
        .setValue('promos')
    );

  const notifRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(notifSelect);

  const conservativeBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_conservative')
    .setLabel('Conservative')
    .setStyle(ButtonStyle.Secondary);

  const moderateBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_moderate')
    .setLabel('Moderate')
    .setStyle(ButtonStyle.Primary);

  const degenBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_degen')
    .setLabel('Full Degen')
    .setStyle(ButtonStyle.Danger);

  const riskRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(conservativeBtn, moderateBtn, degenBtn);

  const completeBtn = new ButtonBuilder()
    .setCustomId('onboard_complete')
    .setLabel('Complete Setup')
    .setStyle(ButtonStyle.Success);

  const completeRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(completeBtn);

  await interaction.update({
    embeds: [prefsEmbed],
    components: [notifRow, riskRow, completeRow],
  });
}

/**
 * Show preferences via direct message (exported for future use)
 */
export async function showPreferencesMessage(channel: DMChannel, _userId: string): Promise<void> {
  const prefsEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('Set Your Preferences')
    .setDescription(
      `Almost done. Pick your risk level:\n\n` +
      `Conservative - More cooldown reminders, lower limits suggested\n` +
      `Moderate - Balanced approach (default)\n` +
      `Full Degen - Minimal hand-holding`
    );

  const conservativeBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_conservative')
    .setLabel('Conservative')
    .setStyle(ButtonStyle.Secondary);

  const moderateBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_moderate')
    .setLabel('Moderate')
    .setStyle(ButtonStyle.Primary);

  const degenBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_degen')
    .setLabel('Full Degen')
    .setStyle(ButtonStyle.Danger);

  const riskRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(conservativeBtn, moderateBtn, degenBtn);

  const completeBtn = new ButtonBuilder()
    .setCustomId('onboard_complete')
    .setLabel('Complete Setup')
    .setStyle(ButtonStyle.Success);

  const completeRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(completeBtn);

  await channel.send({
    embeds: [prefsEmbed],
    components: [riskRow, completeRow],
  });
}

/**
 * Handle preference selection
 */
async function handlePreferenceSelection(interaction: MessageComponentInteraction): Promise<void> {
  const prefs = userPreferences.get(interaction.user.id);
  if (!prefs) return;

  if (interaction.customId === 'onboard_pref_notifications' && interaction.isStringSelectMenu()) {
    const values = interaction.values;
    prefs.notifications = {
      tips: values.includes('tips'),
      trivia: values.includes('trivia'),
      promos: values.includes('promos'),
    };
    await interaction.deferUpdate();
  } else if (interaction.customId.startsWith('onboard_pref_risk_')) {
    const risk = interaction.customId.replace('onboard_pref_risk_', '') as 'conservative' | 'moderate' | 'degen';
    prefs.riskLevel = risk;

    // Set cooldown based on risk level
    prefs.cooldownEnabled = risk !== 'degen';

    const message = risk === 'degen'
      ? 'No limits. You are in control.'
      : risk === 'conservative'
        ? 'Playing it safe. Cooldowns will be suggested more often.'
        : 'Balanced approach selected.';

    await interaction.reply({
      content: `Risk level set to **${risk}**. ${message}`,
      ephemeral: true,
    });
  }

  userPreferences.set(interaction.user.id, prefs);
}

/**
 * Complete the onboarding process
 */
async function completeOnboarding(interaction: MessageComponentInteraction): Promise<void> {
  const prefs = userPreferences.get(interaction.user.id);

  markOnboarded(interaction.user.id);

  const notifications = [
    prefs?.notifications.tips ? 'Tips (JustTheTip)' : null,
    prefs?.notifications.trivia ? 'Trivia' : null,
    prefs?.notifications.promos ? 'Promos' : null,
  ].filter(Boolean).join(', ') || 'None';

  const completedEmbed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('You are all set')
    .setDescription(
      `Welcome to TiltCheck, **${interaction.user.username}**.\n\n` +
      `**Your Setup:**\n` +
      `- Risk Level: ${prefs?.riskLevel || 'Moderate'}\n` +
      `- Notifications: ${notifications}\n\n` +
      `**Quick Commands:**\n` +
      `/tiltcheck status - Check your safety state\n` +
      `/tiltcheck cooldown 30 - Start a 30 minute break\n` +
      `/tiltcheck suslink scan url:<url> - Scan a link\n` +
      `/tiltcheck casino domain:<domain> - Check casino trust\n` +
      `/help - Full command list\n\n` +
      `Questions? Use /support or join our Discord.`
    )
    .setFooter({ text: 'TiltCheck Safety Bot - Powered by TiltCheck - Stay safe out there.' });

  const discordBtn = new ButtonBuilder()
    .setLabel('Join TiltCheck Discord')
    .setStyle(ButtonStyle.Link)
    .setURL('https://discord.gg/s6NNfPHxMS');

  const websiteBtn = new ButtonBuilder()
    .setLabel('Visit Website')
    .setStyle(ButtonStyle.Link)
    .setURL('https://tiltcheck.me');

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(discordBtn, websiteBtn);

  await interaction.update({ embeds: [completedEmbed], components: [row] });
}

/**
 * Check if user is onboarded and trigger welcome if not
 */
export async function checkAndOnboard(user: User): Promise<boolean> {
  if (!needsOnboarding(user.id)) {
    return false; // Already onboarded
  }

  const dmSent = await sendWelcomeDM(user);
  return dmSent;
}
