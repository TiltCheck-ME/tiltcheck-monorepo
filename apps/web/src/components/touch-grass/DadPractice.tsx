/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

'use client';

import { useEffect, useState } from 'react';
import { DISCORD_INVITE_URL } from '@/lib/site-links';
import { TOUCH_GRASS_HUB } from '@/lib/touch-grass/hub-copy';
import { nextDadHand, revealDadPlay, type DadHand } from '@/lib/touch-grass/dad-deck';

export default function DadPractice() {
  const [hand, setHand] = useState<DadHand | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setHand(nextDadHand());
  }, []);

  function pickCard(card: string) {
    if (!hand || picked) {
      return;
    }
    setPicked(card);
  }

  function nextPrompt() {
    setPicked(null);
    setHand(nextDadHand(hand?.prompt));
  }

  return (
    <div className="public-page public-page--tight text-white">
      <section className="public-page-section px-4">
        <div className="landing-shell space-y-4">
          <h1 className="text-3xl font-black uppercase tracking-tighter md:text-4xl">Practice table</h1>
          <p className="max-w-2xl text-sm text-gray-400">{TOUCH_GRASS_HUB.dadDiscordOnly}</p>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex text-sm font-black uppercase"
          >
            Open in Discord
          </a>

          {hand ? (
            <article className="public-page-card space-y-4">
              <h2 className="public-page-card__title">{hand.prompt}</h2>
              <div className="grid gap-2">
                {hand.cards.map((card) => {
                  const selected = picked === card;
                  return (
                    <button
                      key={card}
                      type="button"
                      onClick={() => pickCard(card)}
                      disabled={Boolean(picked)}
                      className={`border px-3 py-2 text-left text-sm ${
                        selected
                          ? 'border-[#17c3b2] text-[#17c3b2]'
                          : 'border-[#283347] text-white hover:border-[#17c3b2]'
                      }`}
                    >
                      {card}
                    </button>
                  );
                })}
              </div>
              {picked ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">{revealDadPlay(hand.prompt, picked)}</p>
                  <p className="text-sm text-gray-500">Dry run. That is as live as this pane gets.</p>
                  <button
                    type="button"
                    onClick={nextPrompt}
                    className="btn btn-primary text-sm font-black uppercase"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </article>
          ) : (
            <p className="font-mono text-sm text-gray-500">Dealing a prompt.</p>
          )}
        </div>
      </section>
    </div>
  );
}
