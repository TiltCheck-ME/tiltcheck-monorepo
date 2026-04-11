// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
//
// Shared donation prompt utility.
//
// Shown whenever a user is about to send real SOL — trivia escrow, jackpot fuel, etc.
// Completely optional. No pressure. The game runs either way.
//
// Destination wallets:
//   DEV_WALLET         — TiltCheck development fund (5SprDbgKNNqBu9WDAi7UFCX7ePZ83wA5MKLnbZL5FjZq)
//   RECOVERY_WALLET    — Community microgrant fund (CCXEVwUyfMLFwEzyusBLZ2VY1PyDe6qYhLHtgRqeBm51)

import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  InteractionCollector,
  ComponentType,
  Message,
} from 'discord.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const DEV_WALLET = '5SprDbgKNNqBu9WDAi7UFCX7ePZ83wA5MKLnbZL5FjZq';
export const RECOVERY_WALLET = 'CCXEVwUyfMLFwEzyusBLZ2VY1PyDe6qYhLHtgRqeBm51';

export const DONATION_AMOUNT_SOL = 0.05;
export const DONATION_AMOUNT_LABEL = '0.05 SOL';

export type DonationDest = 'dev' | 'recovery' | 'none';

export interface DonationChoice {
  dest: DonationDest;
  walletAddress: string | null;
  lamports: number;
}

// Button custom IDs
export const DONATE_DEV_ID = 'donate_dev';
export const DONATE_RECOVERY_ID = 'donate_recovery';
export const DONATE_SKIP_ID = 'donate_skip';

// -----------------------------------------------------------------------------
// Prompt embed + buttons
// -----------------------------------------------------------------------------

export function buildDonationEmbed(contextLabel: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('OPTIONAL TIP — YOUR CALL')
    .setDescription(
      `You are about to put real SOL on the line for **${contextLabel}**.\n\n` +
      `Before you fund — want to kick an extra **${DONATION_AMOUNT_LABEL}** somewhere useful?\n\n` +
      `**[Kick the devs a bone]** — Goes to the team that built this thing.\n` +
      `\`${DEV_WALLET}\`\n\n` +
      `**[Stack the recovery fund]** — Goes toward community microgrants for degens who hit rock bottom.\n` +
      `\`${RECOVERY_WALLET}\`\n\n` +
      `Either way, your ${DONATION_AMOUNT_LABEL} gets added to the total you send. One transaction, two good outcomes.`
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });
}

export function buildDonationRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(DONATE_DEV_ID)
      .setLabel('[+0.05 SOL — Kick the devs a bone]')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(DONATE_RECOVERY_ID)
      .setLabel('[+0.05 SOL — Stack the recovery fund]')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(DONATE_SKIP_ID)
      .setLabel('[Nah, I am already doing enough]')
      .setStyle(ButtonStyle.Danger),
  );
}

// -----------------------------------------------------------------------------
// Prompt function — shows prompt, waits up to 20s for response
// Returns DonationChoice (dest: 'none' on skip/timeout)
// -----------------------------------------------------------------------------

export async function askDonation(
  interaction: ChatInputCommandInteraction,
  contextLabel: string,
): Promise<DonationChoice> {
  const embed = buildDonationEmbed(contextLabel);
  const row = buildDonationRow();

  const reply = await interaction.editReply({ embeds: [embed], components: [row] }) as Message;

  try {
    const btn = await reply.awaitMessageComponent<ComponentType.Button>({
      filter: (b: ButtonInteraction) => b.user.id === interaction.user.id,
      time: 20_000,
    });

    await btn.deferUpdate();

    if (btn.customId === DONATE_DEV_ID) {
      return {
        dest: 'dev',
        walletAddress: DEV_WALLET,
        lamports: Math.floor(DONATION_AMOUNT_SOL * 1_000_000_000),
      };
    }

    if (btn.customId === DONATE_RECOVERY_ID) {
      return {
        dest: 'recovery',
        walletAddress: RECOVERY_WALLET,
        lamports: Math.floor(DONATION_AMOUNT_SOL * 1_000_000_000),
      };
    }
  } catch {
    // Timeout — treat as skip, no noise
  }

  return { dest: 'none', walletAddress: null, lamports: 0 };
}

// -----------------------------------------------------------------------------
// Confirmation embed — shown after donation choice, before funding instructions
// -----------------------------------------------------------------------------

export function buildDonationConfirmedEmbed(choice: DonationChoice, prizeSol: number): EmbedBuilder {
  const totalSol = (prizeSol + DONATION_AMOUNT_SOL).toFixed(4);

  if (choice.dest === 'none') {
    return new EmbedBuilder()
      .setColor(0x6b7280)
      .setTitle('NO TIP — FAIR ENOUGH')
      .setDescription(
        `Got it. Fund the escrow with exactly **${prizeSol.toFixed(4)} SOL** and the game kicks off.\n\n` +
        `You can always fund the wallets directly if the mood strikes later:\n` +
        `Dev: \`${DEV_WALLET}\`\n` +
        `Recovery grants: \`${RECOVERY_WALLET}\``
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });
  }

  const destLabel = choice.dest === 'dev'
    ? 'the dev fund'
    : 'the community recovery fund';

  return new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('TIP LOCKED IN — SOLID')
    .setDescription(
      `Nice. **${DONATION_AMOUNT_LABEL}** going to ${destLabel}.\n\n` +
      `Fund the escrow with **${totalSol} SOL** total ` +
      `(${prizeSol.toFixed(4)} prize pool + ${DONATION_AMOUNT_LABEL} tip) and the game starts.\n\n` +
      `Donation routes automatically when the game completes.`
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });
}
