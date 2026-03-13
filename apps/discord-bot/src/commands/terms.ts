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
    .setDescription('The boring legal sh** you have to accept.')
    .addSubcommand(s => s.setName('view').setDescription('Read the fine print that you\'re probably going to ignore.'))
    .addSubcommand(s => s.setName('accept').setDescription('Promise you won\'t sue us when you lose all your money.'))
    .addSubcommand(s => s.setName('status').setDescription('See if you\'re already on the hook.')),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('The Fine Print. Don\'t Say We Didn\'t Warn You.')
        .setDescription('Yeah, you have to read this before you can use the fun stuff.')
        .addFields(
          { name: 'Terms of Service', value: '[Read Terms](https://tiltcheck.me/terms)\n• You must be 18+. No kids allowed.\n• Tips are final. Don\'t come crying to us.\n• This is all provided AS-IS. If it breaks, it breaks.' },
          { name: 'Privacy Policy', value: '[Read Privacy](https://tiltcheck.me/privacy)\n• We use non-custodial wallets. Your keys, your crypto.\n• We log the bare minimum and delete it after 7 days.\n• We don\'t sell your data. We have better ways to make money.' },
          { name: 'Your Next Step', value: 'Use `/terms accept` once you\'ve pretended to read everything.' },
        )
        .setColor(0x00a8ff)
        .setFooter({ text: 'TiltCheck • Now you can\'t say you didn\'t know.' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    if (sub === 'accept') {
      if (hasAcceptedTerms(interaction.user.id)) {
        await interaction.reply({ content: 'You\'re already on the hook. We got your signature.', ephemeral: true });
        return;
      }
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('terms_accept_confirm').setLabel('I Accept, Now Give Me My NFT').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('terms_accept_cancel').setLabel('I\'m Scared').setStyle(ButtonStyle.Secondary)
      );
      const embed = new EmbedBuilder()
        .setTitle('Cover Our Asses, Click "I Accept"')
        .setDescription('By clicking the button, you agree you\'re a legal adult who read the terms and won\'t sue us. Simple.')
        .setColor(0xffc107);
      const msg = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });
      try {
        const btn = await msg.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60000 });
        if (btn.customId === 'terms_accept_confirm') {
          saveAcceptance({ userId: interaction.user.id, username: interaction.user.username, acceptedAt: new Date().toISOString(), version: VERSION });
          
          if (db.isConnected()) {
            await db.upsertDegenIdentity({ 
              discord_id: interaction.user.id, 
              tos_accepted: true 
            });
            await db.mintTosNft(interaction.user.id);
          }

          await btn.update({ content: 'Alright, you\'re in. Your "Degen Identity" NFT is being minted. You can now use the fun sh** like tipping and vaults.', embeds: [], components: [] });
        } else {
          await btn.update({ content: 'Fine, be that way. No tipping or vaults for you.', embeds: [], components: [] });
        }
      } catch {
        await interaction.editReply({ content: 'You took too long and the button expired. Try again when you\'re feeling decisive.', embeds: [], components: [] });
      }
      return;
    }
    if (sub === 'status') {
      const rec = loadAcceptances().find(a => a.userId === interaction.user.id);
      if (!rec) {
        await interaction.reply({ content: 'You haven\'t accepted the terms. Use `/terms view` and then `/terms accept` before you can play with the sharp toys.', ephemeral: true });
        return;
      }
      await interaction.reply({ content: `Yeah, you accepted on ${new Date(rec.acceptedAt).toLocaleString()} (v${rec.version}). We got you.`, ephemeral: true });
    }
  }
};
