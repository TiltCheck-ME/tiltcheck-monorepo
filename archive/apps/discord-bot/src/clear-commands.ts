import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const token = process.env.TILT_DISCORD_BOT_TOKEN;
const clientId = process.env.TILT_DISCORD_CLIENT_ID;
const guildId = process.env.TILT_DISCORD_GUILD_ID;

if (!token || !clientId) {
    console.error('Missing TILT_DISCORD_BOT_TOKEN or TILT_DISCORD_CLIENT_ID in .env');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('🗑️ Deleting all GLOBAL commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('✅ Successfully deleted all global commands.');

        if (guildId) {
            console.log(`🗑️ Deleting all GUILD commands for ${guildId}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('✅ Successfully deleted all guild commands.');
        }
    } catch (error) {
        console.error('❌ Error deleting commands:', error);
    }
})();
