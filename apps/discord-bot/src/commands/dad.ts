/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * DA&D Proxy Command (Consolidated)
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { play } from './dad/play.js';
import { join } from './dad/join.js';
import { startgame } from './dad/startgame.js';
import { hand } from './dad/hand.js';
import { submit } from './dad/submit.js';
import { vote } from './dad/vote.js';
import { scores } from './dad/scores.js';
import { poker } from './poker.js';

export const dad: Command = {
    data: new SlashCommandBuilder()
        .setName('dad')
        .setDescription('DA&D lobby + poker table (one command, no clutter)')
        .addSubcommandGroup((group) =>
            group
                .setName('lobby')
                .setDescription('DA&D lobby controls')
                .addSubcommand((sub) =>
                    sub
                        .setName('create')
                        .setDescription('Create a new DA&D lobby')
                        .addIntegerOption((opt) =>
                            opt
                                .setName('rounds')
                                .setDescription('Number of rounds (default: 10)')
                                .setRequired(false)
                                .setMinValue(3)
                                .setMaxValue(20),
                        )
                        .addIntegerOption((opt) =>
                            opt
                                .setName('maxplayers')
                                .setDescription('Max players (default: 10)')
                                .setRequired(false)
                                .setMinValue(2)
                                .setMaxValue(10),
                        ),
                )
                .addSubcommand((sub) => sub.setName('join').setDescription('Join the active DA&D lobby in this channel'))
                .addSubcommand((sub) => sub.setName('start').setDescription('Start the current DA&D lobby (2+ players)'))
                .addSubcommand((sub) => sub.setName('hand').setDescription('View your cards'))
                .addSubcommand((sub) =>
                    sub
                        .setName('submit')
                        .setDescription('Submit a card for the active round')
                        .addIntegerOption((opt) =>
                            opt
                                .setName('card')
                                .setDescription('Card number from your hand')
                                .setRequired(true)
                                .setMinValue(1),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName('vote')
                        .setDescription('Vote for the winning answer this round')
                        .addUserOption((opt) =>
                            opt
                                .setName('player')
                                .setDescription("The player whose answer you're voting for")
                                .setRequired(true),
                        ),
                )
                .addSubcommand((sub) => sub.setName('scores').setDescription('View the current DA&D leaderboard')),
        )
        .addSubcommandGroup((group) =>
            group
                .setName('poker')
                .setDescription("Texas Hold'em")
                .addSubcommand((sub) =>
                    sub
                        .setName('start')
                        .setDescription('Start a new poker game')
                        .addIntegerOption((opt) => opt.setName('buyin').setDescription('Buy-in amount (chips)').setRequired(false))
                        .addIntegerOption((opt) =>
                            opt.setName('smallblind').setDescription('Small blind amount').setRequired(false),
                        ),
                )
                .addSubcommand((sub) => sub.setName('join').setDescription('Join an active poker game'))
                .addSubcommand((sub) => sub.setName('status').setDescription('Check current game status'))
                .addSubcommand((sub) => sub.setName('fold').setDescription('Fold your hand'))
                .addSubcommand((sub) => sub.setName('check').setDescription('Check (no bet)'))
                .addSubcommand((sub) => sub.setName('call').setDescription('Call the current bet'))
                .addSubcommand((sub) =>
                    sub
                        .setName('raise')
                        .setDescription('Raise the bet')
                        .addIntegerOption((opt) =>
                            opt.setName('amount').setDescription('Amount to raise to').setRequired(true),
                        ),
                )
                .addSubcommand((sub) => sub.setName('allin').setDescription('Go all-in')),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const group = interaction.options.getSubcommandGroup(true);
        const sub = interaction.options.getSubcommand(true);

        if (group === 'poker') {
            await poker.execute(interaction);
            return;
        }

        // group === 'lobby'
        switch (sub) {
            case 'create':
                await play.execute(interaction);
                return;
            case 'join':
                await join.execute(interaction);
                return;
            case 'start':
                await startgame.execute(interaction);
                return;
            case 'hand':
                await hand.execute(interaction);
                return;
            case 'submit':
                await submit.execute(interaction);
                return;
            case 'vote':
                await vote.execute(interaction);
                return;
            case 'scores':
                await scores.execute(interaction);
                return;
            default:
                await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
        }
    },
};
