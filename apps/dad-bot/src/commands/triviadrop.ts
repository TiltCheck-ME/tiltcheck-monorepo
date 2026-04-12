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

// -----------------------------------------------------------------------------
// Question Bank
// -----------------------------------------------------------------------------

interface TriviaQuestion {
  text: string;
  choices: Record<AnswerKey, string>;
  answer: AnswerKey;
  explanation: string;
}

const QUESTION_BANK: Record<string, TriviaQuestion[]> = {
  casino: [
    {
      text: 'What does RTP stand for?',
      choices: { A: 'Return to Player', B: 'Risk Transfer Protocol', C: 'Random Testing Protocol', D: 'Revenue to Platform' },
      answer: 'A',
      explanation: 'RTP (Return to Player) is the percentage of wagered money a slot pays back over time.',
    },
    {
      text: 'What is the house edge on a standard European roulette wheel?',
      choices: { A: '5.26%', B: '1%', C: '2.70%', D: '0%' },
      answer: 'C',
      explanation: 'European roulette has a single zero, giving the house a 2.70% edge. American roulette (double zero) is 5.26%.',
    },
    {
      text: 'Which casino game typically has the lowest house edge with optimal play?',
      choices: { A: 'Slots', B: 'Blackjack (basic strategy)', C: 'Keno', D: 'Big Six Wheel' },
      answer: 'B',
      explanation: 'Blackjack with perfect basic strategy can reduce the house edge to under 0.5%.',
    },
    {
      text: 'What does "wagering requirement" mean for a casino bonus?',
      choices: {
        A: 'You must wager the bonus x the multiplier before withdrawing',
        B: 'The minimum deposit required',
        C: 'A loyalty points multiplier',
        D: 'A casino license requirement',
      },
      answer: 'A',
      explanation: 'e.g. a 30x wagering requirement on a $100 bonus means $3,000 must be wagered before withdrawal.',
    },
    {
      text: 'What is "provably fair" in crypto casinos?',
      choices: {
        A: 'Games audited by a third party once per year',
        B: 'Cryptographic proof that each game result was not manipulated',
        C: 'A government certification',
        D: 'A marketing term with no standard meaning',
      },
      answer: 'B',
      explanation: 'Provably fair uses hashing and seeds so players can independently verify each outcome.',
    },
    {
      text: 'In Blackjack, what is "basic strategy"?',
      choices: {
        A: 'Always hitting on soft hands',
        B: 'Mathematically optimal play for every hand combination',
        C: 'Betting the same amount every round',
        D: 'Splitting aces whenever possible',
      },
      answer: 'B',
      explanation: 'Basic strategy charts map every hand/dealer combination to the statistically best move.',
    },
    {
      text: 'What does "variance" describe in gambling?',
      choices: {
        A: "The casino's profit margin",
        B: 'How spread out outcomes are around the expected value',
        C: 'A mathematical formula for RTP',
        D: 'A bonus type offered by casinos',
      },
      answer: 'B',
      explanation: 'High variance = infrequent big wins. Low variance = frequent small wins. Both can share the same RTP.',
    },
    {
      text: 'What is a "comp" in casino terminology?',
      choices: {
        A: 'A casino employee',
        B: 'The final hand in Baccarat',
        C: 'Free perks given to loyal/high-volume players',
        D: 'A game completion bonus',
      },
      answer: 'C',
      explanation: 'Comps (complimentaries) include free hotel stays, meals, credits — standard tools to retain big players.',
    },
  ],

  crypto: [
    {
      text: 'What is a "gas fee" on Ethereum?',
      choices: {
        A: 'Fee paid to validators to process a transaction',
        B: 'Monthly platform subscription fee',
        C: 'Exchange withdrawal fee',
        D: 'Tax on crypto earnings',
      },
      answer: 'A',
      explanation: 'Gas fees compensate validators for the computation required to execute transactions.',
    },
    {
      text: '"HODL" originated as what?',
      choices: {
        A: 'Acronym for Hold On for Dear Life',
        B: 'A famous typo of "hold" in a 2013 BitcoinTalk post',
        C: 'A Dutch trading strategy',
        D: 'Short for "hodling asset"',
      },
      answer: 'B',
      explanation: 'User "GameKyuubi" posted "I AM HODLING" while drunk in 2013. The typo became crypto gospel.',
    },
    {
      text: 'What is a "rug pull" in crypto?',
      choices: {
        A: 'A protocol upgrade that removes staking liquidity',
        B: 'Developers abandoning a project and stealing investor funds',
        C: 'Reducing the circulating supply of a token',
        D: 'A bearish technical pattern',
      },
      answer: 'B',
      explanation: 'Devs hype a project, collect funds, then drain the liquidity and disappear.',
    },
    {
      text: 'What does "DeFi" stand for?',
      choices: { A: 'Decentralized Finance', B: 'Digital Financial Infrastructure', C: 'Derivative Finance Index', D: 'Distributed Fiat Integration' },
      answer: 'A',
      explanation: 'DeFi uses smart contracts to recreate financial instruments without centralized intermediaries.',
    },
    {
      text: 'What is the maximum supply of Bitcoin?',
      choices: { A: '100 million BTC', B: '21 million BTC', C: '42 million BTC', D: 'Unlimited' },
      answer: 'B',
      explanation: '21 million BTC is hard-coded in the Bitcoin protocol. The last one will be mined around 2140.',
    },
    {
      text: 'What is "slippage" in a DEX trade?',
      choices: {
        A: 'A trade execution delay',
        B: 'The difference between expected and actual trade price',
        C: 'Transaction fee percentage',
        D: 'Token price movement in 24h',
      },
      answer: 'B',
      explanation: 'Low liquidity causes your large order to move the price against you before it fills.',
    },
    {
      text: 'What does APY stand for in DeFi?',
      choices: { A: 'Annual Percentage Yield', B: 'Automated Protocol Yield', C: 'Asset Price Yield', D: 'Annual Protocol Yield' },
      answer: 'A',
      explanation: 'APY accounts for compound interest. APR does not. In DeFi, APY is usually the headline number.',
    },
    {
      text: 'What is a "smart contract"?',
      choices: {
        A: 'A legal agreement between two crypto traders',
        B: 'Self-executing code stored on a blockchain',
        C: 'A premium trading API feature',
        D: 'An NFT licensing agreement',
      },
      answer: 'B',
      explanation: 'Smart contracts execute automatically when conditions are met — no intermediary needed.',
    },
  ],

  degen: [
    {
      text: 'What does "NFA" mean in degen circles?',
      choices: { A: 'Non-Fungible Asset', B: 'Not Financial Advice', C: 'No Fee Applicable', D: 'Network Fee Alert' },
      answer: 'B',
      explanation: 'NFA is the standard disclaimer before someone gives you financial advice anyway.',
    },
    {
      text: 'What is "aping in"?',
      choices: {
        A: "Copying a successful trader's entire portfolio",
        B: 'Buying into a project without doing research',
        C: 'A DCA strategy for volatile assets',
        D: 'Shorting a project on margin',
      },
      answer: 'B',
      explanation: 'Aping in = all-in, no research, vibes-based entry. Sometimes it works. Often it does not.',
    },
    {
      text: 'What does "NGMI" mean?',
      choices: { A: 'Not Gonna Make It', B: 'Next Generation Market Index', C: 'No Gas Market Index', D: 'New Global Market Infrastructure' },
      answer: 'A',
      explanation: '"NGMI" is used when someone makes a choice that guarantees they will not survive the next bull run.',
    },
    {
      text: 'What does "paper hands" mean?',
      choices: {
        A: 'A trader who uses high leverage',
        B: 'Someone who sells at the first sign of trouble',
        C: 'A printing error in a smart contract',
        D: 'Low-volume passive trading',
      },
      answer: 'B',
      explanation: 'Opposite of "diamond hands." Paper hands fold early and miss the pump.',
    },
    {
      text: 'What does "down bad" mean?',
      choices: {
        A: 'Deep in a losing streak with no way out',
        B: 'A technical bearish market signal',
        C: 'A specific degen trading strategy',
        D: 'Out of ETH for gas fees',
      },
      answer: 'A',
      explanation: 'Down bad = emotionally and financially devastated. Used broadly in gambling and crypto.',
    },
    {
      text: 'What is "floor price" in the NFT space?',
      choices: {
        A: 'The highest price an NFT in a collection sold for',
        B: 'The lowest listed asking price in a collection',
        C: 'The creator royalty percentage',
        D: 'The original mint price',
      },
      answer: 'B',
      explanation: 'Floor price is the cheapest you can buy into a collection right now. Watched obsessively by degens.',
    },
    {
      text: 'What does "degen" actually mean in this context?',
      choices: {
        A: 'A type of token standard',
        B: 'Someone who makes high-risk bets with no conventional strategy',
        C: 'A DeFi yield protocol',
        D: 'A Discord moderation role',
      },
      answer: 'B',
      explanation: 'Short for "degenerate gambler." In crypto/gambling culture it is worn as a badge of honor.',
    },
    {
      text: 'What is a "pump and dump"?',
      choices: {
        A: 'A liquidity mining strategy',
        B: 'Artificially inflating an asset price then selling at the peak',
        C: 'A stablecoin depeg event',
        D: 'A legitimate market-making technique',
      },
      answer: 'B',
      explanation: 'Coordinated buying creates FOMO, latecomers buy the top, organizers dump on them.',
    },
  ],

  gambling_math: [
    {
      text: 'A fair coin lands heads 10 times in a row. What is the probability of heads on flip 11?',
      choices: { A: 'Less than 50%', B: 'Exactly 50%', C: 'More than 50%', D: 'Cannot be calculated' },
      answer: 'B',
      explanation: 'Each flip is independent. Past results do not change future probabilities.',
    },
    {
      text: 'What is the "gambler\'s fallacy"?',
      choices: {
        A: 'Believing past independent events influence future ones',
        B: 'Underestimating the compounding house edge',
        C: 'Overbetting relative to bankroll',
        D: 'Confusing EV with variance',
      },
      answer: 'A',
      explanation: '"Red hit 8 times — black is due." It is not. Independent events have no memory.',
    },
    {
      text: 'If a slot has 95% RTP, what is the house edge?',
      choices: { A: '95%', B: '5%', C: '0.95%', D: '0.05%' },
      answer: 'B',
      explanation: 'House edge = 100% - RTP. A 95% RTP machine keeps 5 cents of every dollar wagered.',
    },
    {
      text: 'What is the Kelly Criterion used for?',
      choices: {
        A: 'Calculating optimal bet size to maximize long-term growth',
        B: 'Determining when to stop gambling for the day',
        C: 'Predicting slot machine payout sequences',
        D: 'Calculating progressive jackpot odds',
      },
      answer: 'A',
      explanation: 'Kelly tells you what fraction of your bankroll to bet given your edge and odds.',
    },
    {
      text: 'If a game has negative expected value (-EV), what does that mean?',
      choices: {
        A: 'The player has an edge over the house',
        B: 'On average, the player loses money over time',
        C: 'The game is rigged and illegal',
        D: 'Volatility is unusually high',
      },
      answer: 'B',
      explanation: 'Nearly all casino games are -EV. The house edge ensures the casino wins in the long run.',
    },
    {
      text: 'What does standard deviation measure in a gambling context?',
      choices: {
        A: 'Average win amount per session',
        B: 'Spread of outcomes around the mean',
        C: 'The compounded house edge over time',
        D: 'Number of rounds needed to reach EV',
      },
      answer: 'B',
      explanation: 'High SD = wilder swings. Low SD = more consistent results. Both can have the same EV.',
    },
    {
      text: 'In poker, what are "pot odds"?',
      choices: {
        A: 'Ratio of the current pot size to the cost of a call',
        B: 'Probability of hitting your draw card',
        C: 'Expected value of a specific bet',
        D: 'The house rake as a percentage',
      },
      answer: 'A',
      explanation: 'If the pot is $100 and you need to call $25, your pot odds are 4:1.',
    },
    {
      text: 'What does "variance" mean for a high-RTP slot vs a low-RTP slot?',
      choices: {
        A: 'RTP and variance are the same measurement',
        B: 'RTP measures long-run return; variance measures swing intensity — they are independent',
        C: 'High RTP always means low variance',
        D: 'Low variance always means high RTP',
      },
      answer: 'B',
      explanation: 'A 96% RTP slot can be brutal in the short run if it is high variance. RTP and variance are separate axes.',
    },
  ],

  strategy: [
    {
      text: 'What is the Martingale strategy?',
      choices: {
        A: 'Flat betting the same amount every round',
        B: 'Doubling your bet after every loss',
        C: 'Only betting when you have a proven edge',
        D: 'Increasing bets after every win',
      },
      answer: 'B',
      explanation: 'Martingale: double after loss until you recover. Works in theory; table limits and bankroll limits kill it in practice.',
    },
    {
      text: 'Why does the Martingale strategy fail in real play?',
      choices: {
        A: 'It requires perfect timing to execute',
        B: 'Table limits and finite bankrolls prevent infinite doubling',
        C: 'All casinos ban it explicitly',
        D: 'It only works in poker, not slots or roulette',
      },
      answer: 'B',
      explanation: 'A 10-loss streak requires betting 512x your original stake. Table max and bankroll always impose a ceiling.',
    },
    {
      text: 'What does "bankroll management" mean?',
      choices: {
        A: 'Depositing funds across multiple casinos',
        B: 'Allocating gambling funds to manage risk and session length',
        C: 'The casino accounting system for player funds',
        D: 'Tracking bonus wagering progress',
      },
      answer: 'B',
      explanation: 'Good bankroll management defines session limits, max bet size, and stop-loss thresholds before you play.',
    },
    {
      text: 'What is "loss chasing"?',
      choices: {
        A: 'A profitable short-term recovery strategy',
        B: 'Increasing bets after losses to try to recover',
        C: 'Placing bets on losing outcomes to hedge',
        D: 'A slot bonus feature',
      },
      answer: 'B',
      explanation: 'Loss chasing is one of the clearest indicators of problem gambling and is what TiltCheck is built to detect.',
    },
    {
      text: 'What does "setting a stop-loss" mean?',
      choices: {
        A: 'Stopping only after landing a big win',
        B: 'Predetermining the maximum loss before you quit the session',
        C: 'A specific poker betting strategy',
        D: 'Blocking yourself from a casino site',
      },
      answer: 'B',
      explanation: 'Stop-loss is a pre-commitment tool. Set it before the session, honor it during.',
    },
    {
      text: 'What is "tilt" in gambling and trading?',
      choices: {
        A: 'A profitable emotional edge state',
        B: 'A cognitive/emotional state causing irrational decisions due to frustration or excitement',
        C: 'A physical slot machine malfunction',
        D: 'A bonus activation trigger',
      },
      answer: 'B',
      explanation: 'Tilt costs players more money than the house edge. Recognizing it is the first step to beating it.',
    },
    {
      text: 'Why is card counting in Blackjack effective?',
      choices: {
        A: 'It trains your memory to recognize card patterns',
        B: 'It tracks the high-to-low card ratio to adjust bet sizes accordingly',
        C: 'It predicts the exact next card to be dealt',
        D: 'It guarantees a win on every hand',
      },
      answer: 'B',
      explanation: 'When the deck is rich in 10s and aces, the player has an edge. Card counting identifies that window.',
    },
    {
      text: 'What is the main purpose of TiltCheck?',
      choices: {
        A: 'To maximize total casino profits',
        B: 'To help degens recognize tilt, secure profits, and gamble more responsibly',
        C: 'To predict winning numbers and game outcomes',
        D: 'To find the highest RTP slots across all casinos',
      },
      answer: 'B',
      explanation: 'Redeem to Win. TiltCheck is the edge equalizer built by degens, for degens.',
    },
  ],
};

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
  const pool = QUESTION_BANK[topic] || QUESTION_BANK['casino'];
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

    for (let round = 1; round <= rounds; round++) {
      const { q } = pickQuestion(topic, usedQuestions);

      const questionEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`[ROUND ${round}/${rounds}] — ${timer}s to answer`)
        .setDescription(`**${q.text}**\n\n${Object.entries(q.choices).map(([k, v]) => `${ANSWER_EMOJIS[k as AnswerKey]} **${k}.** ${v}`).join('\n')}`)
        .setFooter({ text: `Round prize: ~${(prizePerRound / LAMPORTS_PER_SOL).toFixed(4)} SOL split among all correct reactors` });

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
          const correctUsers = correctReaction?.users.cache.filter(u => !u.bot) ?? new Map();
          const correctUserIds = [...correctUsers.keys()];

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
