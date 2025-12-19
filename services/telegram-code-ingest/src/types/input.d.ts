declare module 'input' {
  export function text(prompt: string): Promise<string>;
  export default { text };
}
