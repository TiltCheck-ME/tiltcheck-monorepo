/**
 * Poker Commands
 * Texas Hold'em poker game for Discord
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '../types.js';
import { createGame, joinGame, processAction, getChannelGames, formatCards } from '@tiltcheck/poker';

export const poker: Command = {
  data: new SlashCommandBuilder()
    .setName('poker')
    .setDescription('Play Texas Hold\'em poker')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a new poker game')
        .addIntegerOption(opt =>
          opt
            .setName('buyin')
            .setDescription('Buy-in amount (chips)')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt
            .setName('smallblind')
            .setDescription('Small blind amount')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('join')
        .setDescription('Join an active poker game')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check current game status')
    )
    .addSubcommand(sub =>
      sub
        .setName('fold')
        .setDescription('Fold your hand')
    )
    .addSubcommand(sub =>
      sub
        .setName('check')
        .setDescription('Check (no bet)')
    )
    .addSubcommand(sub =>
      sub
        .setName('call')
        .setDescription('Call the current bet')
    )
    .addSubcommand(sub =>
      sub
        .setName('raise')
        .setDescription('Raise the bet')
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('Amount to raise to')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('allin')
        .setDescription('Go all-in')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'start':
        await handleStart(interaction);
        break;
      case 'join':
        await handleJoin(interaction);
        break;
      case 'status':
        await handleStatus(interaction);
        break;
      case 'fold':
      case 'check':
      case 'call':
      case 'raise':
      case 'allin':
        await handleAction(interaction, subcommand);
        break;
      default:
        await interaction.reply({ content: 'Unknown poker command', ephemeral: true });
    }
  },
};

async function handleStart(interaction: ChatInputCommandInteraction) {
  const buyIn = interaction.options.getInteger('buyin') || 100;
  const smallBlind = interaction.options.getInteger('smallblind') || 1;
  const bigBlind = smallBlind * 2;

  // Check for existing games in channel
  const existingGames = getChannelGames(interaction.channelId);
  const activeGame = existingGames.find(g => g.stage !== 'complete');
  
  if (activeGame) {
    await interaction.reply({ 
      content: '⚠️ There\'s already an active poker game in this channel. Use `/poker join` to join!',
      ephemeral: true 
    });
    return;
  }

  const game = createGame(
    interaction.channelId,
    interaction.user.id,
    interaction.user.username,
    buyIn,
    smallBlind,
    bigBlind
  );

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('🃏 New Poker Game Started!')
    .setDescription(`${interaction.user.username} started a game`)
    .addFields(
      { name: 'Buy-in', value: `${buyIn} chips`, inline: true },
      { name: 'Blinds', value: `${smallBlind}/${bigBlind}`, inline: true },
      { name: 'Players', value: `1/${9}`, inline: true },
    )
    .setFooter({ text: 'Use /poker join to join the game!' });

  const startButton = new ButtonBuilder()
    .setCustomId(`poker_start_${game.id}`)
    .setLabel('Start Game (Need 2+ Players)')
    .setStyle(ButtonStyle.Success)
    .setDisabled(true);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(startButton);

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleJoin(interaction: ChatInputCommandInteraction) {
  const games = getChannelGames(interaction.channelId);
  const game = games.find(g => g.stage === 'waiting');

  if (!game) {
    await interaction.reply({ 
      content: '❌ No game waiting for players. Use `/poker start` to create one!',
      ephemeral: true 
    });
    return;
  }

  const joined = joinGame(game.id, interaction.user.id, interaction.user.username);

  if (!joined) {
    await interaction.reply({ 
      content: '❌ Could not join game (already joined or game full)',
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Joined Poker Game')
    .setDescription(`${interaction.user.username} joined the game!`)
    .addFields(
      { name: 'Players', value: `${game.players.length}/${9}`, inline: true },
      { name: 'Buy-in', value: `${game.buyIn} chips`, inline: true },
    );

  if (game.players.length >= 2) {
    const startButton = new ButtonBuilder()
      .setCustomId(`poker_start_${game.id}`)
      .setLabel('Start Game')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(startButton);
    await interaction.reply({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed] });
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  const games = getChannelGames(interaction.channelId);
  const game = games.find(g => g.stage !== 'complete');

  if (!game) {
    await interaction.reply({ 
      content: '❌ No active poker game in this channel',
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('🃏 Poker Game Status')
    .addFields(
      { name: 'Stage', value: game.stage, inline: true },
      { name: 'Pot', value: `${game.pot} chips`, inline: true },
      { name: 'Current Bet', value: `${game.currentBet} chips`, inline: true },
    );

  if (game.communityCards.length > 0) {
    embed.addFields({ 
      name: 'Community Cards', 
      value: formatCards(game.communityCards) 
    });
  }

  // Show player info
  const playerInfo = game.players.map((p, i) => {
    const indicator = i === game.currentPlayerIndex ? '👉' : '  ';
    const status = p.folded ? '(folded)' : p.allIn ? '(all-in)' : '';
    return `${indicator} ${p.username}: ${p.chips} chips ${status}`;
  }).join('\n');

  embed.addFields({ name: 'Players', value: playerInfo || 'None' });

  // DM player their hole cards
  const player = game.players.find(p => p.userId === interaction.user.id);
  if (player && player.cards.length > 0) {
    try {
      await interaction.user.send(`🃏 Your cards: ${formatCards(player.cards)}`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch {
      await interaction.reply({ 
        content: '⚠️ Enable DMs to see your cards!', 
        embeds: [embed], 
        ephemeral: true 
      });
    }
  } else {
    await interaction.reply({ embeds: [embed] });
  }
}

async function handleAction(interaction: ChatInputCommandInteraction, action: string) {
  const games = getChannelGames(interaction.channelId);
  const game = games.find(g => g.stage !== 'complete' && g.stage !== 'waiting');

  if (!game) {
    await interaction.reply({ 
      content: '❌ No active poker game',
      ephemeral: true 
    });
    return;
  }

  const amount = action === 'raise' ? interaction.options.getInteger('amount') : undefined;

  const result = processAction(game.id, {
    userId: interaction.user.id,
    action: action as any,
    amount: amount || undefined,
  });

  if (!result.success) {
    await interaction.reply({ 
      content: `❌ ${result.message}`,
      ephemeral: true 
    });
    return;
  }

  const actionText = action === 'raise' 
    ? `raised to ${amount}` 
    : action === 'allin' 
    ? 'went all-in' 
    : action;

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('♠️ Poker Action')
    .setDescription(`${interaction.user.username} ${actionText}`)
    .addFields(
      { name: 'Pot', value: `${game.pot} chips`, inline: true },
      { name: 'To Call', value: `${game.currentBet} chips`, inline: true },
    );

  // Show updated game state
  if (game.stage === 'showdown' || game.stage === 'complete') {
    // Game ended, show results
    embed.setTitle('🏆 Poker Game Complete!')
      .setColor(0xFFD700);
  }

  await interaction.reply({ embeds: [embed] });
}
