/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Checklist commands (protected endpoint example)
 */

import { Command } from 'commander';
import { createClient } from '@tiltcheck/shared';
import { loadToken } from '../auth.js';

/**
 * List checklists command
 */
const listCommand = new Command('list')
  .description('List all checklists')
  .option('-u, --url <url>', 'API URL', 'http://localhost:4000')
  .option('-f, --format <format>', 'Output format (json, table)', 'table')
  .action(async (options) => {
    try {
      const token = await loadToken();
      if (!token) {
        console.error('✗ Not logged in. Run "tiltcheck login" first.');
        process.exit(1);
      }

      const client = createClient({ baseUrl: options.url, token });

      // Note: Checklist API endpoint not yet implemented in client
      // This demonstrates the pattern for authenticated endpoints
      console.log('✓ Authenticated as:', (await client.me()).email);
      console.log('\n[Checklist list endpoint would be called here]');
      console.log('Endpoint: GET /api/checklists');
      console.log('Format:', options.format);
    } catch (error) {
      console.error('✗ Failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Main checklists command group
 */
export const checklistsCommand = new Command('checklists')
  .description('Manage checklists')
  .addCommand(listCommand);

