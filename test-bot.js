
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TILT_DISCORD_BOT_TOKEN;
if (!token) {
    console.error('No TILT_DISCORD_BOT_TOKEN found');
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
    process.exit(0);
});

client.login(token).catch(err => {
    console.error('Login failed:', err.message);
    process.exit(1);
});
