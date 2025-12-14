#!/usr/bin/env node
/**
 * TiltCheck CLI
 * Command-line interface for TiltCheck API
 */

import { Command } from 'commander';
import { loginCommand, logoutCommand, whoamiCommand } from './commands/auth.js';
import { checklistsCommand } from './commands/checklists.js';

const program = new Command();

program
  .name('tiltcheck')
  .description('TiltCheck CLI - Manage your TiltCheck resources')
  .version('0.1.0');

// Auth commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);

// Resource commands
program.addCommand(checklistsCommand);

program.parse();
