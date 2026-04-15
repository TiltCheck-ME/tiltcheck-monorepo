// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Message,
  TextChannel,
} from 'discord.js';
import type { Command } from '../types.js';
import { findUserByDiscordId } from '@tiltcheck/db';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TRIVIA_QUESTION_BANK,
  type SharedTriviaQuestion,
  type SharedTriviaTopic,
} from '@tiltcheck/shared';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const COMMUNITY_WALLET = 'DLP9VYyuLze7VZ7oMG6S77YT3BxZZBDJniTFx1NeDcem';
const MAX_PRIZE_SOL = 5;
const FUNDING_POLL_INTERVAL_MS = 5000;
const FUNDING_POLL_ATTEMPTS = 30; // 2.5 minutes total

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

const ANSWER_EMOJIS = {
  A: '\u{1F1E6}', // 🇦
  B: '\u{1F1E7}', // 🇧
  C: '\u{1F1E8}', // 🇨
  D: '\u{1F1E9}', // 🇩
} as const;

type AnswerKey = keyof typeof ANSWER_EMOJIS;
type TriviaQuestion = SharedTriviaQuestion;

// -----------------------------------------------------------------------------
// Escrow Persistence
// -----------------------------------------------------------------------------

interface EscrowRecord {
  id: string;
  pubkey: string;
  encryptedSecret: string;
  totalLamports: number;
  hostDiscordId: string;
  guildId: string;
  channelId: string;
  startedAt: number;
}

const ESCROW_DIR = path.join(process.cwd(), 'tmp', 'escrow');

function getEncryptionPassword(): string {
  return process.env.DISCORD_TOKEN || process.env.JWT_SECRET || 'triviadrop-default-key-change-me';
}

function encryptSecret(hexKey: string): string {
  const password = getEncryptionPassword();
  const key = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(hexKey, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptSecret(encrypted: string): string {
  const password = getEncryptionPassword();
  const [ivHex, encHex] = encrypted.split(':');
  const key = crypto.createHash('sha256').update(password).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

function saveEscrowRecord(record: EscrowRecord): void {
  try {
    fs.mkdirSync(ESCROW_DIR, { recursive: true });
    fs.writeFileSync(path.join(ESCROW_DIR, `${record.id}.json`), JSON.stringify(record), 'utf8');
  } catch (err) {
    console.error('[triviadrop] Failed to persist escrow record:', err);
  }
}

function deleteEscrowRecord(id: string): void {
  try {
    const filePath = path.join(ESCROW_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('[triviadrop] Failed to delete escrow record:', err);
  }
}

// Called on bot startup to detect orphaned escrows from a previous crash
export function recoverOrphanedEscrows(): void {
  try {
    if (!fs.existsSync(ESCROW_DIR)) return;
    const files = fs.readdirSync(ESCROW_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) return;
    console.warn(`[triviadrop] WARNING: ${files.length} orphaned escrow(s) found in ${ESCROW_DIR}`);
    console.warn('[triviadrop] Review these files manually. Funds may be recoverable via the encrypted keypairs.');
    files.forEach(f => console.warn(`  - ${f}`));
  } catch (_err) {
    // Non-fatal
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function pickQuestion(topic: string, used: Set<number>): { q: TriviaQuestion; idx: number } {
  const normalizedTopic = (topic in TRIVIA_QUESTION_BANK ? topic : 'casino') as SharedTriviaTopic;
  const pool = TRIVIA_QUESTION_BANK[normalizedTopic];
  const available = pool.map((_, i) => i).filter(i => !used.has(i));
  if (available.length === 0) used.clear(); // Wrap around if exhausted
  const fresh = pool.map((_, i) => i).filter(i => !used.has(i));
  const idx = fresh[Math.floor(Math.random() * fresh.length)];
  used.add(idx);
  return { q: pool[idx], idx };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function announceTriviaCollectorBlock(channel: TextChannel, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  await channel.send(
    `[ANTI-COLLECTOR] ${userIds.map((userId) => `<@${userId}>`).join(', ')} tripped the trivia collector check by reacting to multiple answers. ` +
    `One answer per round. Script-grabbing gets bounced and earns nothing.`
  ).catch(() => {});
}

// -----------------------------------------------------------------------------
// Command Definition
// -----------------------------------------------------------------------------

export const triviadrop: Command = {
  data: new SlashCommandBuilder()
    .setName('triviadrop')
    .setDescription('Host a trivia game. Correct reactors split the SOL prize pool.')
    .addStringOption(opt =>
      opt
        .setName('topic')
        .setDescription('Question category')
        .setRequired(true)
        .addChoices(
          { name: 'Casino', value: 'casino' },
          { name: 'Crypto', value: 'crypto' },
          { name: 'Degen Culture', value: 'degen' },
          { name: 'Gambling Math', value: 'gambling_math' },
          { name: 'Strategy', value: 'strategy' }
        )
    )
    .addNumberOption(opt =>
      opt
        .setName('prize_total')
        .setDescription('Total SOL prize pool (max 5 SOL)')
        .setRequired(true)
        .setMinValue(0.01)
        .setMaxValue(MAX_PRIZE_SOL)
    )
    .addIntegerOption(opt =>
      opt.setName('rounds').setDescription('Number of questions (1–5, default 3)').setMinValue(1).setMaxValue(5)
    )
    .addIntegerOption(opt =>
      opt.setName('timer').setDescription('Seconds per question (15–60, default 30)').setMinValue(15).setMaxValue(60)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const topic = interaction.options.getString('topic', true);
    const prizeSol = interaction.options.getNumber('prize_total', true);
    const rounds = interaction.options.getInteger('rounds') ?? 3;
    const timer = interaction.options.getInteger('timer') ?? 30;
    const channel = interaction.channel as TextChannel;

    await interaction.deferReply({ ephemeral: true });

    // -------------------------------------------------------------------------
    // 1. Create and fund escrow
    // -------------------------------------------------------------------------
    const escrow = Keypair.generate();
    const amountLamports = Math.floor(prizeSol * LAMPORTS_PER_SOL);
    const escrowId = `${interaction.guildId}-${interaction.channelId}-${Date.now()}`;

    saveEscrowRecord({
      id: escrowId,
      pubkey: escrow.publicKey.toBase58(),
      encryptedSecret: encryptSecret(Buffer.from(escrow.secretKey).toString('hex')),
      totalLamports: amountLamports,
      hostDiscordId: interaction.user.id,
      guildId: interaction.guildId ?? '',
      channelId: interaction.channelId,
      startedAt: Date.now(),
    });

    const solanaPayUrl = `solana:${escrow.publicKey.toBase58()}?amount=${prizeSol.toFixed(4)}&label=TriviaDropEscrow&message=TiltCheck+Trivia+Prize+Pool`;

    const fundBtn = new ButtonBuilder()
      .setLabel('[FUND PRIZE POOL]')
      .setStyle(ButtonStyle.Link)
      .setURL(solanaPayUrl);
    const fundRow = new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn);

    const fundEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('[TRIVIA DROP — FUND ESCROW]')
      .setDescription(
        `Prize pool: **${prizeSol.toFixed(4)} SOL** | **${rounds} round(s)** | **${timer}s per question** | Topic: **${topic.replace('_', ' ')}**

**Escrow Address:** \`${escrow.publicKey.toBase58()}\`

Fund this address to start the game. You have **2.5 minutes.**

The escrow keypair is persisted securely — funds are recoverable if the bot restarts.`
      )
      .setFooter({ text: 'Non-custodial. Your keys stay yours. Escrow exists only for the duration of this game.' });

    await interaction.editReply({ embeds: [fundEmbed], components: [fundRow] });

    // Poll for funding
    let isFunded = false;
    for (let i = 0; i < FUNDING_POLL_ATTEMPTS; i++) {
      const balance = await connection.getBalance(escrow.publicKey).catch(() => 0);
      if (balance >= amountLamports) {
        isFunded = true;
        break;
      }
      await delay(FUNDING_POLL_INTERVAL_MS);
    }

    if (!isFunded) {
      deleteEscrowRecord(escrowId);
      await interaction.editReply({ content: '[!] Funding timed out. Escrow cancelled.', components: [] });
      return;
    }

    await interaction.editReply({ content: '[OK] Escrow funded. Game starting...', components: [] });

    // -------------------------------------------------------------------------
    // 2. Announce game start
    // -------------------------------------------------------------------------
    const startEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('[TRIVIA DROP — GAME ON]')
      .setDescription(
        `${interaction.user} is hosting a **${topic.replace('_', ' ')}** trivia game.\n\n**Prize Pool:** ${prizeSol.toFixed(4)} SOL | **Rounds:** ${rounds} | **Timer:** ${timer}s per question\n\nReact with the correct letter to earn your share of each round's prize.\nAll correct reactors split the round — no first-place advantage.`
      )
      .setFooter({ text: 'Payouts use the wallet already linked to your TiltCheck profile. No linked wallet means the share goes to the community wallet.' });

    await channel.send({ embeds: [startEmbed] });
    await delay(3000);

    // -------------------------------------------------------------------------
    // 3. Run rounds
    // -------------------------------------------------------------------------
    const winnings = new Map<string, number>(); // discordId → total lamports earned
    const prizePerRound = Math.floor(amountLamports / rounds);
    const usedQuestions = new Set<number>();
    const blockedCollectors = new Set<string>();
    const announcedCollectors = new Set<string>();

    for (let round = 1; round <= rounds; round++) {
      const { q } = pickQuestion(topic, usedQuestions);

      const questionEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`[ROUND ${round}/${rounds}] — ${timer}s to answer`)
        .setDescription(`**${q.text}**\n\n${Object.entries(q.choices).map(([k, v]) => `${ANSWER_EMOJIS[k as AnswerKey]} **${k}.** ${v}`).join('\n')}`)
        .setFooter({ text: `Round prize: ~${(prizePerRound / LAMPORTS_PER_SOL).toFixed(4)} SOL split among all correct reactors. Reacting to multiple answers flags collector behavior and kills your payout.` });

      const qMessage: Message = await channel.send({ embeds: [questionEmbed] });

      // Bot reacts first so users see the options as clickable buttons
      for (const emoji of Object.values(ANSWER_EMOJIS)) {
        await qMessage.react(emoji).catch(() => null);
        await delay(300); // Slight delay to avoid rate limit
      }

      // Collect reactions for the duration of the timer
      await new Promise<void>(resolve => {
        const collector = qMessage.createReactionCollector({
          filter: (reaction, user) => {
            const name = reaction.emoji.name ?? '';
            return (Object.values(ANSWER_EMOJIS) as string[]).includes(name) && !user.bot;
          },
          time: timer * 1000,
        });

        collector.on('end', async collected => {
          const correctEmoji = ANSWER_EMOJIS[q.answer];
          const correctReaction = collected.find(r => r.emoji.name === correctEmoji);
          const answerSelections = new Map<string, Set<string>>();

          for (const reaction of collected.values()) {
            const emojiName = reaction.emoji.name ?? '';
            if (!(Object.values(ANSWER_EMOJIS) as string[]).includes(emojiName)) {
              continue;
            }

            const users = await reaction.users.fetch();
            users.forEach((user) => {
              if (user.bot) return;

              if (!answerSelections.has(user.id)) {
                answerSelections.set(user.id, new Set<string>());
              }
              answerSelections.get(user.id)?.add(emojiName);
            });
          }

          const newlyBlockedCollectors = [...answerSelections.entries()]
            .filter(([, selections]) => selections.size > 1)
            .map(([userId]) => userId)
            .filter((userId) => !announcedCollectors.has(userId));

          newlyBlockedCollectors.forEach((userId) => {
            blockedCollectors.add(userId);
            announcedCollectors.add(userId);
          });

          if (newlyBlockedCollectors.length > 0) {
            await announceTriviaCollectorBlock(channel, newlyBlockedCollectors);
          }

          const correctUsers = correctReaction
            ? await correctReaction.users.fetch()
            : null;
          const correctUserIds = [...(correctUsers?.values() ?? [])]
            .filter((user) => !user.bot)
            .map((user) => user.id)
            .filter((userId) => !blockedCollectors.has(userId) && (answerSelections.get(userId)?.size ?? 0) === 1);

          if (correctUserIds.length > 0) {
            const sharePerUser = Math.floor(prizePerRound / correctUserIds.length);
            for (const uid of correctUserIds) {
              winnings.set(uid, (winnings.get(uid) ?? 0) + sharePerUser);
            }
          }

          const resultEmbed = new EmbedBuilder()
            .setColor(correctUserIds.length > 0 ? 0x22d3a6 : 0xef4444)
            .setTitle(`[ROUND ${round} RESULT]`)
            .setDescription(
              correctUserIds.length > 0
                ? `Correct answer: **${q.answer} — ${q.choices[q.answer]}**\n\n${q.explanation}\n\n**${correctUserIds.length} degen(s) got it right** — each earns ~${(Math.floor(prizePerRound / correctUserIds.length) / LAMPORTS_PER_SOL).toFixed(4)} SOL`
                : `Correct answer: **${q.answer} — ${q.choices[q.answer]}**\n\n${q.explanation}\n\nNobody got it right. Round prize rolls into the pool.`
            );

          await channel.send({ embeds: [resultEmbed] });
          await delay(2000);
          resolve();
        });
      });
    }

    // -------------------------------------------------------------------------
    // 4. Payout phase
    // -------------------------------------------------------------------------
    if (winnings.size === 0) {
      const noWinnersEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('[TRIVIA DROP — NO WINNERS]')
        .setDescription(
          `Nobody answered correctly across all ${rounds} rounds.\n\nThe full prize pool of **${prizeSol.toFixed(4)} SOL** is being donated to the TiltCheck community wallet.\n\`${COMMUNITY_WALLET}\``
        );
      await channel.send({ embeds: [noWinnersEmbed] });

      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: escrow.publicKey,
            toPubkey: new PublicKey(COMMUNITY_WALLET),
            lamports: amountLamports,
          })
        );
        await sendAndConfirmTransaction(connection, tx, [escrow]);
      } catch (err) {
        console.error('[triviadrop] Community donation failed:', err);
        await channel.send('[!] Community donation failed. Escrow may retain dust. Contact admin.');
      }

      deleteEscrowRecord(escrowId);
      return;
    }

    // Build payout transaction
    const payoutEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('[TRIVIA DROP — PAYING OUT]')
      .setDescription('Sending winnings now...');
    await channel.send({ embeds: [payoutEmbed] });

    const transaction = new Transaction();
    const payoutLines: string[] = [];
    let totalPaidLamports = 0;

    for (const [userId, lamports] of winnings.entries()) {
      const user = await findUserByDiscordId(userId).catch(() => null);
      const dest = user?.wallet_address ?? COMMUNITY_WALLET;
      const isLinked = !!user?.wallet_address;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: escrow.publicKey,
          toPubkey: new PublicKey(dest),
          lamports,
        })
      );
      totalPaidLamports += lamports;

      const solAmount = (lamports / LAMPORTS_PER_SOL).toFixed(4);
      payoutLines.push(
        isLinked
          ? `<@${userId}> — **${solAmount} SOL**`
          : `<@${userId}> — **${solAmount} SOL** sent to community (no linked wallet on file)`
      );
    }

    // Send any rounding dust to community wallet
    const dust = amountLamports - totalPaidLamports;
    if (dust > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: escrow.publicKey,
          toPubkey: new PublicKey(COMMUNITY_WALLET),
          lamports: dust,
        })
      );
    }

    try {
      const sig = await sendAndConfirmTransaction(connection, transaction, [escrow]);

      const finalEmbed = new EmbedBuilder()
        .setColor(0x22d3a6)
        .setTitle('[TRIVIA DROP — COMPLETE]')
        .setDescription(
          `**Winners (${winnings.size}):**\n${payoutLines.join('\n')}\n\n**Total paid:** ${(totalPaidLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL\n\n[View on Solscan](https://solscan.io/tx/${sig})`
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await channel.send({ embeds: [finalEmbed] });
    } catch (err) {
      console.error('[triviadrop] Payout transaction failed:', err);
      await channel.send(
        `[!] Payout failed. Funds remain in escrow: \`${escrow.publicKey.toBase58()}\`\nContact admin with the escrow address and session ID: \`${escrowId}\``
      );
    }

    deleteEscrowRecord(escrowId);
  },
};
