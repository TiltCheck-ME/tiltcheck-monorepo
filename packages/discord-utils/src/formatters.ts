/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Text formatting utilities for Discord messages
 */

/**
 * Format a URL for display (truncate if too long)
 */
export function formatUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + '...';
}

/**
 * Format a Discord timestamp
 */
export function formatTimestamp(
  date: Date,
  style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'F'
): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `<t:${timestamp}:${style}>`;
}

/**
 * Format a currency amount
 */
export function formatCurrency(amount: number, token = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: token,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Create a progress bar
 */
export function createProgressBar(
  current: number,
  total: number,
  length = 10,
  filledChar = '█',
  emptyChar = '░'
): string {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const filled = Math.floor((percentage / 100) * length);
  const empty = length - filled;
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a list with bullet points
 */
export function bulletList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

/**
 * Format a numbered list
 */
export function numberedList(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

/**
 * Format a user mention
 */
export function mentionUser(userId: string): string {
  return `<@${userId}>`;
}

/**
 * Format a channel mention
 */
export function mentionChannel(channelId: string): string {
  return `<#${channelId}>`;
}

/**
 * Format a role mention
 */
export function mentionRole(roleId: string): string {
  return `<@&${roleId}>`;
}

/**
 * Create a code block
 */
export function codeBlock(code: string, language = ''): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Create inline code
 */
export function inlineCode(text: string): string {
  return `\`${text}\``;
}

/**
 * Bold text
 */
export function bold(text: string): string {
  return `**${text}**`;
}

/**
 * Italic text
 */
export function italic(text: string): string {
  return `*${text}*`;
}

/**
 * Underline text
 */
export function underline(text: string): string {
  return `__${text}__`;
}

/**
 * Strikethrough text
 */
export function strikethrough(text: string): string {
  return `~~${text}~~`;
}

/**
 * Quote text
 */
export function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/**
 * Spoiler text
 */
export function spoiler(text: string): string {
  return `||${text}||`;
}
