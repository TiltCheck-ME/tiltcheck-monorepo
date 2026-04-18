/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
/**
 * Authentication commands
 */

import { Command } from 'commander';
import { createClient } from '@tiltcheck/shared';
import { saveToken, clearToken, loadToken } from '../auth.js';
import * as readline from 'readline';
import { Writable } from 'stream';

function createPromptInterface(): {
  question: (query: string, options?: { sensitive?: boolean }) => Promise<string>;
  close: () => void;
} {
  let muted = false;

  const silentOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) {
        process.stdout.write(chunk, encoding as BufferEncoding);
      }

      callback();
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: silentOutput,
  });

  return {
    question(query: string, options?: { sensitive?: boolean }): Promise<string> {
      return new Promise((resolve) => {
        if (options?.sensitive) {
          process.stdout.write(query);
          muted = true;
          rl.question('', (answer) => {
            muted = false;
            process.stdout.write('\n');
            resolve(answer);
          });
          return;
        }

        rl.question(query, resolve);
      });
    },
    close() {
      rl.close();
    },
  };
}

/**
 * Login command
 */
export const loginCommand = new Command('login')
  .description('Login to TiltCheck')
  .option('-u, --url <url>', 'API URL', 'http://localhost:4000')
  .action(async (options) => {
    const prompts = createPromptInterface();

    try {
      const email = await prompts.question('Email: ');
      const password = await prompts.question('Password: ', { sensitive: true });
      
      const client = createClient({ baseUrl: options.url });
      const response = await client.login({ email, password });
      
      await saveToken(response.token);
      
      console.log('Successfully logged in.');
      console.log(`User: ${response.user.email}`);
      console.log(`Roles: ${response.user.roles.join(', ')}`);
    } catch (error) {
      console.error('Login failed:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    } finally {
      prompts.close();
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
      console.log('Successfully logged out.');
    } catch (error) {
      console.error('Logout failed:', error instanceof Error ? error.message : error);
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
        console.error('Not logged in. Run "tiltcheck login" first.');
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
      console.error('Failed to get user info:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
