/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TOUCH_GRASS_HUB,
  shouldShowMoneyCta,
  type TouchGrassMode,
} from '@/lib/touch-grass/hub-copy';
import { mapTriviaStatus, type TriviaRoundStatus } from '@/lib/touch-grass/map-trivia-status';

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

export default function TouchGrassHub({ mode }: { mode: TouchGrassMode }) {
  const [status, setStatus] = useState<TriviaRoundStatus | null>(null);
  const triviaSrc = mode === 'pause' ? '/touch-grass/trivia?mode=pause' : '/touch-grass/trivia';
  const dadSrc = mode === 'pause' ? '/touch-grass/dad?mode=pause' : '/touch-grass/dad';
  const showLiveJoin = status?.kind === 'live' && shouldShowMoneyCta(mode) && status.drop !== null;

  useEffect(() => {
    let cancelled = false;
    loadTriviaStatus().then((next) => {
      if (!cancelled) {
        setStatus(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="public-page public-page--tight text-white">
      <section className="public-page-section px-4">
        <div className="landing-shell space-y-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter md:text-5xl">
            {TOUCH_GRASS_HUB.title}
          </h1>
          <p className="max-w-2xl text-lg text-gray-400">{TOUCH_GRASS_HUB.lede}</p>
          {showLiveJoin && status?.drop ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-[#17c3b2]/50 bg-[#17c3b2]/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#17c3b2]">
                LIVE
              </span>
              <span className="font-mono text-sm uppercase tracking-widest text-[#17c3b2]">
                {status.label}
              </span>
              <Link
                href={status.drop.joinHref}
                className="btn btn-primary text-sm font-black uppercase"
              >
                Open table
              </Link>
            </div>
          ) : (
            <p className="font-mono text-sm text-gray-500">
              {status?.kind === 'idle' ? TOUCH_GRASS_HUB.idleSoon : status?.label ?? ''}
            </p>
          )}
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="public-page-card space-y-4">
            <h2 className="public-page-card__title">{TOUCH_GRASS_HUB.triviaPane}</h2>
            <iframe
              src={triviaSrc}
              title={TOUCH_GRASS_HUB.triviaPane}
              className="h-[28rem] w-full border border-[#283347] bg-[#0a0c10]"
            />
          </article>
          <article className="public-page-card space-y-4">
            <h2 className="public-page-card__title">{TOUCH_GRASS_HUB.dadPane}</h2>
            <p className="public-page-card__copy">{TOUCH_GRASS_HUB.dadDiscordOnly}</p>
            <iframe
              src={dadSrc}
              title={TOUCH_GRASS_HUB.dadPane}
              className="h-[28rem] w-full border border-[#283347] bg-[#0a0c10]"
            />
          </article>
        </div>
      </section>
    </div>
  );
}
