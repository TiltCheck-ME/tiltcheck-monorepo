// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import {
  createBetaSignup,
  findLatestBetaSignupByDiscordId,
  type BetaSignup,
  type BetaSignupStatus,
} from '@tiltcheck/db';
import type { Command } from '../types.js';
import { syncBetaReviewQueue } from '../services/beta-review-queue.js';

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function normalizeCsvList(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 20);
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

function buildSignupStatusEmbed(signup: BetaSignup): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(getStatusColor(signup.status))
    .setTitle('BETA APPLICATION STATUS')
    .setDescription(
      signup.status === 'approved'
        ? 'You are in. The review queue cleared you.'
        : signup.status === 'waitlisted'
          ? 'Queue saw the app, but review wants more from you before clearing the slot.'
          : signup.status === 'rejected'
            ? 'This wave did not clear review.'
            : 'Application is in the queue. No extra spam needed.'
    )
    .addFields(
      { name: 'Status', value: getStatusLabel(signup.status), inline: true },
      { name: 'Path', value: signup.application_path.toUpperCase(), inline: true },
      { name: 'Surfaces', value: buildSurfaceList(signup), inline: true },
      { name: 'Casinos', value: signup.interests?.join(', ') || 'None listed', inline: false },
      { name: 'Tester Type', value: signup.experience_level || 'Not specified', inline: true },
      { name: 'Wants to Test', value: signup.feedback_preference || 'Not specified', inline: true },
      {
        name: 'Notes',
        value: signup.reviewer_notes || signup.referral_source || 'No extra notes on file',
        inline: false,
      }
    )
    .setFooter({ text: 'Made for Degens. By Degens.' })
    .setTimestamp(signup.updated_at || signup.created_at);
}

async function handleBetaApply(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;
  const existing = await findLatestBetaSignupByDiscordId(discordId);
  if (existing) {
    await interaction.editReply({
      embeds: [buildSignupStatusEmbed(existing)],
    });
    return;
  }

  const casinos = normalizeCsvList(interaction.options.getString('casinos', true));
  const testerType = truncate(interaction.options.getString('tester_type', true).trim(), 120);
  const wantsToTest = truncate(interaction.options.getString('wants_to_test', true).trim(), 500);
  const notes = truncate(interaction.options.getString('notes')?.trim() || 'Applied from Discord command.', 500);

  if (casinos.length === 0) {
    await interaction.editReply({
      content: 'List at least one casino. The queue needs to know where you actually play.',
    });
    return;
  }

  const created = await createBetaSignup({
    email: `${discordId}@discord.tiltcheck.placeholder`,
    application_path: 'discord',
    contact_method: 'discord',
    status: 'pending',
    discord_id: discordId,
    discord_username: interaction.user.tag,
    notification_discord_id: discordId,
    beta_access_web: false,
    beta_access_dashboard: false,
    beta_access_extension: false,
    beta_access_discord: false,
    beta_access_community: false,
    interests: casinos,
    experience_level: testerType,
    feedback_preference: wantsToTest,
    referral_source: notes,
  });

  if (!created) {
    await interaction.editReply({
      content: 'Beta signup bricked before it hit the queue.',
    });
    return;
  }

  await syncBetaReviewQueue({ signupId: created.id, eventType: 'submitted' });

  const embed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('BETA APPLICATION SENT')
    .setDescription('Your application is in the Discord review queue now. No website detour needed.')
    .addFields(
      { name: 'Status', value: 'PENDING REVIEW', inline: true },
      { name: 'Casinos', value: casinos.join(', '), inline: false },
      { name: 'Tester Type', value: testerType, inline: true },
      { name: 'Wants to Test', value: wantsToTest, inline: false },
      { name: 'Application Notes', value: notes, inline: false }
    )
    .setFooter({ text: 'Made for Degens. By Degens.' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleBetaStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const signup = await findLatestBetaSignupByDiscordId(interaction.user.id);
  if (!signup) {
    await interaction.editReply({
      content: 'No Discord beta application found. Use `/beta apply` when you want in.',
    });
    return;
  }

  await interaction.editReply({
    embeds: [buildSignupStatusEmbed(signup)],
  });
}

export const beta: Command = {
  data: new SlashCommandBuilder()
    .setName('beta')
    .setDescription('Apply for beta from Discord or check your queue status.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('apply')
        .setDescription('Apply for TiltCheck beta without leaving Discord.')
        .addStringOption((option) =>
          option
            .setName('casinos')
            .setDescription('Casino names separated by commas')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('tester_type')
            .setDescription('What kind of tester are you? grinder, casual, bug hunter, etc.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('wants_to_test')
            .setDescription('What surfaces or workflows do you want to test?')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('notes')
            .setDescription('Extra context for reviewers')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Check the status of your latest Discord beta application.')
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'apply':
        await handleBetaApply(interaction);
        return;
      case 'status':
        await handleBetaStatus(interaction);
        return;
      default:
        await interaction.reply({ content: 'Unknown beta command.', ephemeral: true });
    }
  },
};
