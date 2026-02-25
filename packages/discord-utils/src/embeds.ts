/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Discord Embed Builders
 * 
 * Consistent embed formatting for TiltCheck bot messages.
 */

import { EmbedBuilder, ColorResolvable } from 'discord.js';

// TiltCheck brand colors
export const Colors = {
  PRIMARY: 0x5865f2, // Discord blurple
  SUCCESS: 0x57f287, // Green
  WARNING: 0xfee75c, // Yellow
  DANGER: 0xed4245, // Red
  INFO: 0x5865f2, // Blue
  SAFE: 0x57f287, // Green
  SUSPICIOUS: 0xfee75c, // Yellow
  HIGH_RISK: 0xff9500, // Orange
  CRITICAL: 0xed4245, // Red
} as const;

/**
 * Create a basic embed with TiltCheck branding
 */
export function createEmbed(
  title?: string,
  description?: string,
  color: number = Colors.PRIMARY
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(color as ColorResolvable)
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  return embed;
}

/**
 * Create a success embed
 */
export function successEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed(title, description, Colors.SUCCESS).setFooter({
    text: '✅ Success',
  });
}

/**
 * Create an error embed
 */
export function errorEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed(title, description, Colors.DANGER).setFooter({
    text: '❌ Error',
  });
}

/**
 * Create a warning embed
 */
export function warningEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed(title, description, Colors.WARNING).setFooter({
    text: '⚠️ Warning',
  });
}

/**
 * Create an info embed
 */
export function infoEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed(title, description, Colors.INFO).setFooter({
    text: 'ℹ️ Info',
  });
}

/**
 * Create a link scan result embed
 */
export function linkScanEmbed(data: {
  url: string;
  riskLevel: 'safe' | 'suspicious' | 'high' | 'critical';
  reason: string;
  scannedAt: Date;
}): EmbedBuilder {
  const colorMap = {
    safe: Colors.SAFE,
    suspicious: Colors.SUSPICIOUS,
    high: Colors.HIGH_RISK,
    critical: Colors.CRITICAL,
  };

  const emojiMap = {
    safe: '✅',
    suspicious: '⚠️',
    high: '🚨',
    critical: '🔴',
  };

  const embed = createEmbed(
    `${emojiMap[data.riskLevel]} Link Scan Result`,
    undefined,
    colorMap[data.riskLevel]
  );

  embed.addFields(
    { name: 'URL', value: `\`${data.url}\``, inline: false },
    {
      name: 'Risk Level',
      value: data.riskLevel.toUpperCase(),
      inline: true,
    },
    { name: 'Reason', value: data.reason, inline: false },
    {
      name: 'Scanned At',
      value: `<t:${Math.floor(data.scannedAt.getTime() / 1000)}:R>`,
      inline: true,
    }
  );

  return embed;
}

/**
 * Create a trust score embed
 */
export function trustScoreEmbed(data: {
  entityName: string;
  score: number;
  type: 'casino' | 'user';
}): EmbedBuilder {
  const color =
    data.score >= 80
      ? Colors.SUCCESS
      : data.score >= 60
      ? Colors.WARNING
      : Colors.DANGER;

  const emoji = data.score >= 80 ? '✅' : data.score >= 60 ? '⚠️' : '🚨';

  const embed = createEmbed(
    `${emoji} ${data.type === 'casino' ? 'Casino' : 'Degen'} Trust Score`,
    undefined,
    color
  );

  embed.addFields(
    {
      name: data.type === 'casino' ? 'Casino' : 'User',
      value: data.entityName,
      inline: true,
    },
    {
      name: 'Trust Score',
      value: `${data.score}/100`,
      inline: true,
    }
  );

  // Add score bar
  const filled = Math.floor(data.score / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  embed.addFields({ name: 'Score', value: `\`${bar}\``, inline: false });

  return embed;
}

/**
 * Create a tip confirmation embed
 */
export function tipEmbed(data: {
  from: string;
  to: string;
  amount: number;
  token: string;
  txHash?: string;
}): EmbedBuilder {
  const embed = createEmbed('💰 Tip Sent!', undefined, Colors.SUCCESS);

  embed.addFields(
    { name: 'From', value: data.from, inline: true },
    { name: 'To', value: data.to, inline: true },
    { name: 'Amount', value: `${data.amount} ${data.token}`, inline: false }
  );

  if (data.txHash) {
    embed.addFields({
      name: 'Transaction',
      value: `\`${data.txHash.slice(0, 16)}...${data.txHash.slice(-16)}\``,
      inline: false,
    });
  }

  return embed;
}

/**
 * Create a bonus tracking embed
 */
export function bonusEmbed(data: {
  casino: string;
  amount: number;
  wagerProgress: number;
  wagerRequired: number;
  expiresAt: Date;
}): EmbedBuilder {
  const progress = (data.wagerProgress / data.wagerRequired) * 100;
  const color =
    progress >= 90
      ? Colors.SUCCESS
      : progress >= 50
      ? Colors.WARNING
      : Colors.INFO;

  const embed = createEmbed('🎰 Bonus Tracker', undefined, color);

  embed.addFields(
    { name: 'Casino', value: data.casino, inline: true },
    { name: 'Bonus Amount', value: `$${data.amount}`, inline: true },
    {
      name: 'Wager Progress',
      value: `$${data.wagerProgress} / $${data.wagerRequired}`,
      inline: false,
    },
    {
      name: 'Expires',
      value: `<t:${Math.floor(data.expiresAt.getTime() / 1000)}:R>`,
      inline: true,
    }
  );

  // Progress bar
  const filled = Math.floor(progress / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  embed.addFields({
    name: 'Progress',
    value: `\`${bar}\` ${progress.toFixed(1)}%`,
    inline: false,
  });

  return embed;
}
