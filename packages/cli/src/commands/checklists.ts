/**
 * Checklist commands (example protected endpoint)
 */

import { Command } from 'commander';
import { loadToken } from '../auth.js';

/**
 * List checklists command
 */
export const checklistsCommand = new Command('checklists')
  .description('Manage checklists')
  .action(async () => {
    try {
      const token = await loadToken();
      if (!token) {
        console.error('✗ Not logged in. Run "tiltcheck login" first.');
        process.exit(1);
      }
      
      // This would call a protected API endpoint
      console.log('✓ Checklists feature requires authentication.');
      console.log('  Token present:', token ? 'Yes' : 'No');
      console.log('\nThis is a placeholder for a protected checklist endpoint.');
      console.log('In a real implementation, this would call:');
      console.log('  GET /api/checklists with Authorization: Bearer <token>');
    } catch (error) {
      console.error('✗ Failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
