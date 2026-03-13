/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    .setDescription('Pop quiz, hotshot. Answer trivia, win points, prove you\'re not an idiot.')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a new trivia drop. Let\'s see what you know.')
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('What flavor of trivia do you want? (optional)')
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
            .setDescription('How big is your brain? (optional)')
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
        .setDescription('Submit your answer. No pressure.')
        .addStringOption(opt =>
          opt.setName('response').setDescription('Your guess. Don\'t f*** it up.').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('See who\'s the biggest brain in the server.')
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('How many top nerds to show? (default: 10)')
            .setMinValue(5)
            .setMaxValue(25)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('Check your own stats. See how much you don\'t know.')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId || 'dm';
    const channelId = interaction.channelId;

    if (subcommand === 'start') {
      const category = interaction.options.getString('category') || undefined;
      const difficulty = interaction.options.getString('difficulty') || undefined;

      try {
        const useAI =
          process.env.AI_PROVIDER === 'ollama' ||
          !!process.env.OLLAMA_URL ||
          !!process.env.OPENAI_API_KEY ||
          !!process.env.AI_GATEWAY_URL;
        const question = await startTriviaAsync(guildId, channelId, category, difficulty, useAI);
        
        const embed = new EmbedBuilder()
          .setColor(0x00AE86)
          .setTitle('Pop Quiz, Hotshot!')
          .setDescription(question.question)
          .addFields(
            { name: 'Category', value: question.category || 'General', inline: true },
            { name: 'Difficulty', value: question.difficulty || 'medium', inline: true },
            { name: 'Points', value: question.difficulty === 'hard' ? '30' : question.difficulty === 'medium' ? '20' : '10', inline: true }
          )
          .setFooter({ text: useAI ? 'This question was forged in the fires of AI. Blame the robots if it\'s wrong.' : 'Use /triviadrop answer to submit your response.' })
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
        await interaction.reply({ content: 'Couldn\'t start the trivia. Something is f***ed. Try again later.', ephemeral: true });
      }
    } else if (subcommand === 'answer') {
      const response = interaction.options.getString('response', true);
      const userId = interaction.user.id;
      const username = interaction.user.username;

      try {
        const result = checkAnswer(guildId, channelId, userId, username, response);

        if (result.correctAnswer === '') {
          await interaction.reply({ content: 'There\'s no active trivia in this channel. Use `/triviadrop start` before you start guessing randomly.', ephemeral: true });
          return;
        }

        if (result.correct) {
          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Correct! Look at the big brain on you.')
            .setDescription(`You snagged **${result.points} points**!`)
            .setFooter({ text: `Admire your genius with /triviadrop stats` })
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Wrong. So, so wrong.')
            .setDescription(`The correct answer was: **${result.correctAnswer}**`)
            .setFooter({ text: 'Maybe try an easier one next time?' })
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (err) {
        console.error('[TriviaDrops] Error checking answer:', err);
        await interaction.reply({ content: 'Failed to check your answer. The bot probably had a stroke.', ephemeral: true });
      }
    } else if (subcommand === 'leaderboard') {
      const limit = interaction.options.getInteger('limit') || 10;

      try {
        const leaderboard = getLeaderboard(limit);

        if (leaderboard.length === 0) {
          await interaction.reply({ content: 'The leaderboard is empty. Is anyone even playing this game?', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle('The Trivia Gods of this Server')
          .setDescription(
            leaderboard
              .map((entry: { username: string; score: number; totalAttempts: number; correctAnswers: number }, i: number) => {
                const rank = i + 1;
                const accuracy = entry.totalAttempts > 0 
                  ? Math.round((entry.correctAnswers / entry.totalAttempts) * 100) 
                  : 0;
                return `${rank}. **${entry.username}** - ${entry.score} pts (${accuracy}% accuracy)`;
              })
              .join('\n')
          )
          .setFooter({ text: 'Not on the list? Get gud.' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error('[TriviaDrops] Error fetching leaderboard:', err);
        await interaction.reply({ content: 'Couldn\'t load the leaderboard. It\'s probably for the best, it would have just made you feel bad.', ephemeral: true });
      }
    } else if (subcommand === 'stats') {
      const userId = interaction.user.id;

      try {
        const stats = getUserStats(userId);

        if (!stats) {
          await interaction.reply({ content: 'No stats for you. Play a round, then we can talk.', ephemeral: true });
          return;
        }

        const accuracy = stats.totalAttempts > 0 
          ? Math.round((stats.correctAnswers / stats.totalAttempts) * 100) 
          : 0;

        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('Your Trivia Report Card')
          .addFields(
            { name: 'Total Score', value: `${stats.score} points`, inline: true },
            { name: 'Correct Answers', value: `${stats.correctAnswers}`, inline: true },
            { name: 'Accuracy', value: `${accuracy}%`, inline: true },
            { name: 'Total Attempts', value: `${stats.totalAttempts}`, inline: true },
            { name: 'Current Streak', value: `${stats.currentStreak}`, inline: true },
            { name: 'Longest Streak', value: `${stats.longestStreak}`, inline: true }
          )
          .setFooter({ text: 'The numbers don\'t lie.' })
          .setTimestamp();

        if (stats.achievements && stats.achievements.length > 0) {
          const achievementNames: Record<string, string> = {
            first_correct: 'First Blood',
            streak_3: 'On Fire',
            streak_5: 'Unstoppable',
            streak_10: 'Legendary',
            score_100: 'Century',
            score_500: 'All-Star',
            score_1000: 'Champion',
            accuracy_80: 'Scholar',
            played_50: 'Dedicated',
            played_100: 'Grinder',
          };
          const achievementList = stats.achievements
            .map((id: string) => achievementNames[id] || id)
            .join(', ');
          embed.addFields({ name: 'Achievements', value: achievementList });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (err) {
        console.error('[TriviaDrops] Error fetching stats:', err);
        await interaction.reply({ content: 'Couldn\'t load your stats. Maybe that\'s a blessing.', ephemeral: true });
      }
    } else {
      await interaction.reply({ content: 'Unknown subcommand. Did you have a stroke?', ephemeral: true });
    }
  },
};
