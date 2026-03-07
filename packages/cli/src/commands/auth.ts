/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Authentication commands
 */

import { Command } from 'commander';
import { createClient } from '@tiltcheck/shared';
import { saveToken, clearToken, loadToken } from '../auth.js';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Login command
 */
export const loginCommand = new Command('login')
  .description('Login to TiltCheck')
  .option('-u, --url <url>', 'API URL', 'http://localhost:4000')
  .action(async (options) => {
    try {
      const email = await question('Email: ');
      const password = await question('Password: ');
      
      rl.close();
      
      const client = createClient({ baseUrl: options.url });
      const response = await client.login({ email, password });
      
      await saveToken(response.token);
      
      console.log('✓ Successfully logged in!');
      console.log(`User: ${response.user.email}`);
      console.log(`Roles: ${response.user.roles.join(', ')}`);
    } catch (error) {
      rl.close();
      console.error('✗ Login failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Logout command
 */
export const logoutCommand = new Command('logout')
  .description('Logout from TiltCheck')
  .action(async () => {
    try {
      await clearToken();
      console.log('✓ Successfully logged out!');
    } catch (error) {
      console.error('✗ Logout failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Whoami command
 */
export const whoamiCommand = new Command('whoami')
  .description('Show current user')
  .option('-u, --url <url>', 'API URL', 'http://localhost:4000')
  .action(async (options) => {
    try {
      const token = await loadToken();
      if (!token) {
        console.error('✗ Not logged in. Run "tiltcheck login" first.');
        process.exit(1);
      }
      
      const client = createClient({ baseUrl: options.url, token });
      const user = await client.me();
      
      console.log('Logged in as:');
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  User ID: ${user.userId}`);
      console.log(`  Roles: ${user.roles.join(', ')}`);
      if (user.discordUsername) {
        console.log(`  Discord: ${user.discordUsername}`);
      }
    } catch (error) {
      console.error('✗ Failed to get user info:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
