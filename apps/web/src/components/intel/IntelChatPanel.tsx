/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IntelBlock } from '@tiltcheck/intel-agent';
import IntelBlockRenderer from '@/components/intel/IntelBlockRenderer';

const PROMPT_CHIPS = [
  'Is roobet a scam?',
  'List US crypto casinos',
  'List US sweeps casinos',
  'How do trust grades work?',
  'Check domain stake.com',
  'Can you level with gold coins on MetaWin?',
  'How long does Crown Coins redemption take?',
  'What is the welcome bonus on Stake.us?',
];

const STORAGE_KEY = 'tc-intel-chat-history';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  blocks?: IntelBlock[];
  content?: string;
  dataSource?: string;
  shareHref?: string;
};

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
}

function trackIntelEvent(step: string, metadata?: Record<string, string>) {
  if (typeof window === 'undefined') {
    return;
  }
  void fetch('/api/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'cta_click',
      step: `intel_${step}`,
      path: window.location.pathname,
      metadata,
    }),
  }).catch(() => {});
}

export default function IntelChatPanel({
  compact = false,
  onOpenFull,
}: {
  compact?: boolean;
  onOpenFull?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'server';
    }
    const key = 'tc-intel-session';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  }, []);

  const shareBlocks = useCallback(async (blocks: IntelBlock[], title = 'Intel share') => {
    const listBlock = blocks.find((block) => block.type === 'casino_list');
    const shareTitle = listBlock?.type === 'casino_list' ? listBlock.title : title;

    const response = await fetch('/api/intel/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: shareTitle, blocks }),
    });

    if (!response.ok) {
      setError('Share failed. Try again.');
      return null;
    }

    const payload = (await response.json()) as { href?: string };
    trackIntelEvent('share_created', { title: shareTitle });

    if (payload.href) {
      setMessages((current) => {
        const updated = [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'agent' as const,
            content: `Share link ready: ${payload.href}`,
            shareHref: payload.href,
          },
        ];
        saveHistory(updated);
        return updated;
      });
    }

    return payload.href ?? null;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    setInput('');

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    trackIntelEvent('chat_message');

    try {
      const response = await fetch('/api/intel/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });

      const payload = (await response.json()) as {
        blocks?: IntelBlock[];
        dataSource?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Intel agent unavailable.');
      }

      const agentMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        blocks: payload.blocks ?? [{ type: 'text', content: 'No response blocks returned.' }],
        dataSource: payload.dataSource,
      };

      const updated = [...nextMessages, agentMessage];
      setMessages(updated);
      saveHistory(updated);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }, [loading, messages, sessionId, shareBlocks]);

  return (
    <div className={`flex flex-col ${compact ? 'h-full' : 'min-h-[520px]'}`}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-[#283347] bg-black/20 p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Ask about casino trust, scam flags, or filtered lists. Grades come from the trust engine — not vibes.
              VIP, bonus, and redemption answers need a sourced live record — no record, no guess.
            </p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void sendMessage(chip)}
                  className="rounded-full border border-[#283347] px-3 py-1.5 text-[11px] font-bold text-gray-300 hover:border-[#17c3b2]/40 hover:text-white"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'ml-8 text-right' : 'mr-4 text-left'}
          >
            {message.role === 'user' ? (
              <p className="inline-block rounded-2xl bg-[#17c3b2]/15 px-4 py-2 text-sm text-white">{message.content}</p>
            ) : (
              <div className="space-y-3">
                {message.dataSource && (
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    source: {message.dataSource}
                  </p>
                )}
                {message.blocks && message.blocks.length > 0 ? (
                  <IntelBlockRenderer
                    blocks={message.blocks}
                    onShareList={(blocks) => void shareBlocks(blocks)}
                  />
                ) : message.content ? (
                  <p className="text-sm text-gray-200">{message.content}</p>
                ) : null}
                {message.shareHref && (
                  <a
                    href={message.shareHref}
                    className="inline-flex text-[11px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:underline"
                  >
                    Open share link
                  </a>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && <p className="text-sm text-gray-500">Pulling trust data…</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Is this casino a scam? List US crypto casinos…"
          className="flex-1 rounded-2xl border border-[#283347] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#17c3b2]"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-[#17c3b2] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      {!compact && (
        <p className="mt-3 text-[10px] text-gray-500">
          Not financial advice. Not a legal ruling. Made for Degens. By Degens.
        </p>
      )}

      {compact && onOpenFull && (
        <button
          type="button"
          onClick={onOpenFull}
          className="mt-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:underline"
        >
          Open full chat
        </button>
      )}
    </div>
  );
}
