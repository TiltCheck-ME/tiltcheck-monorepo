/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Command Handler
 * 
 * Loads and manages slash commands.
 */

import { Collection } from 'discord.js';
import type { Command, CommandCollection } from '../types.js';
import * as commands from '../commands/index.js';
import { loadCommands as dynamicLoadCommands } from '../commands/loader.js';

export class CommandHandler {
  private commands: CommandCollection;

  constructor() {
    this.commands = new Collection();
  }

  /**
   * Load all commands
   */
  loadCommands(): void {
    // Load commands from the commands directory
    const commandModules = Object.values(commands);

    let _count = 0;
    for (const command of commandModules) {
      if ('data' in command && 'execute' in command) {
        this.commands.set(command.data.name, command as Command);
        console.log(`  📄 /${command.data.name}`);
        _count++;
      }
    }

    console.log(`  └─ ${this.commands.size} commands loaded`);
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command data for registration
   */
  getCommandData() {
    return this.getAllCommands().map((cmd) => cmd.data.toJSON());
  }

  /**
   * Dynamically discover and load all command files from the commands/
   * directory using the fs.readdir-based loader. This supplements (and
   * may replace) the static `loadCommands()` barrel import approach.
   *
   * After this resolves, the internal collection is replaced with the
   * dynamically-discovered set.
   */
  async loadCommandsDynamic(): Promise<void> {
    const discovered = await dynamicLoadCommands();
    this.commands = discovered as unknown as CommandCollection;
    console.log(`  [CommandHandler] Dynamic load complete – ${this.commands.size} command(s) active`);
  }
}
