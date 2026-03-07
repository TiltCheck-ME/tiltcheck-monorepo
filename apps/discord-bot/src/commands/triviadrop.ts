/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import {
  startTriviaAsync,
  checkAnswer,
  getLeaderboard,
  getUserStats,
} from '@tiltcheck/triviadrops';

export const triviadrop: Command = {
  data: new SlashCommandBuilder()
    .setName('triviadrop')
    .setDescription('Play on-demand trivia drops')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a new trivia drop')
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Question category (optional)')
            .addChoices(
              { name: 'Crypto', value: 'crypto' },
              { name: 'Poker', value: 'poker' },
              { name: 'Sports', value: 'sports' },
              { name: 'Science', value: 'science' },
              { name: 'History', value: 'history' },
              { name: 'General', value: 'general' }
            )
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('difficulty')
            .setDescription('Question difficulty (optional)')
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('answer')
        .setDescription('Submit your answer')
        .addStringOption(opt =>
          opt.setName('response').setDescription('Your answer').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('View trivia leaderboard')
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Number of top players to show (default: 10)')
            .setMinValue(5)
            .setMaxValue(25)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('View your trivia stats')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId || 'dm';
    const channelId = interaction.channelId;

    if (subcommand === 'start') {
      const category = interaction.options.getString('category') || undefined;
      const difficulty = interaction.options.getString('difficulty') || undefined;

      try {
        // Use AI generation if OPENAI_API_KEY is set
        const useAI = !!process.env.OPENAI_API_KEY;
        const question = await startTriviaAsync(guildId, channelId, category, difficulty, useAI);
        
        const embed = new EmbedBuilder()
          .setColor(0x00AE86)
          .setTitle('🎯 TriviaDrops')
          .setDescription(question.question)
          .addFields(
            { name: 'Category', value: question.category || 'General', inline: true },
            { name: 'Difficulty', value: question.difficulty || 'medium', inline: true },
            { name: 'Points', value: question.difficulty === 'hard' ? '30' : question.difficulty === 'medium' ? '20' : '10', inline: true }
          )
          .setFooter({ text: useAI ? 'AI-Generated Question • Use /triviadrop answer to submit' : 'Use /triviadrop answer to submit your response' })
          .setTimestamp();

        if (question.choices && question.choices.length > 0) {
          embed.addFields({
            name: 'Choices',
            value: question.choices.map((c: string, i: number) => `${String.fromCharCode(65 + i)}. ${c}`).join('\n'),
          });
        }

        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error('[TriviaDrops] Error starting trivia:', err);
        await interaction.reply({ content: 'Failed to start trivia. Try again later.', ephemeral: true });
      }
    } else if (subcommand === 'answer') {
      const response = interaction.options.getString('response', true);
      const userId = interaction.user.id;
      const username = interaction.user.username;

      try {
        const result = checkAnswer(guildId, channelId, userId, username, response);

        if (result.correctAnswer === '') {
          await interaction.reply({ content: '❌ No active trivia in this channel. Use `/triviadrop start` first!', ephemeral: true });
          return;
        }

        if (result.correct) {
          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Correct!')
            .setDescription(`You earned **${result.points} points**!`)
            .setFooter({ text: `Check your stats with /triviadrop stats` })
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Incorrect')
            .setDescription(`The correct answer was: **${result.correctAnswer}**`)
            .setFooter({ text: 'Better luck next time!' })
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (err) {
        console.error('[TriviaDrops] Error checking answer:', err);
        await interaction.reply({ content: 'Failed to check answer. Try again.', ephemeral: true });
      }
    } else if (subcommand === 'leaderboard') {
      const limit = interaction.options.getInteger('limit') || 10;

      try {
        const leaderboard = getLeaderboard(limit);

        if (leaderboard.length === 0) {
          await interaction.reply({ content: '📊 No trivia stats yet. Be the first to play!', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle('🏆 Trivia Leaderboard')
          .setDescription(
            leaderboard
              .map((entry: { username: string; score: number; totalAttempts: number; correctAnswers: number }, i: number) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                const accuracy = entry.totalAttempts > 0 
                  ? Math.round((entry.correctAnswers / entry.totalAttempts) * 100) 
                  : 0;
                return `${medal} **${entry.username}** - ${entry.score} pts (${accuracy}% accuracy)`;
              })
              .join('\n')
          )
          .setFooter({ text: 'Play /triviadrop start to climb the ranks!' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error('[TriviaDrops] Error fetching leaderboard:', err);
        await interaction.reply({ content: 'Failed to load leaderboard.', ephemeral: true });
      }
    } else if (subcommand === 'stats') {
      const userId = interaction.user.id;

      try {
        const stats = getUserStats(userId);

        if (!stats) {
          await interaction.reply({ content: '📊 No stats yet. Play `/triviadrop start` to get started!', ephemeral: true });
          return;
        }

        const accuracy = stats.totalAttempts > 0 
          ? Math.round((stats.correctAnswers / stats.totalAttempts) * 100) 
          : 0;

        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('📊 Your Trivia Stats')
          .addFields(
            { name: 'Total Score', value: `${stats.score} points`, inline: true },
            { name: 'Correct Answers', value: `${stats.correctAnswers}`, inline: true },
            { name: 'Accuracy', value: `${accuracy}%`, inline: true },
            { name: 'Total Attempts', value: `${stats.totalAttempts}`, inline: true },
            { name: 'Current Streak', value: `${stats.currentStreak} 🔥`, inline: true },
            { name: 'Longest Streak', value: `${stats.longestStreak} ⭐`, inline: true }
          )
          .setFooter({ text: 'Keep playing to improve your score!' })
          .setTimestamp();

        if (stats.achievements && stats.achievements.length > 0) {
          const achievementNames: Record<string, string> = {
            first_correct: '🎯 First Blood',
            streak_3: '🔥 On Fire',
            streak_5: '⚡ Unstoppable',
            streak_10: '👑 Legendary',
            score_100: '💯 Century',
            score_500: '⭐ All-Star',
            score_1000: '🏆 Champion',
            accuracy_80: '🎓 Scholar',
            played_50: '🎮 Dedicated',
            played_100: '💪 Grinder',
          };
          const achievementList = stats.achievements
            .map((id: string) => achievementNames[id] || id)
            .join(', ');
          embed.addFields({ name: 'Achievements', value: achievementList });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        console.error('[TriviaDrops] Error fetching stats:', err);
        await interaction.reply({ content: 'Failed to load stats.', ephemeral: true });
      }
    } else {
      await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
