/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const buddy: Command = {
    data: new SlashCommandBuilder()
        .setName('buddy')
        .setDescription('Get an accountability buddy to save you from yourself (or let you know when you're being a degenerate)')
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Hook up with a buddy to let them know when you're about to lose your sh**')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user you want to add as a buddy')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Ditch a buddy. They probably couldn't save you anyway.')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The buddy to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription('See who's got your back (or who you're stuck with).')
        )
        .addSubcommand(sub =>
            sub
                .setName('test')
                .setDescription('Test if your buddy's actually watching. (It's a simulation, don't panic.)')
                .addUserOption(opt =>
                    opt
                        .setName('buddy')
                        .setDescription('The buddy to test alert')
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'add') {
                const targetUser = interaction.options.getUser('user')!;

                if (targetUser.id === interaction.user.id) {
                    await interaction.reply({ content: 'Seriously? You can't be your own damn buddy. Pick someone else.', ephemeral: true });
                    return;
                }

                if (targetUser.bot) {
                    await interaction.reply({ content: 'Bots are for trading, not saving your ass. Pick a human.', ephemeral: true });
                    return;
                }

                // Mock DB Insertion 
                const embed = new EmbedBuilder()
                    .setColor(0x00CED1)
                    .setTitle('Buddy Request Sent. May God Have Mercy On Their Soul.')
                    .setDescription(`We just sent <@${targetUser.id}> a lifeline request. They'll get alerts if you start going full tilt or, god forbid, you empty your wallet.`);

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'remove') {
                const targetUser = interaction.options.getUser('user')!;

                await interaction.reply({
                    content: `<@${targetUser.id}> has been yeeted from your buddy list. They probably couldn't save you anyway.`,
                    ephemeral: true
                });

            } else if (subcommand === 'list') {
                const embed = new EmbedBuilder()
                    .setColor(0x00CED1)
                    .setTitle('Who's Got Your Back?')
                    .setDescription('You're flying solo, degen. Maybe find a friend before you lose your sh**.')
                    .setFooter({ text: 'Use /buddy add to rope in a poor soul.' });

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'test') {
                const targetUser = interaction.options.getUser('buddy')!;

                await interaction.reply({
                    content: `Sent a mock alert to <@${targetUser.id}>. They're probably ignoring you anyway. (Just a test, chill.)`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error executing /buddy command:', error);
            await interaction.reply({ content: 'Well, f***. Something went wrong processing that buddy request. Try again, I guess?', ephemeral: true });
        }
    },
};