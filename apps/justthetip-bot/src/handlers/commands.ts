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

export class CommandHandler {
  private commands: CommandCollection;

  constructor() {
    this.commands = new Collection();
  }

  loadCommands(): void {
    const commandModules = Object.values(commands);

    for (const command of commandModules) {
      if ('data' in command && 'execute' in command) {
        this.commands.set(command.data.name, command as Command);
        console.log(`[CommandHandler] Loaded command: ${command.data.name}`);
      }
    }

    console.log(`[CommandHandler] Loaded ${this.commands.size} commands`);
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandData() {
    return this.getAllCommands().map((cmd) => cmd.data.toJSON());
  }
}
