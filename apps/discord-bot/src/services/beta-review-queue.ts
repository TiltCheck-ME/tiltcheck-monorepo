// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14
/**
 * Beta review queue
 *
 * Keeps Discord Beta Applications as a structured review inbox instead of a raw chat drop.
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import {
  findBetaSignupById,
  updateBetaSignup,
  type BetaSignup,
  type BetaSignupStatus,
} from '@tiltcheck/db';
import { config } from '../config.js';
import { registerButtonHandler } from '../handlers/button-handlers.js';

type QueueEventType = 'submitted' | 'reviewed';

interface QueueSyncPayload {
  signupId: string;
  eventType?: QueueEventType;
  previousStatus?: BetaSignupStatus;
}

const DEFAULT_REVIEW_CHANNEL_ID = process.env.BETA_APPLICATION_REVIEW_CHANNEL_ID?.trim() || '1488256033502793930';
const DEFAULT_BETA_ROLE_ID = process.env.BETA_TESTER_ROLE_ID?.trim() || '1492283508456947904';

let discordClient: Client | null = null;
let handlersRegistered = false;

function getReviewChannelId(signup: BetaSignup): string {
  return signup.review_channel_id?.trim() || DEFAULT_REVIEW_CHANNEL_ID;
}

function getReviewerRoleId(): string | null {
  return process.env.BETA_REVIEWER_ROLE_ID?.trim() || process.env.RECOVERY_ADMIN_ROLE_ID?.trim() || null;
}

function getGuildId(): string {
  return config.guildId || process.env.DISCORD_GUILD_ID || '1488253239643078787';
}

function getStatusLabel(status: BetaSignupStatus): string {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'waitlisted':
      return 'NEEDS MORE INFO';
    default:
      return 'PENDING REVIEW';
  }
}

function getStatusColor(status: BetaSignupStatus): number {
  switch (status) {
    case 'approved':
      return 0x22d3a6;
    case 'rejected':
      return 0xef4444;
    case 'waitlisted':
      return 0xf59e0b;
    default:
      return 0x3b82f6;
  }
}

function buildSurfaceList(signup: BetaSignup): string {
  const surfaces = [
    signup.beta_access_web ? 'Web' : '',
    signup.beta_access_dashboard ? 'Dashboard' : '',
    signup.beta_access_extension ? 'Extension' : '',
    signup.beta_access_discord ? 'Discord' : '',
    signup.beta_access_community ? 'Community' : '',
  ].filter(Boolean);

  return surfaces.length > 0 ? surfaces.join(', ') : 'Locked until approved';
}

function buildApplicantLabel(signup: BetaSignup): string {
  if (signup.discord_id) {
    const username = signup.discord_username ? ` (${signup.discord_username})` : '';
    return `<@${signup.discord_id}>${username}`;
  }

  return signup.notification_email || signup.email;
}

function truncateField(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 1024 ? `${trimmed.slice(0, 1021)}...` : trimmed;
}

function buildReviewEmbed(signup: BetaSignup): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(getStatusColor(signup.status))
    .setTitle('BETA APPLICATION REVIEW')
    .setDescription('Beta applications land here for admin review. This channel is the queue, not the form.')
    .addFields(
      { name: 'Applicant', value: buildApplicantLabel(signup), inline: true },
      { name: 'Application ID', value: `\`${signup.id}\``, inline: true },
      { name: 'Status', value: getStatusLabel(signup.status), inline: true },
      { name: 'Path', value: signup.application_path.toUpperCase(), inline: true },
      { name: 'Contact', value: signup.contact_method.toUpperCase(), inline: true },
      { name: 'Surfaces', value: buildSurfaceList(signup), inline: true },
      { name: 'Casinos', value: truncateField(signup.interests?.join(', '), 'None listed') },
      { name: 'Tester Type', value: truncateField(signup.experience_level, 'Not specified'), inline: true },
      { name: 'Wants to Test', value: truncateField(signup.feedback_preference, 'Not specified'), inline: true },
      { name: 'Application Notes', value: truncateField(signup.referral_source, 'No extra notes provided') },
      { name: 'Reviewer Notes', value: truncateField(signup.reviewer_notes, 'No review note yet') },
    )
    .setFooter({ text: 'Made for Degens. By Degens.' })
    .setTimestamp(signup.updated_at || signup.created_at);
}

function buildReviewButtons(signupId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`beta-review:approve:${signupId}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`beta-review:need-info:${signupId}`)
      .setLabel('Need More Info')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`beta-review:reject:${signupId}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger),
  );
}

async function ensureReviewerAccess(interaction: ButtonInteraction): Promise<boolean> {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const reviewerRoleId = getReviewerRoleId();
  if (!reviewerRoleId || !interaction.guild) {
    return false;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return Boolean(member?.roles.cache.has(reviewerRoleId));
}

async function grantBetaRole(signup: BetaSignup): Promise<void> {
  if (!discordClient || !signup.discord_id || !signup.beta_access_discord) {
    return;
  }

  const guild = await discordClient.guilds.fetch(getGuildId()).catch(() => null);
  if (!guild) return;

  const member = await guild.members.fetch(signup.discord_id).catch(() => null);
  if (!member) return;

  await member.roles.add(DEFAULT_BETA_ROLE_ID, 'Beta application approved via review queue').catch((error) => {
    console.error('[BetaQueue] Failed to grant beta role:', error);
  });
}

async function notifyDiscordApplicant(signup: BetaSignup, previousStatus?: BetaSignupStatus): Promise<void> {
  if (!discordClient || !signup.discord_id || previousStatus === signup.status) {
    return;
  }

  const user = await discordClient.users.fetch(signup.discord_id).catch(() => null);
  if (!user) return;

  let title = 'Beta application update';
  let body = 'Your beta application moved in the queue.';

  if (signup.status === 'approved') {
    title = 'You are approved for beta';
    body = `You are in. Cleared surfaces: ${buildSurfaceList(signup)}. ${signup.reviewer_notes || 'Check the server and site for next steps.'}`;
    await grantBetaRole(signup);
  } else if (signup.status === 'waitlisted') {
    title = 'Need more info on your beta app';
    body = signup.reviewer_notes || 'We need more detail before clearing this beta slot.';
  } else if (signup.status === 'rejected') {
    title = 'Beta application closed';
    body = signup.reviewer_notes || 'This slot did not clear review.';
  }

  const embed = new EmbedBuilder()
    .setColor(getStatusColor(signup.status))
    .setTitle(title)
    .setDescription(body)
    .setFooter({ text: 'Made for Degens. By Degens.' })
    .setTimestamp();

  await user.send({ embeds: [embed] }).catch((error) => {
    console.error('[BetaQueue] Failed to DM applicant:', error);
  });
}

async function fetchReviewChannel(signup: BetaSignup): Promise<TextChannel> {
  if (!discordClient) {
    throw new Error('Discord client is not initialized for beta review queue');
  }

  const channel = await discordClient.channels.fetch(getReviewChannelId(signup));
  if (!channel || !channel.isTextBased()) {
    throw new Error(`Beta review channel ${getReviewChannelId(signup)} is missing or not text-based`);
  }

  return channel as TextChannel;
}

async function upsertReviewMessage(signup: BetaSignup): Promise<{ channelId: string; messageId: string }> {
  const channel = await fetchReviewChannel(signup);
  const embed = buildReviewEmbed(signup);
  const components = [buildReviewButtons(signup.id)];

  if (signup.review_message_id && signup.review_channel_id === channel.id) {
    const existing = await channel.messages.fetch(signup.review_message_id).catch(() => null);
    if (existing) {
      await existing.edit({ embeds: [embed], components });
      return { channelId: channel.id, messageId: existing.id };
    }
  }

  const created = await channel.send({ embeds: [embed], components });
  await updateBetaSignup(signup.id, {
    review_channel_id: created.channelId,
    review_message_id: created.id,
  });

  return { channelId: created.channelId, messageId: created.id };
}

export function initializeBetaReviewQueue(client: Client): void {
  discordClient = client;

  if (handlersRegistered) {
    return;
  }

  registerButtonHandler('beta-review:', async (interaction: ButtonInteraction) => {
    if (!(await ensureReviewerAccess(interaction))) {
      await interaction.reply({ content: 'You do not have review clearance for beta applications.', ephemeral: true });
      return;
    }

    const [, action, signupId] = interaction.customId.split(':');
    if (!action || !signupId) {
      await interaction.reply({ content: 'Malformed beta review action.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const secret = config.internalApiSecret.trim();
    if (!secret) {
      await interaction.editReply('INTERNAL_API_SECRET is missing. Review action cannot reach the API.');
      return;
    }

    const actionMap: Record<string, { status: BetaSignupStatus; reviewerNotes: string }> = {
      approve: {
        status: 'approved',
        reviewerNotes: `Approved from Discord review queue by ${interaction.user.tag}.`,
      },
      'need-info': {
        status: 'waitlisted',
        reviewerNotes: `Need more info before approval. Flagged from Discord review queue by ${interaction.user.tag}.`,
      },
      reject: {
        status: 'rejected',
        reviewerNotes: `Rejected from Discord review queue by ${interaction.user.tag}.`,
      },
    };

    const nextState = actionMap[action];
    if (!nextState) {
      await interaction.editReply('Unknown beta review action.');
      return;
    }

    try {
      const response = await fetch(`${config.backendUrl}/beta/${encodeURIComponent(signupId)}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
          'X-Requested-With': 'tiltcheck-bot',
        },
        body: JSON.stringify(nextState),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || `Review API returned ${response.status}`);
      }

      await interaction.editReply(`Beta application ${nextState.status}. Queue card updated.`);
    } catch (error) {
      console.error('[BetaQueue] Review action failed:', error);
      await interaction.editReply(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  handlersRegistered = true;
}

export async function syncBetaReviewQueue(payload: QueueSyncPayload): Promise<{ channelId: string; messageId: string }> {
  if (!payload.signupId || typeof payload.signupId !== 'string') {
    throw new Error('signupId is required for beta queue sync');
  }

  const signup = await findBetaSignupById(payload.signupId);
  if (!signup) {
    throw new Error(`Beta signup ${payload.signupId} was not found`);
  }

  const result = await upsertReviewMessage(signup);
  if (payload.eventType === 'reviewed') {
    await notifyDiscordApplicant(signup, payload.previousStatus);
  }
  return result;
}
