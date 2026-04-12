// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
// TiltCheck Safety Bot — Command Handler

import { Collection } from 'discord.js';
import type { Command, CommandCollection } from '../types.js';
import * as commands from '../commands/index.js';
import { loadCommands as dynamicLoadCommands } from '../commands/loader.js';

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
          console.warn(`  [CommandHandler] Duplicate command "${cmdName}" skipped`);
          continue;
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

  async loadCommandsDynamic(): Promise<void> {
    const discovered = await dynamicLoadCommands();
    this.commands = discovered as unknown as CommandCollection;
    console.log(`  [CommandHandler] Dynamic load complete — ${this.commands.size} command(s) active`);
  }
}
