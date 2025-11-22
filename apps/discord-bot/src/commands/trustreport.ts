/**
 * Trust Report Command
 * Fetches and displays comprehensive trust grading for a casino
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import fs from 'fs/promises';
import path from 'path';

interface CasinoSnapshot {
  casinoId: string;
  casinoName?: string;
  collectedAt: string;
  compositeScore?: number;
  riskLevel?: string;
  source?: string;
  grading?: {
    compositeScore: number;
    categories: {
      rngIntegrity: { score: number; rationale: string[] };
      rtpTransparency: { score: number; rationale: string[] };
      volatilityConsistency: { score: number; rationale: string[] };
      sessionBehavior: { score: number; rationale: string[] };
      transparencyEthics: { score: number; rationale: string[] };
    };
  };
  categories?: {
    rng_fairness?: { score: number; confidence: number; rationale: string[] };
    rtp_transparency?: { score: number; confidence: number; rationale: string[] };
    volatility_consistency?: { score: number; confidence: number; rationale: string[] };
    session_integrity?: { score: number; confidence: number; rationale: string[] };
    operational_transparency?: { score: number; confidence: number; rationale: string[] };
  };
  sources?: {
    disclosures?: any;
    sentiment?: { overallScore: number; sampleSize: number; topComplaints: string[] };
  };
  metadata?: any;
  notes?: string[];
}

interface CasinoRegistry {
  casinos: Array<{
    id: string;
    name: string;
    enabled?: boolean;
  }>;
}

async function loadCasinoRegistry(): Promise<CasinoRegistry> {
  const registryPath = path.resolve('../../data/casinos.json');
  const content = await fs.readFile(registryPath, 'utf-8');
  return JSON.parse(content);
}

async function loadLatestSnapshot(casinoId: string): Promise<CasinoSnapshot | null> {
  const snapshotDir = path.resolve(`../../data/casino-snapshots/${casinoId}`);
  try {
    const files = await fs.readdir(snapshotDir);
    if (files.length === 0) return null;
    const latest = files.sort().reverse()[0];
    const content = await fs.readFile(path.join(snapshotDir, latest), 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function getRiskColor(score: number): number {
  if (score >= 90) return 0x00AA00; // green
  if (score >= 75) return 0xFFD700; // gold
  if (score >= 60) return 0xFFA500; // orange
  if (score >= 40) return 0xFF4500; // red-orange
  return 0xFF0000; // red
}

function getRiskBadge(score: number): string {
  if (score >= 90) return '🟢 Low Risk';
  if (score >= 75) return '🟡 Watch';
  if (score >= 60) return '🟠 Elevated';
  if (score >= 40) return '🔴 High Risk';
  return '⛔ Critical';
}

export const trustreport: Command = {
  data: new SlashCommandBuilder()
    .setName('trust-report')
    .setDescription('Get comprehensive trust grading for a casino')
    .addStringOption(o =>
      o
        .setName('casino')
        .setDescription('Casino ID or name (auto-complete enabled)')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const registry = await loadCasinoRegistry();
      const focusedValue = interaction.options.getFocused().toLowerCase();
      
      const filtered = registry.casinos
        .filter(c => c.enabled !== false)
        .filter(c => 
          c.name.toLowerCase().includes(focusedValue) || 
          c.id.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25); // Discord limit
      
      await interaction.respond(
        filtered.map(c => ({ name: c.name, value: c.id }))
      );
    } catch (err) {
      console.error('[trust-report autocomplete]:', err);
      await interaction.respond([]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const casinoId = interaction.options.getString('casino', true);

    await interaction.deferReply();

    try {
      const snapshot = await loadLatestSnapshot(casinoId);

      if (!snapshot) {
        await interaction.editReply({
          content: `❌ No trust data found for \`${casinoId}\`. The AI collector may not have run yet.`,
        });
        return;
      }

      // Handle both old grading format and new snapshot format
      const compositeScore = snapshot.compositeScore || snapshot.grading?.compositeScore || 0;
      const categories = snapshot.categories || snapshot.grading?.categories;
      
      if (!categories) {
        await interaction.editReply({
          content: `❌ No category data found for \`${casinoId}\`.`,
        });
        return;
      }

      const { sources, collectedAt } = snapshot;

      const embed = new EmbedBuilder()
        .setColor(getRiskColor(compositeScore))
        .setTitle(`🔍 Trust Report: ${snapshot.casinoName || casinoId}`)
        .setDescription(
          `**Overall Trust Grade:** ${compositeScore}/100 ${getRiskBadge(compositeScore)}\n` +
            `_Data collected: <t:${Math.floor(new Date(collectedAt).getTime() / 1000)}:R>_` +
            (snapshot.source ? `\n_Source: ${snapshot.source}_` : '')
        );

      // Handle both naming conventions
      const rngCategory = categories.rng_fairness || categories.rngIntegrity;
      const rtpCategory = categories.rtp_transparency || categories.rtpTransparency;
      const volatilityCategory = categories.volatility_consistency || categories.volatilityConsistency;
      const sessionCategory = categories.session_integrity || categories.sessionBehavior;
      const transparencyCategory = categories.operational_transparency || categories.transparencyEthics;

      if (rngCategory) {
        embed.addFields({
          name: '🎲 RNG Fairness',
          value: `**${rngCategory.score}/100**\n${rngCategory.rationale.slice(0, 2).map(r => `• ${r}`).join('\n')}`,
          inline: true,
        });
      }
      
      if (rtpCategory) {
        embed.addFields({
          name: '📊 RTP Transparency',
          value: `**${rtpCategory.score}/100**\n${rtpCategory.rationale.slice(0, 2).map(r => `• ${r}`).join('\n')}`,
          inline: true,
        });
      }
      
      if (volatilityCategory) {
        embed.addFields({
          name: '📈 Volatility Consistency',
          value: `**${volatilityCategory.score}/100**\n${volatilityCategory.rationale.slice(0, 2).map(r => `• ${r}`).join('\n')}`,
          inline: true,
        });
      }
      
      if (sessionCategory) {
        embed.addFields({
          name: '⏱️ Session Integrity',
          value: `**${sessionCategory.score}/100**\n${sessionCategory.rationale.slice(0, 2).map(r => `• ${r}`).join('\n')}`,
          inline: true,
        });
      }
      
      if (transparencyCategory) {
        embed.addFields({
          name: '🔐 Operational Transparency',
          value: `**${transparencyCategory.score}/100**\n${transparencyCategory.rationale.slice(0, 2).map(r => `• ${r}`).join('\n')}`,
          inline: true,
        });
      }

      if (sources?.sentiment && sources.sentiment.sampleSize > 0) {
        const sentimentEmoji = sources.sentiment.overallScore > 0.3 ? '😊' : sources.sentiment.overallScore < -0.3 ? '😡' : '😐';
        embed.addFields({
          name: `${sentimentEmoji} Player Sentiment`,
          value: `Score: ${sources.sentiment.overallScore.toFixed(2)} (${sources.sentiment.sampleSize} reviews)\nTop complaints: ${sources.sentiment.topComplaints.slice(0, 2).join(', ')}`,
          inline: false,
        });
      }
      
      // Show notes if available (e.g., CSV source indication)
      if (snapshot.notes && snapshot.notes.length > 0) {
        embed.addFields({
          name: '📝 Notes',
          value: snapshot.notes.slice(0, 2).map(n => `• ${n}`).join('\n'),
          inline: false,
        });
      }

      embed.setFooter({
        text: 'TiltCheck grading engine • Advisory only, not definitive • Data sources: AI analysis + scraper metadata',
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[trust-report] Error:', err);
      await interaction.editReply({
        content: `❌ Failed to load trust report: ${(err as Error).message}`,
      });
    }
  },
};
