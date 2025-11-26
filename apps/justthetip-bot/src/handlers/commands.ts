/**
 * Command Handler
 * Loads and manages slash commands
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
        console.log(`[JTT Bot] Loaded command: ${command.data.name}`);
      }
    }

    console.log(`[JTT Bot] Loaded ${this.commands.size} commands`);
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): Command[] {
    // Use spread operator to convert Collection values to array
    return [...this.commands.values()];
  }

  getCommandCount(): number {
    return this.commands.size;
  }

  getCommandData() {
    return this.getAllCommands().map((cmd) => cmd.data.toJSON());
  }
}
