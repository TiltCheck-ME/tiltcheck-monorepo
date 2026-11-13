// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Bluff prompts. No AI at runtime.
// - 'dad': the five fallback prompts from TiltCheck-ME/DegensAgainstDecency
//   (src/AICardGenerator.js, getFallbackTwoTruthsPrompts), text unchanged.
// - 'tg': new, original TiltCheck prompts.
// Rule: no money mechanics in the copy (tests/no-money.test.ts checks every prompt).

export interface BluffPrompt {
  id: string;
  text: string;
  src: 'dad' | 'tg';
}

export const BLUFF_PROMPTS: readonly BluffPrompt[] = [
  // from DegensAgainstDecency getFallbackTwoTruthsPrompts
  { id: 'd1', src: 'dad', text: "Tell us about an unusual food you've eaten" },
  { id: 'd2', src: 'dad', text: 'Share a weird talent or skill you have' },
  { id: 'd3', src: 'dad', text: 'Describe an awkward encounter with a celebrity' },
  { id: 'd4', src: 'dad', text: "Tell us about a strange place you've been" },
  { id: 'd5', src: 'dad', text: 'Share a funny childhood misconception' },
  // new
  { id: 't01', src: 'tg', text: "Something you've done at 3 AM that you'd only admit to strangers" },
  { id: 't02', src: 'tg', text: 'Your most chaotic group chat moment' },
  { id: 't03', src: 'tg', text: "A food opinion you'd defend under oath" },
  { id: 't04', src: 'tg', text: 'A time you were confidently, publicly wrong' },
  { id: 't05', src: 'tg', text: 'A skill you picked up for no good reason' },
  { id: 't06', src: 'tg', text: 'Something you broke and never told anyone about' },
  { id: 't07', src: 'tg', text: "The worst job you've had, or nearly had" },
  { id: 't08', src: 'tg', text: 'A trip that went sideways' },
  { id: 't09', src: 'tg', text: 'Your most unhinged impulse decision' },
  { id: 't10', src: 'tg', text: 'A time a stranger made your whole day' },
  { id: 't11', src: 'tg', text: 'A rule in your childhood home that made zero sense' },
  { id: 't12', src: 'tg', text: 'An injury with a deeply stupid backstory' },
  { id: 't13', src: 'tg', text: 'The closest you came to getting kicked out of somewhere' },
  { id: 't14', src: 'tg', text: 'A hobby you quit after one very committed week' },
  { id: 't15', src: 'tg', text: "Something you've eaten on a dare" },
  { id: 't16', src: 'tg', text: "The pettiest thing you've ever done" },
  { id: 't17', src: 'tg', text: 'A famous person you swear you saw in the wild' },
  { id: 't18', src: 'tg', text: 'A time autocorrect ruined you' },
  { id: 't19', src: 'tg', text: 'Your most dramatic haircut' },
  { id: 't20', src: 'tg', text: "A pet you had, or a pet that clearly had you" },
  { id: 't21', src: 'tg', text: "The longest you've gone without sleep, and why" },
  { id: 't22', src: 'tg', text: 'An excuse you gave a teacher that actually worked' },
  { id: 't23', src: 'tg', text: 'An event you were badly dressed for' },
  { id: 't24', src: 'tg', text: 'Your worst first day at anything' },
  { id: 't25', src: 'tg', text: "Something you own that you can't explain" },
  { id: 't26', src: 'tg', text: 'A text you sent to the wrong person' },
  { id: 't27', src: 'tg', text: 'A record you hold, however tiny' },
  { id: 't28', src: 'tg', text: 'Your most cursed kitchen experiment' },
  { id: 't29', src: 'tg', text: 'A time you got lost somewhere you should know by heart' },
  { id: 't30', src: 'tg', text: 'The last time you actually touched grass. Details.' },
  { id: 't31', src: 'tg', text: "Something you did in a voice chat that you're not proud of" },
  { id: 't32', src: 'tg', text: 'A family tradition that is a little unhinged' },
  { id: 't33', src: 'tg', text: 'A game you were weirdly, suspiciously good at' },
  { id: 't34', src: 'tg', text: 'The most useless fact you know by heart' },
];

export function bluffPromptById(id: string): BluffPrompt | undefined {
  return BLUFF_PROMPTS.find((p) => p.id === id);
}
