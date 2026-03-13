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
import { poker } from './poker.js';

export const dad: Command = {
    data: new SlashCommandBuilder()
        .setName('dad')
        .setDescription('DA&D and Poker. The two best ways to lose friends and money.')
        .addSubcommandGroup((group) =>
            group
                .setName('lobby')
                .setDescription('The DA&D lobby. Don\'t hold up the game.')
                .addSubcommand((sub) =>
                    sub
                        .setName('create')
                        .setDescription('Start a new DA&D lobby.')
                        .addIntegerOption((opt) =>
                            opt
                                .setName('rounds')
                                .setDescription('More rounds, more pain. (default: 10)')
                                .setRequired(false)
                                .setMinValue(3)
                                .setMaxValue(20),
                        )
                        .addIntegerOption((opt) =>
                            opt
                                .setName('maxplayers')
                                .setDescription('How many friends are you trying to lose? (default: 10)')
                                .setRequired(false)
                                .setMinValue(2)
                                .setMaxValue(10),
                        ),
                )
                .addSubcommand((sub) => sub.setName('join').setDescription('Get in the game before it starts without you.'))
                .addSubcommand((sub) => sub.setName('start').setDescription('Let\'s f***ing go. (Starts the game).'))
                .addSubcommand((sub) => sub.setName('hand').setDescription('Look at the sh** cards you were dealt.'))
                .addSubcommand((sub) =>
                    sub
                        .setName('submit')
                        .setDescription('Play a card. Try to be funny.')
                        .addIntegerOption((opt) =>
                            opt
                                .setName('card')
                                .setDescription('The number of the card you\'re playing.')
                                .setRequired(true)
                                .setMinValue(1),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName('vote')
                        .setDescription('Pick a winner. Or vote for yourself, I don\'t care.')
                        .addUserOption((opt) =>
                            opt
                                .setName('player')
                                .setDescription("Who played the least sh** card?")
                                .setRequired(true),
                        ),
                )
                .addSubcommand((sub) => sub.setName('scores').setDescription('See who\'s winning. It\'s probably not you.')),
        )
        .addSubcommandGroup((group) =>
            group
                .setName('poker')
                .setDescription("Texas Hold'em. You know the rules.")
                .addSubcommand((sub) =>
                    sub
                        .setName('start')
                        .setDescription('Start a new game. Bring your own money.')
                        .addIntegerOption((opt) => opt.setName('buyin').setDescription('How much are you willing to lose?').setRequired(false))
                        .addIntegerOption((opt) =>
                            opt.setName('smallblind').setDescription('Small blind. If you have to ask, you can\'t afford it.').setRequired(false),
                        ),
                )
                .addSubcommand((sub) => sub.setName('join').setDescription('Join the poker game.'))
                .addSubcommand((sub) => sub.setName('status').setDescription('Check the table. See who\'s got the chips.'))
                .addSubcommand((sub) => sub.setName('fold').setDescription('Fold. Like a little b****.'))
                .addSubcommand((sub) => sub.setName('check').setDescription('Check. The coward\'s move.'))
                .addSubcommand((sub) => sub.setName('call').setDescription('Call. Show them you\'re not scared.'))
                .addSubcommand((sub) =>
                    sub
                        .setName('raise')
                        .setDescription('Raise the bet. Put your money where your mouth is.')
                        .addIntegerOption((opt) =>
                            opt.setName('amount').setDescription('How much you raising?').setRequired(true),
                        ),
                )
                .addSubcommand((sub) => sub.setName('allin').setDescription('All in. Go big or go home.')),
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
