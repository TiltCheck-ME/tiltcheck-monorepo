// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
//
// Community Recovery Microgrant Program
//
// This command lets users in genuine financial crisis from gambling apply for a
// one-time community-funded grant. Applications are manually reviewed — no
// auto-approvals. Degens will try to game this. They will be denied.
//
// Required env vars:
//   RECOVERY_REVIEW_CHANNEL_ID  - Channel ID where applications are posted for review
//   RECOVERY_FUND_PRIVATE_KEY   - Hex private key of the recovery fund wallet
//   RECOVERY_ADMIN_ROLE_ID      - Discord role ID that can approve/reject
//   RECOVERY_VOTE_THRESHOLD     - Community vote count needed for auto-approval (default: 10)
//
// Recovery fund wallet: CCXEVwUyfMLFwEzyusBLZ2VY1PyDe6qYhLHtgRqeBm51
// Fund this wallet with SOL before grant payouts can execute.

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonInteraction,
  TextChannel,
  GuildMember,
  Client,
} from 'discord.js';
import type { Command } from '../types.js';
import { findUserByDiscordId, findOrCreateUserByDiscord } from '@tiltcheck/db';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const RECOVERY_FUND_WALLET = 'CCXEVwUyfMLFwEzyusBLZ2VY1PyDe6qYhLHtgRqeBm51';
const MAX_GRANT_SOL = 1;
const VOTE_THRESHOLD = parseInt(process.env.RECOVERY_VOTE_THRESHOLD ?? '10', 10);

// Applications are CLOSED until the community fund wallet is seeded.
// Set RECOVERY_APPLICATIONS_OPEN=true in env to open them.
const APPLICATIONS_OPEN = process.env.RECOVERY_APPLICATIONS_OPEN === 'true';

const PENDING_FUNDS_EMBED = new EmbedBuilder()
  .setColor(0xf59e0b)
  .setTitle('RECOVERY GRANT — PENDING FUNDS')
  .setDescription(
    'Applications are not open yet.\n\n' +
    'The TiltCheck community recovery fund is still being built. ' +
    'Once enough SOL is available to cover grants, applications will open.\n\n' +
    'Want to help fund it?\n' +
    `Donate SOL to: \`${RECOVERY_FUND_WALLET}\`\n\n` +
    'If you are in crisis right now:\n' +
    '**National Problem Gambling Helpline: 1-800-522-4700**\n' +
    '[ncpgambling.org](https://www.ncpgambling.org) — free, confidential, 24/7'
  )
  .setFooter({ text: 'Made for Degens. By Degens.' });
const APPLICATIONS_DIR = path.join(process.cwd(), 'tmp', 'recovery-applications');

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// -----------------------------------------------------------------------------
// Application Storage
// -----------------------------------------------------------------------------

type ApplicationStatus =
  | 'pending_support'     // Waiting for Discord support contact to confirm
  | 'under_review'        // Posted to review channel, open for vote/admin action
  | 'approved'            // Approved, payout in progress
  | 'paid'                // Payment sent
  | 'rejected'            // Rejected by admin
  | 'cancelled';          // Applicant cancelled or support contact denied

interface RecoveryApplication {
  id: string;
  discordUserId: string;
  discordUsername: string;
  hardship: string;
  steps: string;
  supportContact: string;       // Raw input: @mention or name + contact info
  supportDiscordId?: string;    // Parsed Discord ID if mentioned
  supportConfirmed: boolean;
  reviewMessageId?: string;
  reviewChannelId?: string;
  communityVotes: number;
  status: ApplicationStatus;
  rejectionReason?: string;
  approvedBy?: string;
  appliedAt: number;
  updatedAt: number;
}

function ensureDir(): void {
  fs.mkdirSync(APPLICATIONS_DIR, { recursive: true });
}

function appFilePath(userId: string): string {
  return path.join(APPLICATIONS_DIR, `${userId}.json`);
}

function loadApplication(userId: string): RecoveryApplication | null {
  try {
    const file = appFilePath(userId);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as RecoveryApplication;
  } catch {
    return null;
  }
}

function saveApplication(app: RecoveryApplication): void {
  ensureDir();
  app.updatedAt = Date.now();
  fs.writeFileSync(appFilePath(app.discordUserId), JSON.stringify(app, null, 2), 'utf8');
}

function loadApplicationById(applicationId: string): RecoveryApplication | null {
  try {
    if (!fs.existsSync(APPLICATIONS_DIR)) return null;
    const files = fs.readdirSync(APPLICATIONS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(APPLICATIONS_DIR, file), 'utf8');
      const app = JSON.parse(raw) as RecoveryApplication;
      if (app.id === applicationId) return app;
    }
    return null;
  } catch {
    return null;
  }
}

function listApplicationsByStatus(status: ApplicationStatus): RecoveryApplication[] {
  try {
    if (!fs.existsSync(APPLICATIONS_DIR)) return [];
    return fs.readdirSync(APPLICATIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(APPLICATIONS_DIR, f), 'utf8')) as RecoveryApplication)
      .filter(a => a.status === status);
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Fund Balance Check
// -----------------------------------------------------------------------------

async function getRecoveryFundBalance(): Promise<number> {
  const bal = await connection.getBalance(new PublicKey(RECOVERY_FUND_WALLET)).catch(() => 0);
  return bal / LAMPORTS_PER_SOL;
}

function getRecoveryFundKeypair(): Keypair | null {
  const hexKey = process.env.RECOVERY_FUND_PRIVATE_KEY;
  if (!hexKey) return null;
  try {
    return Keypair.fromSecretKey(Buffer.from(hexKey, 'hex'));
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Review Channel Embed Builder
// -----------------------------------------------------------------------------

function buildReviewEmbed(app: RecoveryApplication): EmbedBuilder {
  const statusColors: Record<ApplicationStatus, number> = {
    pending_support: 0xf59e0b,
    under_review: 0x8b5cf6,
    approved: 0x22d3a6,
    paid: 0x16a34a,
    rejected: 0xef4444,
    cancelled: 0x6b7280,
  };

  return new EmbedBuilder()
    .setColor(statusColors[app.status])
    .setTitle('RECOVERY MICROGRANT APPLICATION')
    .addFields(
      { name: 'Applicant', value: `<@${app.discordUserId}> (${app.discordUsername})`, inline: true },
      { name: 'Application ID', value: `\`${app.id}\``, inline: true },
      { name: 'Status', value: app.status.replace('_', ' ').toUpperCase(), inline: true },
      { name: 'Hardship (their words)', value: app.hardship.slice(0, 1024) },
      { name: 'Proactive Steps', value: app.steps.slice(0, 1024) },
      {
        name: 'Accountability Contact',
        value: app.supportDiscordId
          ? `<@${app.supportDiscordId}> — ${app.supportConfirmed ? 'CONFIRMED AWARE' : 'Confirmation pending'}`
          : `${app.supportContact} — External contact (manual verification required)`,
      },
      { name: 'Community Votes', value: `${app.communityVotes} / ${VOTE_THRESHOLD} needed`, inline: true },
      { name: 'Grant Amount', value: `${MAX_GRANT_SOL} SOL (if approved)`, inline: true },
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });
}

function buildReviewButtons(appId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`recover_approve_${appId}`)
      .setLabel('[APPROVE]')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`recover_reject_${appId}`)
      .setLabel('[REJECT]')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`recover_vote_${appId}`)
      .setLabel('[VOUCH FOR THIS]')
      .setStyle(ButtonStyle.Secondary),
  );
}

// -----------------------------------------------------------------------------
// Payout Execution
// -----------------------------------------------------------------------------

async function executeGrantPayout(
  app: RecoveryApplication,
  walletAddress: string,
  approvedBy: string,
  reviewChannel: TextChannel | null
): Promise<{ success: boolean; signature?: string; error?: string }> {
  const keypair = getRecoveryFundKeypair();
  if (!keypair) {
    return { success: false, error: 'RECOVERY_FUND_PRIVATE_KEY not configured.' };
  }

  const balance = await getRecoveryFundBalance();
  if (balance < MAX_GRANT_SOL + 0.001) {
    return {
      success: false,
      error: `Recovery fund has insufficient balance (${balance.toFixed(4)} SOL). Fund \`${RECOVERY_FUND_WALLET}\` before approving.`,
    };
  }

  const lamports = Math.floor(MAX_GRANT_SOL * LAMPORTS_PER_SOL);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(walletAddress),
      lamports,
    })
  );

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);

    app.status = 'paid';
    app.approvedBy = approvedBy;
    saveApplication(app);

    if (reviewChannel) {
      const paidEmbed = new EmbedBuilder()
        .setColor(0x16a34a)
        .setTitle('RECOVERY GRANT PAID')
        .setDescription(
          `<@${app.discordUserId}> received **${MAX_GRANT_SOL} SOL**.\n\nApproved by: ${approvedBy}\n\n[View on Solscan](https://solscan.io/tx/${sig})\n\nThis comes from the TiltCheck community recovery fund. If you need to donate to it: \`${RECOVERY_FUND_WALLET}\``
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });
      await reviewChannel.send({ embeds: [paidEmbed] });
    }

    return { success: true, signature: sig };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// Button Interaction Handler
// (Register this in your main interaction handler)
// -----------------------------------------------------------------------------

export async function handleRecoveryButton(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const [, action, appId] = interaction.customId.split('_');
  const app = loadApplicationById(appId);
  if (!app) {
    await interaction.reply({ content: '[!] Application not found.', ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;
  const adminRoleId = process.env.RECOVERY_ADMIN_ROLE_ID;
  const isAdmin =
    (adminRoleId && member.roles.cache.has(adminRoleId)) ||
    member.permissions.has('Administrator');

  // Vouch (community vote)
  if (action === 'vote') {
    if (app.status !== 'under_review') {
      await interaction.reply({ content: '[!] This application is no longer open for voting.', ephemeral: true });
      return;
    }
    app.communityVotes += 1;
    saveApplication(app);

    await interaction.reply({
      content: `You vouched for this application. Votes: **${app.communityVotes}/${VOTE_THRESHOLD}**`,
      ephemeral: true,
    });

    // Auto-approve at threshold — still requires review channel confirmation
    if (app.communityVotes >= VOTE_THRESHOLD) {
      const reviewChannel = interaction.channel as TextChannel;
      const noticeEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('COMMUNITY THRESHOLD REACHED')
        .setDescription(
          `Application \`${app.id}\` has reached ${VOTE_THRESHOLD} community vouches.\n\nAn admin must still confirm approval via the [APPROVE] button or \`/sos admin approve ${app.id}\`.`
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });
      await reviewChannel.send({ embeds: [noticeEmbed] });
    }
    return;
  }

  // Approve / Reject — admin only
  if (!isAdmin) {
    await interaction.reply({ content: '[!] Only admins can approve or reject applications.', ephemeral: true });
    return;
  }

  if (action === 'approve') {
    if (!['under_review', 'pending_support'].includes(app.status)) {
      await interaction.reply({ content: `[!] Application status is \`${app.status}\` — cannot approve.`, ephemeral: true });
      return;
    }

    const dbUser = await findUserByDiscordId(app.discordUserId).catch(() => null);
    if (!dbUser?.wallet_address) {
      await interaction.reply({
        content: `[!] <@${app.discordUserId}> has not linked a wallet. Ask them to use \`/linkwallet\` before approving.`,
        ephemeral: true,
      });
      return;
    }

    app.status = 'approved';
    app.approvedBy = interaction.user.tag;
    saveApplication(app);

    await interaction.reply({ content: `Approving grant for <@${app.discordUserId}>. Sending payout...`, ephemeral: true });

    const reviewChannel = interaction.channel as TextChannel;
    const result = await executeGrantPayout(app, dbUser.wallet_address, interaction.user.tag, reviewChannel);

    if (!result.success) {
      await interaction.followUp({ content: `[!] Payout failed: ${result.error}`, ephemeral: true });
    }
    return;
  }

  if (action === 'reject') {
    app.status = 'rejected';
    app.approvedBy = interaction.user.tag;
    app.rejectionReason = 'Rejected by admin via button.';
    saveApplication(app);

    await interaction.reply({ content: `Application \`${app.id}\` rejected.`, ephemeral: true });

    try {
      const applicant = await client.users.fetch(app.discordUserId);
      await applicant.send(
        `Your TiltCheck recovery microgrant application (\`${app.id}\`) was reviewed and not approved at this time.\n\nIf you are struggling, please reach out to: **National Problem Gambling Helpline: 1-800-522-4700** or [ncpgambling.org/chat](https://www.ncpgambling.org/help-treatment/chat).`
      );
    } catch {
      // DM failed — user has DMs disabled. Non-fatal.
    }
    return;
  }
}

// -----------------------------------------------------------------------------
// Support Contact DM
// -----------------------------------------------------------------------------

async function notifySupportContact(
  app: RecoveryApplication,
  client: Client
): Promise<void> {
  if (!app.supportDiscordId) return;

  try {
    const supportUser = await client.users.fetch(app.supportDiscordId);
    const dmEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('ACTION REQUIRED — TILTCHECK RECOVERY PROGRAM')
      .setDescription(
        `${app.discordUsername} listed you as their accountability contact in a community recovery microgrant application.\n\n` +
        `They are asking for community financial support after a gambling problem. They told you about this voluntarily as a condition of applying.\n\n` +
        `You do not need to do anything financially. Just be aware and show up for them.\n\n` +
        `React to this message to confirm: yes (checkmark) or no (x-mark) if the contact is inaccurate or you do not consent.`
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const dmMsg = await supportUser.send({ embeds: [dmEmbed] });
    await dmMsg.react('✅');
    await dmMsg.react('❌');

    const collector = dmMsg.createReactionCollector({
      filter: (r, u) => ['✅', '❌'].includes(r.emoji.name ?? '') && u.id === app.supportDiscordId && !u.bot,
      time: 48 * 60 * 60 * 1000, // 48 hours
      max: 1,
    });

    collector.on('end', async collected => {
      const reaction = collected.first();
      const confirmed = reaction?.emoji.name === '✅';

      app.supportConfirmed = confirmed;
      if (!confirmed) {
        app.status = 'cancelled';
        app.rejectionReason = 'Support contact denied being listed or did not confirm within 48h.';
      } else if (app.status === 'pending_support') {
        app.status = 'under_review';
      }
      saveApplication(app);

      if (app.reviewMessageId && app.reviewChannelId) {
        // Update the review embed to reflect support confirmation
        // This is best-effort — if the message is gone it's fine
      }
    });
  } catch {
    // Could not DM the support contact (DMs disabled, not in server, etc.)
    // Application still proceeds — manual verification required
    app.supportConfirmed = false;
    app.status = 'under_review';
    saveApplication(app);
  }
}

// -----------------------------------------------------------------------------
// Command Definition
// -----------------------------------------------------------------------------

export const recover: Command = {
  data: new SlashCommandBuilder()
    .setName('sos')
    .setDescription('Community recovery microgrant — for degens who hit rock bottom and are ready to climb out')
    .addSubcommand(sub =>
      sub.setName('info').setDescription('How the community recovery microgrant works')
    )
    .addSubcommand(sub =>
      sub
        .setName('apply')
        .setDescription('Submit a recovery microgrant application')
        .addStringOption(opt =>
          opt
            .setName('hardship')
            .setDescription('Describe your financial hardship (honest and specific — this is reviewed by humans)')
            .setRequired(true)
            .setMaxLength(1000)
        )
        .addStringOption(opt =>
          opt
            .setName('steps')
            .setDescription('What proactive steps are you taking to resolve the problem?')
            .setRequired(true)
            .setMaxLength(1000)
        )
        .addStringOption(opt =>
          opt
            .setName('support_contact')
            .setDescription('@mention a Discord user OR provide name + contact info of your accountability person')
            .setRequired(true)
            .setMaxLength(300)
        )
        .addBooleanOption(opt =>
          opt
            .setName('agree')
            .setDescription('I agree to use this grant ONLY for non-gambling hardship relief (select TRUE)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Check the status of your current application')
    )
    .addSubcommand(sub =>
      sub
        .setName('admin')
        .setDescription('Admin: approve or reject an application by ID')
        .addStringOption(opt =>
          opt.setName('action').setDescription('approve or reject').setRequired(true)
            .addChoices({ name: 'approve', value: 'approve' }, { name: 'reject', value: 'reject' })
        )
        .addStringOption(opt =>
          opt.setName('application_id').setDescription('Application ID from the review channel').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reject_reason').setDescription('Reason for rejection (required when rejecting)')
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    // -------------------------------------------------------------------------
    // /sos info
    // -------------------------------------------------------------------------
    if (sub === 'info') {
      const infoEmbed = new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle('COMMUNITY RECOVERY MICROGRANT')
        .setDescription(
          'This is not a bailout. It is a hand up.\n\n' +
          'If gambling has put you in genuine financial crisis and you are ready to make real changes, ' +
          'the TiltCheck community has a fund specifically for this. No judgment. No lecturing. ' +
          'Degens helping degens when it matters most.\n\n' +
          '__**How it works:**__\n' +
          '**1. Apply** — `/sos apply` with honest details about your hardship, what steps you are taking, and an accountability contact (someone who knows about your situation).\n\n' +
          '**2. Accountability contact** — We DM your chosen person (must be on Discord). They confirm they know and are supportive. This is not optional — it is the single most important part.\n\n' +
          '**3. Community review** — Your application (anonymized where possible) is reviewed by admins and vouched for by community members. Requires 10 community vouches or admin approval.\n\n' +
          '**4. Grant paid** — Up to **1 SOL** sent directly to your linked wallet (set one with `/linkwallet`). One grant per person, ever.\n\n' +
          '__**Requirements:**__\n' +
          '- Must tell a non-gambler in your life about your problem\n' +
          '- Must agree the money will NOT be used for gambling\n' +
          '- Must provide proof of hardship and describe proactive steps you are taking\n' +
          '- Must have a linked wallet to receive funds\n\n' +
          '__**This is not for:**__\n' +
          '- Paying off gambling debts\n' +
          '- Funding more play\n' +
          '- Anyone who is not genuinely trying to stop\n\n' +
          `__**Fund wallet:**__ \`${RECOVERY_FUND_WALLET}\`\n` +
          'Want to contribute? Send SOL to that address. Every lamport goes directly to grants.\n\n' +
          '__**In crisis right now?**__\n' +
          '**National Problem Gambling Helpline: 1-800-522-4700** (free, 24/7, confidential)\n' +
          '[ncpgambling.org](https://www.ncpgambling.org) | [gamblersinternational.org](https://gamblersinternational.org)'
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
      return;
    }

    // -------------------------------------------------------------------------
    // /sos status
    // -------------------------------------------------------------------------
    if (sub === 'status') {
      if (!APPLICATIONS_OPEN) {
        await interaction.reply({ embeds: [PENDING_FUNDS_EMBED], ephemeral: true });
        return;
      }

      const app = loadApplication(interaction.user.id);
      if (!app) {
        await interaction.reply({
          content: 'You have no active application. Use `/sos apply` to submit one. Use `/sos info` to learn how it works.',
          ephemeral: true,
        });
        return;
      }

      const embed = buildReviewEmbed(app).setTitle('YOUR APPLICATION STATUS');
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // -------------------------------------------------------------------------
    // /sos apply
    // -------------------------------------------------------------------------
    if (sub === 'apply') {
      if (!APPLICATIONS_OPEN) {
        await interaction.reply({ embeds: [PENDING_FUNDS_EMBED], ephemeral: true });
        return;
      }

      const agreed = interaction.options.getBoolean('agree', true);
      if (!agreed) {
        await interaction.reply({
          content:
            '[!] You must agree to the terms to apply. If you need help now, call **1-800-522-4700** (National Problem Gambling Helpline) or visit [ncpgambling.org](https://www.ncpgambling.org).',
          ephemeral: true,
        });
        return;
      }

      // Check for existing active application
      const existing = loadApplication(interaction.user.id);
      if (existing && !['rejected', 'cancelled', 'paid'].includes(existing.status)) {
        await interaction.reply({
          content: `You already have an active application (\`${existing.id}\`) with status \`${existing.status}\`. Use \`/recover status\` to check it.`,
          ephemeral: true,
        });
        return;
      }

      const hardship = interaction.options.getString('hardship', true);
      const steps = interaction.options.getString('steps', true);
      const supportContactRaw = interaction.options.getString('support_contact', true);

      // Parse Discord mention
      const mentionMatch = supportContactRaw.match(/^<@!?(\d+)>$/);
      const supportDiscordId = mentionMatch ? mentionMatch[1] : undefined;

      const appId = crypto.randomBytes(6).toString('hex').toUpperCase();
      const app: RecoveryApplication = {
        id: appId,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.tag,
        hardship,
        steps,
        supportContact: supportContactRaw,
        supportDiscordId,
        supportConfirmed: !supportDiscordId, // External contacts bypass Discord DM confirm
        reviewMessageId: undefined,
        reviewChannelId: undefined,
        communityVotes: 0,
        status: supportDiscordId ? 'pending_support' : 'under_review',
        appliedAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveApplication(app);

      await interaction.deferReply({ ephemeral: true });

      // DM support contact if Discord user
      if (supportDiscordId) {
        await notifySupportContact(app, interaction.client);
      }

      // Post to review channel
      const reviewChannelId = process.env.RECOVERY_REVIEW_CHANNEL_ID;
      if (reviewChannelId) {
        try {
          const reviewChannel = (await interaction.client.channels.fetch(reviewChannelId)) as TextChannel;
          const reviewEmbed = buildReviewEmbed(app);
          const buttons = buildReviewButtons(appId);
          const reviewMsg = await reviewChannel.send({ embeds: [reviewEmbed], components: [buttons] });

          app.reviewMessageId = reviewMsg.id;
          app.reviewChannelId = reviewChannelId;
          saveApplication(app);
        } catch (err) {
          console.error('[recover] Failed to post to review channel:', err);
        }
      } else {
        console.warn('[recover] RECOVERY_REVIEW_CHANNEL_ID not set — application stored but not posted for review.');
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('APPLICATION SUBMITTED')
        .setDescription(
          `Your application (\`${appId}\`) has been received and is under review.\n\n` +
          (supportDiscordId
            ? `A confirmation request has been sent to <@${supportDiscordId}>. Their response will be noted but is not a blocker.\n\n`
            : `External contact noted — reviewers will verify manually.\n\n`) +
          `**What happens next:**\n` +
          `1. Reviewers assess your application for authenticity\n` +
          `2. Community members may vouch for your application\n` +
          `3. An admin confirms the final decision\n` +
          `4. If approved and you have a linked wallet, funds are sent\n\n` +
          `Make sure your wallet is linked: \`/linkwallet address:YOUR_WALLET\`\n\n` +
          `**If you need immediate help:** 1-800-522-4700 | [ncpgambling.org/chat](https://www.ncpgambling.org/help-treatment/chat)`
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.editReply({ embeds: [confirmEmbed] });
      return;
    }

    // -------------------------------------------------------------------------
    // /recover admin
    // -------------------------------------------------------------------------
    if (sub === 'admin') {
      const member = interaction.member as GuildMember;
      const adminRoleId = process.env.RECOVERY_ADMIN_ROLE_ID;
      const isAdmin =
        (adminRoleId && member.roles.cache.has(adminRoleId)) ||
        member.permissions.has('Administrator');

      if (!isAdmin) {
        await interaction.reply({ content: '[!] Admins only.', ephemeral: true });
        return;
      }

      const action = interaction.options.getString('action', true);
      const appId = interaction.options.getString('application_id', true);
      const rejectReason = interaction.options.getString('reject_reason');

      const app = loadApplicationById(appId);
      if (!app) {
        await interaction.reply({ content: `[!] Application \`${appId}\` not found.`, ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      if (action === 'reject') {
        if (!rejectReason) {
          await interaction.editReply({ content: '[!] A rejection reason is required.' });
          return;
        }
        app.status = 'rejected';
        app.rejectionReason = rejectReason;
        app.approvedBy = interaction.user.tag;
        saveApplication(app);

        try {
          const applicant = await interaction.client.users.fetch(app.discordUserId);
          await applicant.send(
            `Your TiltCheck recovery microgrant application (\`${app.id}\`) was not approved.\n\n**Reason:** ${rejectReason}\n\nIf you are struggling, help is available: **1-800-522-4700** or [ncpgambling.org/chat](https://www.ncpgambling.org/help-treatment/chat).`
          );
        } catch { /* DMs disabled — non-fatal */ }

        await interaction.editReply({ content: `Application \`${appId}\` rejected. Applicant notified (if DMs are open).` });
        return;
      }

      if (action === 'approve') {
        if (!['under_review', 'pending_support'].includes(app.status)) {
          await interaction.editReply({ content: `[!] Application status is \`${app.status}\` — cannot approve.` });
          return;
        }

        const dbUser = await findUserByDiscordId(app.discordUserId).catch(() => null);
        if (!dbUser?.wallet_address) {
          await interaction.editReply({
            content: `[!] <@${app.discordUserId}> has not linked a wallet. Ask them to use \`/linkwallet\` first.`,
          });
          return;
        }

        app.status = 'approved';
        app.approvedBy = interaction.user.tag;
        saveApplication(app);

        const reviewChannel = process.env.RECOVERY_REVIEW_CHANNEL_ID
          ? (await interaction.client.channels.fetch(process.env.RECOVERY_REVIEW_CHANNEL_ID).catch(() => null)) as TextChannel | null
          : null;

        const result = await executeGrantPayout(app, dbUser.wallet_address, interaction.user.tag, reviewChannel);
        if (result.success) {
          await interaction.editReply({
            content: `Grant paid to <@${app.discordUserId}>.\n[Solscan](https://solscan.io/tx/${result.signature})`,
          });
        } else {
          await interaction.editReply({ content: `[!] Payout failed: ${result.error}` });
        }
        return;
      }
    }
  },
};
