/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Terms Command
 * Displays TiltCheck Terms of Service & Privacy links and tracks acceptance.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '../types.js';
import { db } from '@tiltcheck/database';
import fs from 'fs';
import path from 'path';

const TERMS_STORE = path.join(process.cwd(), 'data', 'terms-acceptance.json');
const VERSION = '1.0';

interface TermsAcceptance { userId: string; username: string; acceptedAt: string; version: string; }
function ensureStoreDir() { const dir = path.dirname(TERMS_STORE); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function loadAcceptances(): TermsAcceptance[] { ensureStoreDir(); if (!fs.existsSync(TERMS_STORE)) return []; try { return JSON.parse(fs.readFileSync(TERMS_STORE, 'utf8')); } catch { return []; } }
function saveAcceptance(a: TermsAcceptance) { const all = loadAcceptances().filter(x => x.userId !== a.userId); all.push(a); fs.writeFileSync(TERMS_STORE, JSON.stringify(all, null, 2)); }
export function hasAcceptedTerms(uid: string): boolean { return loadAcceptances().some(a => a.userId === uid); }

export const terms: Command = {
  data: new SlashCommandBuilder()
    .setName('terms')
    .setDescription('Legal documents & acceptance')
    .addSubcommand(s => s.setName('view').setDescription('View Terms & Privacy links'))
    .addSubcommand(s => s.setName('accept').setDescription('Accept Terms of Service'))
    .addSubcommand(s => s.setName('status').setDescription('Check your acceptance status')),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('📜 TiltCheck Legal')
        .setDescription('Read before using tipping features.')
        .addFields(
          { name: 'Terms of Service', value: '[Read Terms](https://tiltcheck.me/terms)\n• 18+ required\n• Non-refundable tips (0.07 SOL fee)\n• AS-IS service' },
          { name: 'Privacy Policy', value: '[Read Privacy](https://tiltcheck.me/privacy)\n• Non-custodial wallets\n• Minimal logs (7 days)\n• No data selling' },
          { name: 'Acceptance', value: 'Use `/terms accept` after reading.' },
          { name: 'Contact', value: 'privacy@tiltcheck.me | legal@tiltcheck.me' }
        )
        .setColor(0x00a8ff)
        .setFooter({ text: 'TiltCheck • Trust, Tipping & Anti-Tilt' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    if (sub === 'accept') {
      if (hasAcceptedTerms(interaction.user.id)) {
        await interaction.reply({ content: '✅ Already accepted. Use `/terms status`.', ephemeral: true });
        return;
      }
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('terms_accept_confirm').setLabel('I Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('terms_accept_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Confirm Acceptance')
        .setDescription('By clicking I Accept you confirm:\n• You are 18+\n• You read Terms & Privacy\n• Tips are non-refundable\n• You use TiltCheck at your own risk')
        .setColor(0xffc107);
      const msg = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });
      try {
        const btn = await msg.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60000 });
        if (btn.customId === 'terms_accept_confirm') {
          saveAcceptance({ userId: interaction.user.id, username: interaction.user.username, acceptedAt: new Date().toISOString(), version: VERSION });
          
          // Link to Degen Identity in Supabase
          if (db.isConnected()) {
            await db.upsertDegenIdentity({ 
              discord_id: interaction.user.id, 
              tos_accepted: true 
            });
            await db.mintTosNft(interaction.user.id);
          }

          await btn.update({ content: '✅ Terms accepted. Your **Degen Identity** NFT has been minted to your TiltCheck profile! You may now use tipping and vaulting features.', embeds: [], components: [] });
        } else {
          await btn.update({ content: '❌ Acceptance cancelled. Run `/terms accept` later.', embeds: [], components: [] });
        }
      } catch {
        await interaction.editReply({ content: '⏱️ Timed out. Run `/terms accept` again.', embeds: [], components: [] });
      }
      return;
    }
    if (sub === 'status') {
      const rec = loadAcceptances().find(a => a.userId === interaction.user.id);
      if (!rec) {
        await interaction.reply({ content: '⚠️ Not accepted yet. Use `/terms view` then `/terms accept`.', ephemeral: true });
        return;
      }
      await interaction.reply({ content: `✅ Accepted ${new Date(rec.acceptedAt).toLocaleString()} (v${rec.version})`, ephemeral: true });
    }
  }
};
