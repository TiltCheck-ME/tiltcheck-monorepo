/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

'use client';

import { useEffect, useState } from 'react';
import { DISCORD_INVITE_URL } from '@/lib/site-links';
import { shouldShowMoneyCta, type TouchGrassMode } from '@/lib/touch-grass/hub-copy';
import { mapTriviaStatus, type TriviaRoundStatus } from '@/lib/touch-grass/map-trivia-status';
import {
  nextPracticeQuestion,
  revealPracticeChoice,
  type PracticeQuestion,
  type PracticeReveal,
} from '@/lib/touch-grass/practice-deck';
import type { TriviaAnswerKey } from '@tiltcheck/shared';

type TriviaStatusJson = {
  activeGame?: {
    gameId?: string;
    settings?: {
      startTime?: number;
      theme?: string;
      prizePool?: number;
    };
  } | null;
};

async function loadTriviaStatus(): Promise<TriviaRoundStatus> {
  try {
    const res = await fetch('/arena/trivia/status');
    if (!res.ok) {
      return mapTriviaStatus({ ok: false });
    }
    const json = (await res.json()) as TriviaStatusJson;
    if (json.activeGame == null) {
      return mapTriviaStatus({ ok: true, activeGame: null });
    }
    const { gameId, settings } = json.activeGame;
    return mapTriviaStatus({
      ok: true,
      activeGame: {
        gameId: String(gameId ?? ''),
        settings: {
          startTime: Number(settings?.startTime ?? 0),
          theme: String(settings?.theme ?? ''),
          prizePool: Number(settings?.prizePool ?? 0),
        },
      },
    });
  } catch {
    return mapTriviaStatus({ ok: false });
  }
}

export default function TriviaPractice({ mode }: { mode: TouchGrassMode }) {
  const [card, setCard] = useState<PracticeQuestion | null>(null);
  const [reveal, setReveal] = useState<PracticeReveal | null>(null);
  const [status, setStatus] = useState<TriviaRoundStatus | null>(null);
  const showLiveChrome = shouldShowMoneyCta(mode) && status?.kind === 'live' && status.drop !== null;

  useEffect(() => {
    setCard(nextPracticeQuestion());
  }, []);

  useEffect(() => {
    if (!shouldShowMoneyCta(mode)) {
      return;
    }
    let cancelled = false;
    loadTriviaStatus().then((next) => {
      if (!cancelled) {
        setStatus(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function pickChoice(key: TriviaAnswerKey) {
    if (!card || reveal) {
      return;
    }
    setReveal(revealPracticeChoice(card.id, key));
  }

  function nextCard() {
    setReveal(null);
    setCard(nextPracticeQuestion(card?.id));
  }

  return (
    <div className="public-page public-page--tight text-white">
      <section className="public-page-section px-4">
        <div className="landing-shell space-y-4">
          <h1 className="text-3xl font-black uppercase tracking-tighter md:text-4xl">Practice table</h1>
          <p className="max-w-2xl text-sm text-gray-400">
            Offline questions from the bank. Pick one. Reveal. Next. Live answering still lives in Discord.
          </p>
          {showLiveChrome && status?.drop ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-[#17c3b2]/50 bg-[#17c3b2]/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#17c3b2]">
                {status.label}
              </span>
              <span className="font-mono text-sm text-[#17c3b2]">{status.drop.theme}</span>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-sm font-black uppercase"
              >
                Answer in Discord
              </a>
            </div>
          ) : null}

          {card ? (
            <article className="public-page-card space-y-4">
              <h2 className="public-page-card__title">{card.question}</h2>
              <div className="grid gap-2">
                {card.choices.map((choice) => {
                  const isAnswer = reveal?.answer === choice.key;
                  return (
                    <button
                      key={choice.key}
                      type="button"
                      onClick={() => pickChoice(choice.key)}
                      disabled={Boolean(reveal)}
                      className={`border px-3 py-2 text-left text-sm ${
                        isAnswer
                          ? 'border-[#17c3b2] text-[#17c3b2]'
                          : 'border-[#283347] text-white hover:border-[#17c3b2]'
                      }`}
                    >
                      <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
                        {choice.key}
                      </span>{' '}
                      {choice.text}
                    </button>
                  );
                })}
              </div>
              {reveal ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    {reveal.correct
                      ? 'Locked in. You actually knew that one.'
                      : `Cooked. The bank said ${reveal.answer}.`}
                  </p>
                  <p className="text-sm text-gray-500">{reveal.explanation}</p>
                  <button
                    type="button"
                    onClick={nextCard}
                    className="btn btn-primary text-sm font-black uppercase"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </article>
          ) : (
            <p className="font-mono text-sm text-gray-500">Dealing a question.</p>
          )}
        </div>
      </section>
    </div>
  );
}
