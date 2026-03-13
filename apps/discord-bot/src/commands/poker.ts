/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    .setDescription('Play some f***ing Texas Hold'em poker. Don't be a fish.') // MODIFIED
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a new game and get ready to stack some chips. Or lose them all.') // MODIFIED
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
        .setDescription('Jump into an active game. Don't be a spectator, you coward.') // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check the current game status. Who's about to get rekt?') // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('fold')
        .setDescription('Fold your sh**ty hand. Don't be a hero.') // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('check')
        .setDescription('Check. (You probably have nothing).') // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('call')
        .setDescription('Call the current bet. Show them who's boss. Or who's a fish.') // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('raise')
        .setDescription('Raise the f***ing bet. No guts, no glory.') // MODIFIED
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
        .setDescription('Go all-in. Hope you're not bluffing, degen.') // MODIFIED
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
      content: '⚠️ There's already a f***ing game in this channel, you ape. Use `/poker join` to get in on the action, or wait for the current bloodbath to end.', // MODIFIED
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
    .setTitle('🃏 New Poker Game Started! Let's Get This F***ing Party Started.') // MODIFIED
    .setDescription(`${interaction.user.username} has opened a new table. Get in here, degens.`) // MODIFIED
    .addFields(
      { name: 'Buy-in', value: `${buyIn} chips`, inline: true },
      { name: 'Blinds', value: `${smallBlind}/${bigBlind}`, inline: true },
      { name: 'Players', value: `1/${9}`, inline: true },
    )
    .setFooter({ text: 'Use /poker join to jump into the fire!' }); // MODIFIED

  const startButton = new ButtonBuilder()
    .setCustomId(`poker_start_${game.id}`)
    .setLabel('Start this f***ing game! (Need 2+ degens)') // MODIFIED
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
      content: '❌ No game waiting for players, you ape. Use `/poker start` to create some f***ing chaos.', // MODIFIED
      ephemeral: true 
    });
    return;
  }

  const joined = joinGame(game.id, interaction.user.id, interaction.user.username);

  if (!joined) {
    await interaction.reply({ 
      content: '❌ Couldn't join the game. Either you're already in, or the table's full of degenerates. Wait your turn.', // MODIFIED
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Welcome to the Thunderdome!') // MODIFIED
    .setDescription(`${interaction.user.username} has entered the arena! Good luck, you'll need it.`) // MODIFIED
    .addFields(
      { name: 'Players', value: `${game.players.length}/${9}`, inline: true },
      { name: 'Buy-in', value: `${game.buyIn} chips`, inline: true },
    );

  if (game.players.length >= 2) {
    const startButton = new ButtonBuilder()
      .setCustomId(`poker_start_${game.id}`)
      .setLabel('Start this f***ing game!') // MODIFIED
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
      content: '❌ No active f***ing game in this channel, degen. Are you trying to play with yourself?', // MODIFIED
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('🃏 State of the Union: Poker Edition') // MODIFIED
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
  }).join('
');

  embed.addFields({ name: 'Players', value: playerInfo || 'None' });

  // DM player their hole cards
  const player = game.players.find(p => p.userId === interaction.user.id);
  if (player && player.cards.length > 0) {
    try {
      await interaction.user.send(`🃏 Your cards: ${formatCards(player.cards)}`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch {
      await interaction.reply({ 
        content: '⚠️ Can't see your cards? Enable DMs, you ape! How else are you gonna know what you're holding?', // MODIFIED
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
      content: '❌ No active f***ing game to make a move in. Chill out.', // MODIFIED
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
      content: `❌ You can't do that, you f***ing idiot: ${result.message}`, // MODIFIED
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
    .setTitle('♠️ The Plot Thickens...') // MODIFIED
    .setDescription(`${interaction.user.username} ${actionText}`)
    .addFields(
      { name: 'Pot', value: `${game.pot} chips`, inline: true },
      { name: 'To Call', value: `${game.currentBet} chips`, inline: true },
    );

  // Show updated game state
  if (game.stage === 'showdown' || game.stage === 'complete') {
    // Game ended, show results
    embed.setTitle('🏆 Game Over, Bitches! Here's a Winner!') // MODIFIED
      .setColor(0xFFD700);
  }

  await interaction.reply({ embeds: [embed] });
}
