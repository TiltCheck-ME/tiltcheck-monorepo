/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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

export const dad: Command = {
    data: new SlashCommandBuilder()
        .setName('dad')
        .setDescription('DA&D lobby controls')
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
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const group = interaction.options.getSubcommandGroup(true);
        const sub = interaction.options.getSubcommand(true);

        if (group !== 'lobby') {
            await interaction.reply({ content: 'Invalid command group.', ephemeral: true });
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
