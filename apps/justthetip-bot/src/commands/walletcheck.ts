import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import { WalletCheckService } from '@tiltcheck/walletcheck';
import type { Command } from '../types.js';

export const walletcheck: Command = {
  data: new SlashCommandBuilder()
    .setName('wallet-check')
    .setDescription('Vibe check a wallet address')
    .addStringOption(option =>
      option.setName('address')
        .setDescription('The Ethereum/EVM wallet address to scan')
        .setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const address = interaction.options.getString('address', true);

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      await interaction.reply({ 
        content: '❌ Invalid EVM address format. Please provide a valid 0x... address.',
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply();

    try {
      const service = new WalletCheckService();
      const report = await service.scanWallet(address);

      const embed = new EmbedBuilder()
        .setTitle(`🔐 Wallet Vibe Check: ${address.substring(0, 6)}...${address.substring(38)}`)
        .setURL(`https://etherscan.io/address/${address}`)
        .setColor(report.score >= 80 ? Colors.Green : report.score >= 50 ? Colors.Yellow : Colors.Red)
        .addFields(
          { name: 'Security Score', value: `**${report.score}/100**`, inline: true },
          { name: 'Balance', value: `${report.details.ethBalance} ETH`, inline: true },
          { name: 'Status', value: report.isCompromised ? '🚨 REKT / COMPROMISED' : '✅ SAFU', inline: true }
        )
        .setTimestamp();

      if (report.threats.length > 0) {
        embed.addFields({ name: '⚠️ Detected Threats', value: report.threats.map(t => `• ${t}`).join('\n') });
      }

      if (report.recommendations.length > 0) {
        embed.addFields({ name: '💡 Recommendations', value: report.recommendations.map(r => `• ${r}`).join('\n') });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply({ 
        content: '❌ Failed to perform wallet scan. Please ensure the address is correct and try again.' 
      });
    }
  }
};
