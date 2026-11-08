// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
// JustTheTip Bot — Command Handler

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
        const cmdName = command.data.name;
        if (this.commands.has(cmdName)) {
          throw new Error(`Duplicate command registration detected: ${cmdName}`);
        }
        this.commands.set(cmdName, command as Command);
        console.log(`  /${cmdName}`);
      }
    }

    console.log(`  [CommandHandler] ${this.commands.size} commands loaded`);
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
