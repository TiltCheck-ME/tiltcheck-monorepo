/**
 * Onboarding System for JustTheTip Bot
 * Handles first-time user welcome, wallet setup, and preferences
 */

import { 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  User,
  MessageComponentInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  DMChannel,
} from 'discord.js';

// Track onboarded users (in production, this would be in database)
const onboardedUsers = new Set<string>();
const userPreferences = new Map<string, UserPreferences>();

interface UserPreferences {
  userId: string;
  discordId: string;
  joinedAt: number;
  walletAddress?: string;
  notifications: {
    tips: boolean;
    trivia: boolean;
    promos: boolean;
  };
  riskLevel: 'conservative' | 'moderate' | 'degen';
  cooldownEnabled: boolean;
  dailyLimit?: number;
  hasAcceptedTerms: boolean;
  degenId?: string; // Future NFT-based ID
}

/**
 * Check if user needs onboarding
 */
export function needsOnboarding(userId: string): boolean {
  return !onboardedUsers.has(userId) && !userPreferences.has(userId);
}

/**
 * Mark user as onboarded
 */
export function markOnboarded(userId: string): void {
  onboardedUsers.add(userId);
}

/**
 * Get user preferences
 */
export function getUserPreferences(userId: string): UserPreferences | undefined {
  return userPreferences.get(userId);
}

/**
 * Save user preferences
 */
export function saveUserPreferences(prefs: UserPreferences): void {
  userPreferences.set(prefs.userId, prefs);
  onboardedUsers.add(prefs.userId);
}

/**
 * Send welcome DM to new user
 */
export async function sendWelcomeDM(user: User): Promise<boolean> {
  try {
    const dmChannel = await user.createDM();

    // Welcome embed with mascot personality
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x00D4AA)
      .setTitle('🎰 Yo! Welcome to the Degen Fam!')
      .setDescription(
        `Hey **${user.username}**! I'm **JustTheTip** - your non-custodial tipping sidekick, powered by TiltCheck.\n\n` +
        `I'm here to help you:\n` +
        `• 💸 **Send & receive SOL tips** in Discord\n` +
        `• 🔒 **Lock funds in vaults** when you're feeling tilted\n` +
        `• 🎯 **Play trivia** and win crypto\n` +
        `• 🔗 **Stay safe** with link scanning\n\n` +
        `**The best part?** I never hold your funds. Your keys, your crypto. Always.\n\n` +
        `Ready to join the ecosystem? Let's get you set up! 👇`
      )
      .setThumbnail('https://tiltcheck.it.com/assets/logo/favicon-white.svg')
      .setFooter({ text: 'JustTheTip Bot • Powered by TiltCheck • Est. 2024' });

    // Action buttons
    const getStartedBtn = new ButtonBuilder()
      .setCustomId('onboard_start')
      .setLabel('🚀 Let\'s Go!')
      .setStyle(ButtonStyle.Success);

    const learnMoreBtn = new ButtonBuilder()
      .setCustomId('onboard_learn')
      .setLabel('📖 Tell Me More')
      .setStyle(ButtonStyle.Secondary);

    const maybeLaterBtn = new ButtonBuilder()
      .setCustomId('onboard_later')
      .setLabel('Maybe Later')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(getStartedBtn, learnMoreBtn, maybeLaterBtn);

    await dmChannel.send({ embeds: [welcomeEmbed], components: [row] });
    return true;
  } catch (error) {
    console.error('[Onboarding] Failed to send welcome DM:', error);
    return false;
  }
}

/**
 * Handle onboarding button interactions
 */
export async function handleOnboardingInteraction(
  interaction: MessageComponentInteraction
): Promise<void> {
  switch (interaction.customId) {
    case 'onboard_start':
      await showTermsAndConditions(interaction);
      break;
    
    case 'onboard_learn':
      await showLearnMore(interaction);
      break;
    
    case 'onboard_later':
      await interaction.update({
        content: '👋 No worries! When you\'re ready, just use any `/tip` command and I\'ll help you get set up.\n\n*Pro tip: The sooner you register, the sooner you can start receiving tips!*',
        embeds: [],
        components: [],
      });
      break;

    case 'onboard_accept_terms':
      await showWalletSetup(interaction);
      break;

    case 'onboard_decline_terms':
      await interaction.update({
        content: '😅 No problem! You can always come back later. Just use `/tip wallet` when you\'re ready.',
        embeds: [],
        components: [],
      });
      break;

    case 'onboard_wallet_external':
      await showExternalWalletInstructions(interaction);
      break;

    case 'onboard_wallet_magic':
      await showMagicWalletInfo(interaction);
      break;

    case 'onboard_wallet_skip':
      await showPreferences(interaction, undefined);
      break;

    case 'onboard_complete':
      await completeOnboarding(interaction);
      break;

    default:
      if (interaction.customId.startsWith('onboard_pref_')) {
        await handlePreferenceSelection(interaction);
      }
  }
}

/**
 * Show terms and conditions
 */
async function showTermsAndConditions(interaction: MessageComponentInteraction): Promise<void> {
  const termsEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('📜 Quick Legal Stuff (Promise It\'s Short)')
    .setDescription(
      `Before we proceed, here's what you're agreeing to:\n\n` +
      `**✅ Non-Custodial**\n` +
      `We NEVER hold your funds. You sign every transaction with your own wallet.\n\n` +
      `**✅ Flat Fee**\n` +
      `0.0007 SOL (~$0.07) per tip goes to development. That's it.\n\n` +
      `**✅ Your Responsibility**\n` +
      `You're responsible for your own gambling decisions. We provide tools to help you stay in control (cooldowns, vaults), but ultimately it's on you.\n\n` +
      `**✅ No Financial Advice**\n` +
      `Nothing here is financial advice. We're degens helping degens.\n\n` +
      `**✅ Privacy**\n` +
      `We store your Discord ID and wallet address. That's it. No KYC, no personal data harvesting.\n\n` +
      `By continuing, you agree to use JustTheTip responsibly. 🤝`
    );

  const acceptBtn = new ButtonBuilder()
    .setCustomId('onboard_accept_terms')
    .setLabel('✅ I Accept')
    .setStyle(ButtonStyle.Success);

  const declineBtn = new ButtonBuilder()
    .setCustomId('onboard_decline_terms')
    .setLabel('❌ Decline')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(acceptBtn, declineBtn);

  await interaction.update({ embeds: [termsEmbed], components: [row] });
}

/**
 * Show learn more information
 */
async function showLearnMore(interaction: MessageComponentInteraction): Promise<void> {
  const learnEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('📖 What is JustTheTip?')
    .setDescription(
      `**JustTheTip** is a non-custodial Solana tipping bot for Discord, part of the **TiltCheck** ecosystem.\n\n` +
      `### 🎯 What Can You Do?\n\n` +
      `**💸 Tip SOL**\n` +
      `Send crypto directly to other Discord users. No middleman, no custody.\n` +
      `\`/tip send @friend $5\`\n\n` +
      `**🚀 Airdrops**\n` +
      `Send to multiple people at once.\n` +
      `\`/tip airdrop @user1 @user2 0.1\`\n\n` +
      `**🔒 Vault Lock**\n` +
      `Feeling tilted? Lock your funds for a set time. Can't touch them until it expires.\n` +
      `\`/tip lock $100 24h\`\n\n` +
      `**🎯 Trivia Drops**\n` +
      `Host trivia games with prizes. Winners split the pot!\n` +
      `\`/tip trivia $5 30s\`\n\n` +
      `**🔗 Link Scanning**\n` +
      `Check if a casino/crypto link is legit or a scam.\n` +
      `\`/suslink scan <url>\`\n\n` +
      `### 🏆 The TiltCheck Ecosystem\n` +
      `JustTheTip is just one part of TiltCheck - a suite of tools for degen communities including trust scores, bonus tracking, and more!`
    )
    .setFooter({ text: 'Ready to get started? Click below!' });

  const startBtn = new ButtonBuilder()
    .setCustomId('onboard_start')
    .setLabel('🚀 Set Me Up!')
    .setStyle(ButtonStyle.Success);

  const websiteBtn = new ButtonBuilder()
    .setLabel('🌐 Visit Website')
    .setStyle(ButtonStyle.Link)
    .setURL('https://tiltcheck.it.com');

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(startBtn, websiteBtn);

  await interaction.update({ embeds: [learnEmbed], components: [row] });
}

/**
 * Show wallet setup options
 */
async function showWalletSetup(interaction: MessageComponentInteraction): Promise<void> {
  // Initialize user preferences
  const prefs: UserPreferences = {
    userId: interaction.user.id,
    discordId: interaction.user.id,
    joinedAt: Date.now(),
    notifications: { tips: true, trivia: true, promos: false },
    riskLevel: 'moderate',
    cooldownEnabled: false,
    hasAcceptedTerms: true,
  };
  userPreferences.set(interaction.user.id, prefs);

  const walletEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('💳 Let\'s Connect Your Wallet')
    .setDescription(
      `To send and receive tips, you need a Solana wallet connected.\n\n` +
      `**Option 1: External Wallet (Recommended)**\n` +
      `Connect your existing Phantom, Solflare, or Backpack wallet. You keep full control.\n\n` +
      `**Option 2: Magic Wallet (Coming Soon)**\n` +
      `We'll create a disposable wallet for you - perfect for users on cooldown or who want extra separation.\n\n` +
      `**Option 3: Skip for Now**\n` +
      `You can still use some features, but won't be able to send/receive tips until you connect a wallet.`
    );

  const externalBtn = new ButtonBuilder()
    .setCustomId('onboard_wallet_external')
    .setLabel('🔗 Connect External Wallet')
    .setStyle(ButtonStyle.Primary);

  const magicBtn = new ButtonBuilder()
    .setCustomId('onboard_wallet_magic')
    .setLabel('✨ Magic Wallet (Soon)')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const skipBtn = new ButtonBuilder()
    .setCustomId('onboard_wallet_skip')
    .setLabel('⏭️ Skip for Now')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(externalBtn, magicBtn, skipBtn);

  await interaction.update({ embeds: [walletEmbed], components: [row] });
}

/**
 * Show external wallet connection instructions
 */
async function showExternalWalletInstructions(interaction: MessageComponentInteraction): Promise<void> {
  const instructionsEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('🔗 Connect Your Solana Wallet')
    .setDescription(
      `**How to connect your wallet:**\n\n` +
      `**Step 1:** Open your Solana wallet (Phantom, Solflare, Backpack, etc.)\n\n` +
      `**Step 2:** Copy your wallet address\n` +
      `• In Phantom: Tap your address at the top to copy\n` +
      `• In Solflare: Click the copy icon next to your address\n\n` +
      `**Step 3:** Use the command below in any server with JustTheTip:\n\n` +
      `\`/tip wallet register-external address:YOUR_ADDRESS\`\n\n` +
      `Your address looks like:\n` +
      `\`7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\`\n\n` +
      `⚠️ **Make sure you use your PUBLIC address, not your private key!**`
    )
    .setFooter({ text: 'Once registered, you can send and receive tips!' });

  const continueBtn = new ButtonBuilder()
    .setCustomId('onboard_wallet_skip')
    .setLabel('✅ Got It - Continue Setup')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(continueBtn);

  await interaction.update({ embeds: [instructionsEmbed], components: [row] });
}

/**
 * Show magic wallet info
 */
async function showMagicWalletInfo(interaction: MessageComponentInteraction): Promise<void> {
  const magicEmbed = new EmbedBuilder()
    .setColor(0x8A2BE2)
    .setTitle('✨ Magic Wallets - Coming Soon!')
    .setDescription(
      `**Magic Wallets** are disposable, temporary wallets perfect for:\n\n` +
      `• 🎰 **Tilted degens** who want to limit their spending\n` +
      `• 🔒 **Extra security** - separate from your main wallet\n` +
      `• ⚡ **Quick setup** - no external wallet needed\n\n` +
      `We're still building this feature. For now, please connect an external wallet or skip this step.\n\n` +
      `*Want to be notified when Magic Wallets launch? We'll ping you!*`
    );

  const backBtn = new ButtonBuilder()
    .setCustomId('onboard_accept_terms')
    .setLabel('← Back to Wallet Options')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn);

  await interaction.update({ embeds: [magicEmbed], components: [row] });
}

/**
 * Show preferences setup (via interaction update)
 */
async function showPreferences(interaction: MessageComponentInteraction, _walletAddress?: string): Promise<void> {
  const prefsEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('⚙️ Set Your Preferences')
    .setDescription(
      `Almost done! Let's customize your experience.\n\n` +
      `**🔔 Notifications**\n` +
      `What do you want to be notified about?\n\n` +
      `**🎚️ Risk Level**\n` +
      `This affects default cooldown suggestions and vault recommendations.`
    );

  // Notification preferences
  const notifSelect = new StringSelectMenuBuilder()
    .setCustomId('onboard_pref_notifications')
    .setPlaceholder('Select notification preferences')
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Tip Notifications')
        .setDescription('Get notified when you receive tips')
        .setValue('tips')
        .setEmoji('💸')
        .setDefault(true),
      new StringSelectMenuOptionBuilder()
        .setLabel('Trivia Alerts')
        .setDescription('Get pinged when trivia drops start')
        .setValue('trivia')
        .setEmoji('🎯'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Promo Updates')
        .setDescription('Hear about new promos and bonuses')
        .setValue('promos')
        .setEmoji('🎁'),
    );

  const notifRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(notifSelect);

  // Risk level buttons
  const conservativeBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_conservative')
    .setLabel('🐢 Conservative')
    .setStyle(ButtonStyle.Secondary);

  const moderateBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_moderate')
    .setLabel('⚖️ Moderate')
    .setStyle(ButtonStyle.Primary);

  const degenBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_degen')
    .setLabel('🔥 Full Degen')
    .setStyle(ButtonStyle.Danger);

  const riskRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(conservativeBtn, moderateBtn, degenBtn);

  const completeBtn = new ButtonBuilder()
    .setCustomId('onboard_complete')
    .setLabel('✅ Complete Setup')
    .setStyle(ButtonStyle.Success);

  const completeRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(completeBtn);

  await interaction.update({ 
    embeds: [prefsEmbed], 
    components: [notifRow, riskRow, completeRow] 
  });
}

/**
 * Show preferences via direct message (exported for future use)
 */
export async function showPreferencesMessage(channel: DMChannel, _userId: string): Promise<void> {
  const prefsEmbed = new EmbedBuilder()
    .setColor(0x00D4AA)
    .setTitle('⚙️ Set Your Preferences')
    .setDescription(
      `Almost done! Let's customize your experience.\n\n` +
      `**🎚️ Pick your risk level:**\n` +
      `🐢 Conservative - More cooldown reminders, lower limits suggested\n` +
      `⚖️ Moderate - Balanced approach (default)\n` +
      `🔥 Full Degen - No hand-holding, you know what you're doing`
    );

  const conservativeBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_conservative')
    .setLabel('🐢 Conservative')
    .setStyle(ButtonStyle.Secondary);

  const moderateBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_moderate')
    .setLabel('⚖️ Moderate')
    .setStyle(ButtonStyle.Primary);

  const degenBtn = new ButtonBuilder()
    .setCustomId('onboard_pref_risk_degen')
    .setLabel('🔥 Full Degen')
    .setStyle(ButtonStyle.Danger);

  const riskRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(conservativeBtn, moderateBtn, degenBtn);

  const completeBtn = new ButtonBuilder()
    .setCustomId('onboard_complete')
    .setLabel('✅ Complete Setup')
    .setStyle(ButtonStyle.Success);

  const completeRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(completeBtn);

  await channel.send({ 
    embeds: [prefsEmbed], 
    components: [riskRow, completeRow] 
  });
}

/**
 * Handle preference selection
 */
async function handlePreferenceSelection(interaction: MessageComponentInteraction): Promise<void> {
  const prefs = userPreferences.get(interaction.user.id);
  if (!prefs) return;

  if (interaction.customId === 'onboard_pref_notifications' && interaction.isStringSelectMenu()) {
    const values = interaction.values;
    prefs.notifications = {
      tips: values.includes('tips'),
      trivia: values.includes('trivia'),
      promos: values.includes('promos'),
    };
    await interaction.deferUpdate();
  } else if (interaction.customId.startsWith('onboard_pref_risk_')) {
    const risk = interaction.customId.replace('onboard_pref_risk_', '') as 'conservative' | 'moderate' | 'degen';
    prefs.riskLevel = risk;
    
    // Set cooldown based on risk level
    prefs.cooldownEnabled = risk !== 'degen';
    
    await interaction.reply({
      content: `Risk level set to **${risk}**! ${risk === 'degen' ? '🔥 No limits!' : risk === 'conservative' ? '🐢 Playing it safe!' : '⚖️ Balanced approach!'}`,
      ephemeral: true,
    });
  }

  userPreferences.set(interaction.user.id, prefs);
}

/**
 * Complete the onboarding process
 */
async function completeOnboarding(interaction: MessageComponentInteraction): Promise<void> {
  const prefs = userPreferences.get(interaction.user.id);
  
  markOnboarded(interaction.user.id);

  const completedEmbed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('🎉 You\'re All Set!')
    .setDescription(
      `Welcome to the TiltCheck ecosystem, **${interaction.user.username}**!\n\n` +
      `**Your Setup:**\n` +
      `💳 Wallet: ${prefs?.walletAddress ? `\`${prefs.walletAddress.slice(0, 8)}...${prefs.walletAddress.slice(-8)}\`` : 'Not connected yet'}\n` +
      `🎚️ Risk Level: ${prefs?.riskLevel || 'Moderate'}\n` +
      `🔔 Notifications: ${prefs?.notifications.tips ? 'Tips' : ''} ${prefs?.notifications.trivia ? 'Trivia' : ''} ${prefs?.notifications.promos ? 'Promos' : ''}\n\n` +
      `**Quick Commands:**\n` +
      `\`/tip send @user $5\` - Send a tip\n` +
      `\`/tip trivia $5 15s\` - Start trivia\n` +
      `\`/tip balance\` - Check balance\n` +
      `\`/help\` - Full command list\n\n` +
      `🏆 **Your Degen ID:** Coming soon! We're working on NFT-based IDs for verified ecosystem members.\n\n` +
      `Questions? Use \`/support\` or join our Discord!`
    )
    .setFooter({ text: 'JustTheTip Bot • Powered by TiltCheck • Let\'s get tipping!' });

  const discordBtn = new ButtonBuilder()
    .setLabel('🎮 Join TiltCheck Discord')
    .setStyle(ButtonStyle.Link)
    .setURL('https://discord.gg/s6NNfPHxMS');

  const websiteBtn = new ButtonBuilder()
    .setLabel('🌐 Visit Website')
    .setStyle(ButtonStyle.Link)
    .setURL('https://tiltcheck.it.com');

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(discordBtn, websiteBtn);

  await interaction.update({ embeds: [completedEmbed], components: [row] });
}

/**
 * Check if user is onboarded and trigger welcome if not
 */
export async function checkAndOnboard(user: User): Promise<boolean> {
  if (!needsOnboarding(user.id)) {
    return false; // Already onboarded
  }

  const dmSent = await sendWelcomeDM(user);
  return dmSent;
}
