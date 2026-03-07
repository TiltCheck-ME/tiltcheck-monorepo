export type ButtonHandler = (interaction: any) => Promise<void>;

const buttonHandlers = new Map<string, ButtonHandler>();

export function registerButtonHandler(customIdPrefix: string, handler: ButtonHandler): void {
  buttonHandlers.set(customIdPrefix, handler);
}

export async function dispatchButtonInteraction(customId: string, interaction: any): Promise<boolean> {
  for (const [prefix, handler] of buttonHandlers) {
    if (customId.startsWith(prefix)) {
      await handler(interaction);
      return true;
    }
  }
  return false;
}

