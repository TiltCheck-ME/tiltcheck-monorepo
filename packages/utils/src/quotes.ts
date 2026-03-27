/* Copyright (c) 2026 TiltCheck. All rights reserved. */

/**
 * Shared branding quotes for the TiltCheck ecosystem.
 * Used to indicate system updates and maintain the "witty degen" persona.
 */

export const DEGEN_QUOTES = [
  "Trust everybody, but cut the cards.",
  "Casinos don't win because they're lucky. They win because they're open 24/7 and your calculator battery died at 2:17 a.m.",
  "The house always wins, unless you're the architect.",
  "A gambler never makes the same mistake twice. He makes it three or four times just to be sure.",
  "Risk is the price you pay for the chance to be right.",
  "Fortune favors the bold, but the bold usually go broke at 4 AM.",
  "What is a programmers favorite drink? Java!",
  "Zero drift. Zero mercy.",
  "Math doesn't care about your gut feeling.",
  "The machine has a memory. You have a prayer.",
  "Your P/L says 'Help me', but your eyes say 'One more spin'.",
  "The best way to double your money is to fold it in half and put it back in your pocket.",
  "Liquidations are just expensive reminders that the math is still working.",
  "Don't worry about the noise. Worry about the signal. The signal is red."
];

export function getRandomQuote(): string {
  return DEGEN_QUOTES[Math.floor(Math.random() * DEGEN_QUOTES.length)];
}
