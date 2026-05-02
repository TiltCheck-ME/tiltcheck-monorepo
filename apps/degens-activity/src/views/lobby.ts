// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Lobby view — game picker

const GAMES = [
  { id: 'dad', name: 'DA&D', desc: 'Degens Against Decency. Play cards. Be terrible. Win rounds.' },
  { id: 'trivia', name: 'Trivia', desc: 'Live trivia drops. Answer fast. Last degen standing wins the pot.' },
  { id: 'jackpot', name: 'Jackpot', desc: 'Community jackpot spinner. Pool grows until someone hits.' },
] as const;

export function mount(container: HTMLElement, switchView: (view: string) => void, username: string): void {
  container.innerHTML = `
    <div class="card card--accent">
      <p class="card__eyebrow">Welcome back</p>
      <h2 class="card__title">${username}</h2>
      <p class="card__body">Pick a game. No pep talks. Just play.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.75rem;">
      ${GAMES.map(
        (g) => `
        <div class="game-pick" data-game="${g.id}">
          <p class="game-pick__name">${g.name}</p>
          <p class="game-pick__desc">${g.desc}</p>
        </div>`
      ).join('')}
    </div>
  `;

  container.querySelectorAll<HTMLElement>('.game-pick').forEach((el) => {
    el.addEventListener('click', () => {
      const game = el.dataset.game;
      if (game) switchView(game);
    });
  });
}
