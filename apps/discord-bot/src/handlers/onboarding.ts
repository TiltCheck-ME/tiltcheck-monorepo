// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
/**
 * Onboarding System for TiltCheck Safety Bot
 * Handles first-time user welcome and safety preferences.
 *
 * Canonical storage: API/Postgres via /me/onboarding-status.
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
import { ONBOARDING_QUESTIONS, calculateSuggestedRisk } from '@tiltcheck/utils';
import { config } from '../config.js';
import { getDashboardAppUrl } from '../utils/dashboard-url.js';

const onboardedUsers = new Set<string>();
const userPreferences = new Map<string, UserPreferences>();
const pendingLoads = new Map<string, Promise<OnboardingStatusResponse | null>>();
const pendingWrites = new Map<string, Promise<void>>();
const SITE_URL = process.env.SITE_URL || 'https://tiltcheck.me';
const DISCORD_INVITE_URL = process.env.DISCORD_INVITE_URL || 'https://discord.gg/gdBsEJfCar';
const API_BASE = (config.backendUrl || process.env.API_BASE_URL || 'https://api.tiltcheck.me').replace(/\/+$/, '');

type RiskLevel = 'conservative' | 'moderate' | 'degen';

interface UserPreferences {
  userId: string;
  discordId: string;
  joinedAt: number;
  notifications: {
    tips: boolean;
    trivia: boolean;
    promos: boolean;
  };
  riskLevel: RiskLevel;
  cooldownEnabled: boolean;
  voiceInterventionEnabled: boolean;
  dailyLimit?: number;
  hasAcceptedTerms: boolean;
  quizScores: Record<string, number>;
  tutorialCompleted: boolean;
  degenId?: string;
}

interface OnboardingStatusResponse {
  completedSteps: string[];
  completedAt: string | null;
  hasAcceptedTerms: boolean;
  riskLevel: RiskLevel | null;
  quizScores: Record<string, number>;
  preferences: {
    cooldownEnabled: boolean;
    voiceInterventionEnabled: boolean;
    dailyLimit: number | null;
    redeemThreshold: number | null;
    notifyNftIdentityReady: boolean;
    complianceBypass: boolean;
    dataSharing: {
      messageContents: boolean;
      financialData: boolean;
      sessionTelemetry: boolean;
    };
    notifications: {
      tips: boolean;
      trivia: boolean;
      promos: boolean;
    };
  };
}

interface OnboardingStatusUpdatePayload {
  step: 'terms' | 'quiz' | 'preferences' | 'completed';
  hasAcceptedTerms?: boolean;
  riskLevel?: RiskLevel;
  quizScores?: Record<string, number>;
  preferences?: {
    cooldownEnabled?: boolean;
    voiceInterventionEnabled?: boolean;
    dailyLimit?: number | null;
    redeemThreshold?: number | null;
    notifyNftIdentityReady?: boolean;
    complianceBypass?: boolean;
    dataSharing?: {
      messageContents?: boolean;
      financialData?: boolean;
      sessionTelemetry?: boolean;
    };
    notifications?: {
      tips?: boolean;
      trivia?: boolean;
      promos?: boolean;
    };
  };
}

function hasInternalApiAccess(): boolean {
  return Boolean(config.internalApiSecret?.trim());
}

function buildInternalHeaders(): HeadersInit {
  const secret = config.internalApiSecret?.trim();
  if (!secret) {
    throw new Error('INTERNAL_API_SECRET is required for bot onboarding sync');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
  };
}

function createDefaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    discordId: userId,
    joinedAt: Date.now(),
    notifications: { tips: true, trivia: true, promos: false },
    riskLevel: 'moderate',
    cooldownEnabled: true,
    voiceInterventionEnabled: false,
    hasAcceptedTerms: false,
    quizScores: {},
    tutorialCompleted: false,
  };
}

function hydratePreferencesFromStatus(userId: string, status: OnboardingStatusResponse): UserPreferences {
  const existing = userPreferences.get(userId);
  const joinedAt = status.completedAt ? Date.parse(status.completedAt) : NaN;
  return {
    userId,
    discordId: userId,
    joinedAt: Number.isNaN(joinedAt) ? existing?.joinedAt ?? Date.now() : joinedAt,
    notifications: {
      tips: status.preferences.notifications.tips,
      trivia: status.preferences.notifications.trivia,
      promos: status.preferences.notifications.promos,
    },
    riskLevel: status.riskLevel ?? existing?.riskLevel ?? 'moderate',
    cooldownEnabled: status.preferences.cooldownEnabled,
    voiceInterventionEnabled: status.preferences.voiceInterventionEnabled,
    dailyLimit: status.preferences.dailyLimit ?? undefined,
    hasAcceptedTerms: status.hasAcceptedTerms,
    quizScores: status.quizScores ?? {},
    tutorialCompleted: status.completedSteps.includes('completed'),
    degenId: existing?.degenId,
  };
}

function applyStatusToCache(userId: string, status: OnboardingStatusResponse | null): void {
  if (!status) {
    onboardedUsers.delete(userId);
    userPreferences.delete(userId);
    return;
  }

  const prefs = hydratePreferencesFromStatus(userId, status);
  userPreferences.set(userId, prefs);

  if (status.completedSteps.includes('completed')) {
    onboardedUsers.add(userId);
  } else {
    onboardedUsers.delete(userId);
  }
}

async function fetchOnboardingStatusFromApi(userId: string): Promise<OnboardingStatusResponse | null> {
  if (!hasInternalApiAccess()) {
    return null;
  }

  const response = await fetch(`${API_BASE}/me/onboarding-status?discordId=${encodeURIComponent(userId)}`, {
    headers: buildInternalHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load onboarding status (${response.status})`);
  }

  return await response.json() as OnboardingStatusResponse;
}

async function loadUserOnboardingStatus(userId: string): Promise<OnboardingStatusResponse | null> {
  const cachedRequest = pendingLoads.get(userId);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = (async () => {
    try {
      const status = await fetchOnboardingStatusFromApi(userId);
      applyStatusToCache(userId, status);
      return status;
    } catch (error) {
      console.error(`[Onboarding] Failed to load onboarding state for ${userId}:`, error);
      return null;
    } finally {
      pendingLoads.delete(userId);
    }
  })();

  pendingLoads.set(userId, request);
  return request;
}

async function postOnboardingUpdate(userId: string, payload: OnboardingStatusUpdatePayload): Promise<void> {
  if (!hasInternalApiAccess()) {
    console.warn(`[Onboarding] INTERNAL_API_SECRET missing. Skipping canonical onboarding sync for ${userId}.`);
    return;
  }

  const queuedWrite = pendingWrites.get(userId) ?? Promise.resolve();
  const nextWrite = queuedWrite
    .catch(() => undefined)
    .then(async () => {
      const response = await fetch(`${API_BASE}/me/onboarding-status`, {
        method: 'POST',
        headers: buildInternalHeaders(),
        body: JSON.stringify({
          discordId: userId,
          ...payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update onboarding status (${response.status})`);
      }

      const status = await response.json() as OnboardingStatusResponse;
      applyStatusToCache(userId, status);
    })
    .catch((error) => {
      console.error(`[Onboarding] Failed to sync onboarding state for ${userId}:`, error);
      throw error;
    })
    .finally(() => {
      if (pendingWrites.get(userId) === nextWrite) {
        pendingWrites.delete(userId);
      }
    });

  pendingWrites.set(userId, nextWrite);
  await nextWrite;
}

export async function needsOnboarding(userId: string): Promise<boolean> {
  return !(await isUserOnboarded(userId));
}

export async function isUserOnboarded(userId: string): Promise<boolean> {
  if (onboardedUsers.has(userId)) {
    return true;
  }

  const status = await loadUserOnboardingStatus(userId);
  return Boolean(status?.completedSteps.includes('completed'));
}

export function getWebsiteOnboardingUrl(): string {
  return new URL('/login?redirect=%2Fdashboard', SITE_URL).toString();
}

export function getDashboardUrl(): string {
  return getDashboardAppUrl();
}

export function getBetaTesterUrl(): string {
  return `${SITE_URL}/beta-tester`;
}

/**
 * Mark user as onboarded
 */
export function markOnboarded(userId: string): void {
  onboardedUsers.add(userId);
  const prefs = userPreferences.get(userId) ?? createDefaultPreferences(userId);
  prefs.hasAcceptedTerms = true;
  prefs.tutorialCompleted = true;
  userPreferences.set(userId, prefs);
  void postOnboardingUpdate(userId, {
    step: 'completed',
    hasAcceptedTerms: true,
    riskLevel: prefs.riskLevel,
    quizScores: prefs.quizScores,
    preferences: {
      cooldownEnabled: prefs.cooldownEnabled,
      voiceInterventionEnabled: prefs.voiceInterventionEnabled,
      dailyLimit: prefs.dailyLimit ?? null,
      notifications: prefs.notifications,
    },
  });
}

/**
 * Get user preferences
 */
export function getUserPreferences(userId: string): UserPreferences | undefined {
  return userPreferences.get(userId);
}

export function getCachedUserPreferences(userId: string): UserPreferences | undefined {
  return userPreferences.get(userId);
}

export async function getUserPreferencesAsync(userId: string): Promise<UserPreferences | undefined> {
  const cached = userPreferences.get(userId);
  if (cached) {
    return cached;
  }

  await loadUserOnboardingStatus(userId);
  return userPreferences.get(userId);
}

export function getOrCreateUserPreferences(userId: string): UserPreferences {
  const existing = userPreferences.get(userId);
  if (existing) {
    return existing;
  }

  const prefs = createDefaultPreferences(userId);
  userPreferences.set(userId, prefs);
  return prefs;
}

/**
 * Save user preferences
 */
export function saveUserPreferences(prefs: UserPreferences): void {
  userPreferences.set(prefs.userId, prefs);
  void postOnboardingUpdate(prefs.userId, {
    step: prefs.tutorialCompleted ? 'completed' : 'preferences',
    hasAcceptedTerms: prefs.hasAcceptedTerms,
    riskLevel: prefs.riskLevel,
    quizScores: prefs.quizScores,
    preferences: {
      cooldownEnabled: prefs.cooldownEnabled,
      voiceInterventionEnabled: prefs.voiceInterventionEnabled,
      dailyLimit: prefs.dailyLimit ?? null,
      notifications: prefs.notifications,
    },
  });
}

export async function resetUserOnboarding(userId: string): Promise<void> {
  onboardedUsers.delete(userId);
  userPreferences.delete(userId);
  pendingLoads.delete(userId);
  pendingWrites.delete(userId);

  if (!hasInternalApiAccess()) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/me/onboarding-status?discordId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: buildInternalHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Reset failed with status ${response.status}`);
    }
    console.log(`[Onboarding] Surgically purged ${userId} from canonical onboarding store.`);
  } catch (error) {
    console.error('[Onboarding] Delete error:', error);
  }
}

/**
 * Send welcome DM to new user
 */
export async function sendWelcomeDM(user: User): Promise<boolean> {
  try {
    const dmChannel = await user.createDM();

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setDescription(
        `USER IDENTIFIED: **${user.username}**.\n\n` +
        `I AM TILTCHECK. I AUDIT CASINOS, SCAN SCAM LINKS, AND PULL THE BRAKE BEFORE YOU GIVE BACK A WIN.\n\n` +
        `I AM MONITORING THE ARENA FOR:\n` +
        `- MALICIOUS REDIRECTS (SCAM SCANNER)\n` +
        `- PREDATORY HOUSE DRIFT (FAIRNESS)\n` +
        `- BEHAVIORAL SPIRALS (STATUS AUDITS)\n` +
        `- COMMUNITY TELEMETRY (TRUST ENGINE)\n\n` +
        `IF YOU WANT THE HARD BRAKE, RUN \`/session intervene enabled:true\` SO I CAN AUTO-MOVE YOU INTO ACCOUNTABILITY VC WHEN YOUR SESSION GOES NUCLEAR.\n\n` +
        `WANT BETA ACCESS? LINK DISCORD ON THE SITE FIRST. THE BETA FORM NOW USES YOUR REAL DISCORD ID SO APPROVALS AND ROLE GRANTS DO NOT TURN INTO A SCAVENGER HUNT.\n` +
        `LINK DISCORD: ${getWebsiteOnboardingUrl()}\n\n` +
        `NOTE: I DO NOT CUSTODY FUNDS. I PURELY LEVEL THE PLAYING FIELD.\n\n` +
        `SYNC YOUR DEGEN ID?`
      )
      .setThumbnail('https://tiltcheck.me/assets/logo/favicon-white.svg')
      .setFooter({ text: 'Made for Degens. By Degens.' });

    // Primary: isolate the account-link action so it is not buried in the welcome DM controls.
    const linkAccountBtn = new ButtonBuilder()
      .setLabel('LINK DISCORD NOW')
      .setStyle(ButtonStyle.Link)
      .setURL(getWebsiteOnboardingUrl());

    const betaBtn = new ButtonBuilder()
      .setLabel('APPLY FOR BETA')
      .setStyle(ButtonStyle.Link)
      .setURL(getBetaTesterUrl());

    // Link to the Discord server so users can navigate back from the DM
    const joinServerBtn = new ButtonBuilder()
      .setLabel('JOIN SERVER')
      .setStyle(ButtonStyle.Link)
      .setURL(DISCORD_INVITE_URL);

    const maybeLaterBtn = new ButtonBuilder()
      .setCustomId('onboard_later')
      .setLabel('Later')
      .setStyle(ButtonStyle.Secondary);

    const primaryRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(linkAccountBtn);

    const secondaryRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(betaBtn, joinServerBtn, maybeLaterBtn);

    await dmChannel.send({ embeds: [welcomeEmbed], components: [primaryRow, secondaryRow] });
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
        content: 'When you are ready, run `/help` to get started.',
        embeds: [],
        components: [],
      });
      break;

    case 'onboard_accept_terms':
      await showRiskQuiz(interaction, 0);
      break;

    case 'onboard_skip_quiz':
      await showPreferences(interaction);
      break;

    case 'onboard_decline_terms':
      await interaction.update({
        content: 'Come back any time with `/help` to get set up.',
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
      } else if (interaction.customId.startsWith('onboard_quiz_')) {
        await handleQuizSelection(interaction);
      }
  }
}

/**
 * Show terms and conditions
 */
async function showTermsAndConditions(interaction: MessageComponentInteraction): Promise<void> {
  const termsEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('QUICK TERMS')
    .setDescription(
      `Before we proceed:\n\n` +
      `**Safety First**\n` +
      `TiltCheck provides tools like /session status audits, buddy alerts, /session intervene voice brakes, and fair-game verification to keep you objective.\n\n` +
      `**Your Responsibility**\n` +
      `You are responsible for your own session. Use these tools as data, not as a ruleset.\n\n` +
      `**No Financial Advice**\n` +
      `Nothing here is financial advice.\n\n` +
      `**Risk Quiz**\n` +
      `A few questions to calibrate your nudge sensitivity.\n\n` +
      `By continuing, you agree to the Edge Equalizer audit protocol.`
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

  const startQuizBtn = new ButtonBuilder()
    .setCustomId('onboard_accept_terms')
    .setLabel('CALIBRATE NUDGES')
    .setStyle(ButtonStyle.Success);

  const skipBtn = new ButtonBuilder()
    .setCustomId('onboard_skip_quiz')
    .setLabel('Manual Setup')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(startQuizBtn, skipBtn);

  await interaction.update({ embeds: [termsEmbed], components: [row] });
}

/**
 * Show a specific step of the Risk Assessment Quiz
 */
async function showRiskQuiz(
  interaction: MessageComponentInteraction,
  stepIndex: number
): Promise<void> {
  const question = ONBOARDING_QUESTIONS[stepIndex];

  if (!question) {
    await showPreferences(interaction);
    return;
  }

  const quizEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle(`AUDIT CALIBRATION — STEP ${stepIndex + 1} OF ${ONBOARDING_QUESTIONS.length}`)
    .setDescription(`**${question.text}**`)
    .setFooter({ text: 'Made for Degens. By Degens.' });

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  question.options.forEach((opt, idx) => {
    const btn = new ButtonBuilder()
      .setCustomId(`onboard_quiz_${stepIndex}_${idx}`)
      .setLabel(opt.label)
      .setStyle(ButtonStyle.Secondary);
    
    if (idx > 0 && idx % 2 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }
    currentRow.addComponents(btn);
  });
  rows.push(currentRow);

  await interaction.update({ embeds: [quizEmbed], components: rows });
}

/**
 * Handle quiz option selection
 */
async function handleQuizSelection(interaction: MessageComponentInteraction): Promise<void> {
  const [,, stepIdxStr, optIdxStr] = interaction.customId.split('_');
  const stepIdx = parseInt(stepIdxStr);
  const optIdx = parseInt(optIdxStr);

  const question = ONBOARDING_QUESTIONS[stepIdx];
  if (!question) return;

  const option = question.options[optIdx];
  if (!option) return;

  let prefs = userPreferences.get(interaction.user.id);
  if (!prefs) {
    prefs = createDefaultPreferences(interaction.user.id);
    prefs.hasAcceptedTerms = true;
  }

  prefs.quizScores[question.id] = option.riskWeight;
  userPreferences.set(interaction.user.id, prefs);

  if (stepIdx + 1 < ONBOARDING_QUESTIONS.length) {
    await showRiskQuiz(interaction, stepIdx + 1);
  } else {
    // End of quiz: Calculate suggestion
    const risk = calculateSuggestedRisk(prefs.quizScores);
    prefs.riskLevel = risk;
    prefs.cooldownEnabled = risk !== 'degen';
    userPreferences.set(interaction.user.id, prefs);

    await showPreferences(interaction, true);
  }
}

/**
 * Show learn more information
 */
async function showLearnMore(interaction: MessageComponentInteraction): Promise<void> {
  const learnEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('WHAT IS TILTCHECK')
    .setDescription(
      `**TiltCheck** is a safety bot for responsible play in Discord.\n\n` +
      `**Check your status**\n` +
      `/session status\n\n` +
      `**House Edge check**\n` +
      `/odds\n\n` +
      `**Link some safety**\n` +
      `/buddy link user:<@user>\n\n` +
      `**Hard brake on critical tilt**\n` +
      `/session intervene enabled:true\n\n` +
      `**Check a casino**\n` +
      `/casino\n\n` +
      `**Ecosystem**\n` +
      `Tips and wallets are handled by **JustTheTip**. Fairness data is updated in REALTIME via the Edge Equalizer SDK.`
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

  const startBtn = new ButtonBuilder()
      .setLabel('Finish Setup')
      .setStyle(ButtonStyle.Link)
      .setURL(getWebsiteOnboardingUrl());

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
async function showPreferences(
  interaction: MessageComponentInteraction,
  isSuggested = false
): Promise<void> {
  const prefs: UserPreferences = userPreferences.get(interaction.user.id) ?? {
    userId: interaction.user.id,
    discordId: interaction.user.id,
    joinedAt: Date.now(),
    notifications: { tips: true, trivia: true, promos: false },
    riskLevel: 'moderate',
    cooldownEnabled: true,
    voiceInterventionEnabled: false,
    quizScores: {},
    tutorialCompleted: false,
    hasAcceptedTerms: true,
  };
  userPreferences.set(interaction.user.id, prefs);

  const description = isSuggested
    ? `**Audit Calibration Complete.**\nBased on your answers, I suggest a **${prefs.riskLevel.toUpperCase()}** profile. You can still tweak these below.`
    : `Almost done. Customize your experience.\n\n**Notifications**\nChoose what you want to be notified about.\n\n**Risk Level**\nThis affects default cooldown suggestions and safety nudges.\n\n**Voice Intervention**\nUse \`/session intervene enabled:true\` later if you want TiltCheck to auto-move you into accountability VC on critical tilt.`;

  const prefsEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle(isSuggested ? 'SUGGESTED PROFILE' : 'CALIBRATE NUDGE SENSITIVITY')
    .setDescription(description)
    .setFooter({ text: 'Made for Degens. By Degens.' });

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
    .setColor(0x22d3a6)
    .setTitle('SET YOUR PREFERENCES')
    .setDescription(
      `Pick your risk level:\n\n` +
      `Conservative - More cooldown reminders, lower limits suggested\n` +
      `Moderate - Balanced approach (default)\n` +
      `Full Degen - Minimal hand-holding\n\n` +
      `Need the hard brake too? Run \`/session intervene enabled:true\` after setup to allow emergency voice moves on critical tilt.`
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

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

  // Mark tutorial and onboarding as complete
  if (prefs) {
    prefs.tutorialCompleted = true;
    prefs.hasAcceptedTerms = true;
    userPreferences.set(interaction.user.id, prefs);
    await postOnboardingUpdate(interaction.user.id, {
      step: 'completed',
      hasAcceptedTerms: true,
      riskLevel: prefs.riskLevel,
      quizScores: prefs.quizScores,
      preferences: {
        cooldownEnabled: prefs.cooldownEnabled,
        voiceInterventionEnabled: prefs.voiceInterventionEnabled,
        dailyLimit: prefs.dailyLimit ?? null,
        notifications: prefs.notifications,
      },
    }).catch(() => undefined);
  }

  markOnboarded(interaction.user.id);

  const notifications = [
    prefs?.notifications.tips ? 'Tips (JustTheTip)' : null,
    prefs?.notifications.trivia ? 'Trivia' : null,
    prefs?.notifications.promos ? 'Promos' : null,
  ].filter(Boolean).join(', ') || 'None';

  const completedEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('PROFILE ACTIVATED')
    .setDescription(
      `REGISTRATION COMPLETE, **${interaction.user.username}**.\n\n` +
      `**CONFIGURATION:**\n` +
      `- SENSITIVITY: ${prefs?.riskLevel.toUpperCase() || 'MODERATE'}\n` +
      `- MONITORING: ${notifications}\n` +
      `- VOICE INTERVENTION: ${prefs?.voiceInterventionEnabled ? 'ENABLED' : 'OFF'}\n\n` +
      `**AUDIT COMMANDS:**\n` +
      `/session status - QUERY SAFETY STATE\n` +
      `/buddy - LINK YOUR ACCOUNTABILITY LINE\n` +
      `/session intervene enabled:true - ALLOW AUTO-MOVE INTO ACCOUNTABILITY VC ON CRITICAL TILT\n` +
      `/odds - HOUSE EDGE AUDIT\n` +
      `/verify - PROVABLY FAIR VERIFIER\n\n` +
      `**NEXT STEP:** Open the dashboard lanes that actually matter.\n` +
      `Vault: ${getDashboardAppUrl({ tab: 'vault' })}\n` +
      `Safety: ${getDashboardAppUrl({ tab: 'safety' })}\n` +
      `Bonuses: ${getDashboardAppUrl({ tab: 'bonuses' })}\n\n` +
      `IF YOUR BRAIN IS SMOKING, PULL THE BRAKE.`
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

  const vaultBtn = new ButtonBuilder()
    .setLabel('Open Vault')
    .setStyle(ButtonStyle.Link)
    .setURL(getDashboardAppUrl({ tab: 'vault' }));

  const safetyBtn = new ButtonBuilder()
    .setLabel('Open Safety')
    .setStyle(ButtonStyle.Link)
    .setURL(getDashboardAppUrl({ tab: 'safety' }));

  const bonusesBtn = new ButtonBuilder()
    .setLabel('Open Bonuses')
    .setStyle(ButtonStyle.Link)
    .setURL(getDashboardAppUrl({ tab: 'bonuses' }));

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(vaultBtn, safetyBtn, bonusesBtn);

  await interaction.update({ embeds: [completedEmbed], components: [row] });
}

/**
 * Check if user is onboarded and trigger welcome if not
 */
export async function checkAndOnboard(user: User): Promise<boolean> {
  if (await isUserOnboarded(user.id)) {
    return false; // Already onboarded
  }

  const dmSent = await sendWelcomeDM(user);
  return dmSent;
}
