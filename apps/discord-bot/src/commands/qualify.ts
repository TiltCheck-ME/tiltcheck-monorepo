/**
 * QualifyFirst Commands
 * 
 * Survey matching and profile management for TiltCheck bot
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { qualifyFirst } from '@tiltcheck/qualifyfirst';
import { successEmbed, errorEmbed, infoEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const qualify: Command = {
  data: new SlashCommandBuilder()
    .setName('qualify')
    .setDescription('Get matched surveys based on your profile'),
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    try {
      let profile = qualifyFirst.getProfile(userId);
      if (!profile) {
        await qualifyFirst.createProfile(userId);
      }

      const matches = await qualifyFirst.matchSurveys(userId);

      if (matches.length === 0) {
        await interaction.reply({
          embeds: [infoEmbed('No matches', 'No surveys currently match your profile. Try updating your profile with `/surveyprofile update`')],
          ephemeral: true
        });
        return;
      }

      const topMatches = matches.slice(0, 5);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎯 Survey Matches')
        .setDescription(`Found ${matches.length} matching surveys. Here are your top matches:`);

      for (const match of topMatches) {
        const confidenceEmoji = match.matchLevel === 'high' ? '🟢' : match.matchLevel === 'medium' ? '🟡' : '🔴';
        embed.addFields({
          name: `${confidenceEmoji} ${match.survey.title} (${match.matchProbability.toFixed(0)}% match)`,
          value: `💰 Payout: $${match.survey.payoutUSD.toFixed(2)} | ⏱️ ${match.survey.estimatedMinutes}min\n${match.reasoning.slice(0, 2).join('\n')}`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Match failed', error.message)],
        ephemeral: true
      });
    }
  },
};

export const surveyprofile: Command = {
  data: new SlashCommandBuilder()
    .setName('surveyprofile')
    .setDescription('Manage your survey profile')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current profile')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update profile traits')
        .addStringOption(option =>
          option.setName('trait').setDescription('Trait name (e.g., hasPets, ownsCar, ageRange)').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('value').setDescription('Trait value (e.g., true, false, 25-34)').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your survey completion statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('improve')
        .setDescription('Get recommended questions to improve matching')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'view') {
        const profile = qualifyFirst.getProfile(userId);
        
        if (!profile) {
          await interaction.reply({
            embeds: [infoEmbed('No profile', 'You don\'t have a profile yet. Use `/qualify` to create one.')],
            ephemeral: true
          });
          return;
        }

        const traits = Array.from(profile.traits.entries())
          .map(([key, value]) => `• **${key}**: ${value}`)
          .join('\n') || 'No traits set';

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📋 Your Survey Profile')
          .addFields(
            { name: 'Traits', value: traits, inline: false },
            { name: 'Completed Surveys', value: profile.completedSurveys.length.toString(), inline: true },
            { name: 'Screen-outs', value: profile.failedScreeners.length.toString(), inline: true }
          )
          .setFooter({ text: `Created ${new Date(profile.createdAt).toLocaleDateString()}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });

      } else if (subcommand === 'update') {
        const trait = interaction.options.getString('trait', true);
        const valueStr = interaction.options.getString('value', true);
        
        let value: string | number | boolean = valueStr;
        if (valueStr.toLowerCase() === 'true') value = true;
        else if (valueStr.toLowerCase() === 'false') value = false;
        else if (!isNaN(Number(valueStr))) value = Number(valueStr);

        await qualifyFirst.updateUserTraits(userId, { [trait]: value });

        await interaction.reply({
          embeds: [successEmbed('Profile updated', `${trait} set to ${value}`)],
          ephemeral: true
        });

      } else if (subcommand === 'stats') {
        const stats = qualifyFirst.getUserStats(userId);

        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('📊 Survey Statistics')
          .addFields(
            { name: 'Completed', value: stats.totalCompleted.toString(), inline: true },
            { name: 'Screened Out', value: stats.totalScreenedOut.toString(), inline: true },
            { name: 'Abandoned', value: stats.totalAbandoned.toString(), inline: true },
            { name: 'Total Earnings', value: `$${stats.totalEarnings.toFixed(2)}`, inline: true },
            { name: 'Completion Rate', value: `${stats.completionRate.toFixed(1)}%`, inline: true }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });

      } else if (subcommand === 'improve') {
        const questions = qualifyFirst.getRecommendedQuestions(userId);

        if (questions.length === 0) {
          await interaction.reply({
            embeds: [successEmbed('Profile complete', 'Your profile has all recommended traits!')],
            ephemeral: true
          });
          return;
        }

        const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x00ffff)
          .setTitle('💡 Recommended Questions')
          .setDescription('Answer these to improve your survey matching:\n\n' + questionList)
          .setFooter({ text: 'Use /surveyprofile update to add these traits' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Command failed', error.message)],
        ephemeral: true
      });
    }
  },
};
