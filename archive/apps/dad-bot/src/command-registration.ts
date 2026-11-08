// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import type { CommandHandler } from './handlers/commands.js';

const activityEntryPoint = {
  name: 'Launch Activity',
  type: 4,
  description: '',
  handler: 2,
} as const;

export function getRegisteredCommandData(commandHandler: CommandHandler) {
  return [...commandHandler.getCommandData(), activityEntryPoint];
}
