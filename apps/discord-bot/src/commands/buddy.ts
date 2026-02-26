import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const buddy: Command = {
    data: new SlashCommandBuilder()
        .setName('buddy')
        .setDescription('Manage your Phone a Friend buddy system')
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Link a buddy to alert them when you tilt')
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
                .setDescription('Remove a buddy')
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
                .setDescription('List your current buddies')
        )
        .addSubcommand(sub =>
            sub
                .setName('test')
                .setDescription('Send a test alert to your buddy')
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
                    await interaction.reply({ content: '❌ You cannot add yourself as a buddy.', ephemeral: true });
                    return;
                }

                if (targetUser.bot) {
                    await interaction.reply({ content: '❌ You cannot add a bot as a buddy.', ephemeral: true });
                    return;
                }

                // Mock DB Insertion 
                const embed = new EmbedBuilder()
                    .setColor(0x00CED1)
                    .setTitle('🤝 Buddy Request Sent')
                    .setDescription(`Sent a buddy request to <@${targetUser.id}>.\nThey will receive alerts if you exhibit tilt behavior or your balance reaches zero.`);

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'remove') {
                const targetUser = interaction.options.getUser('user')!;

                await interaction.reply({
                    content: `✅ <@${targetUser.id}> has been removed from your buddy list.`,
                    ephemeral: true
                });

            } else if (subcommand === 'list') {
                const embed = new EmbedBuilder()
                    .setColor(0x00CED1)
                    .setTitle('🤝 Your Buddies')
                    .setDescription('You currently do not have any active buddies.')
                    .setFooter({ text: 'Use /buddy add to add a friend' });

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'test') {
                const targetUser = interaction.options.getUser('buddy')!;

                await interaction.reply({
                    content: `🚨 Sent a mock alert to <@${targetUser.id}>. (This is a simulation)`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error executing /buddy command:', error);
            await interaction.reply({ content: '❌ An error occurred processing your request.', ephemeral: true });
        }
    },
};
