/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type FunnelEventType = 'page_view' | 'cta_click';

type FunnelPayload = {
  type: FunnelEventType;
  step: string;
  source: string;
  label?: string;
  href?: string;
  path: string;
  sessionId: string;
  metadata?: Record<string, string>;
};

const PAGE_STEPS: Record<string, { step: string; source: string }> = {
  '/': { step: 'landing_page_view', source: 'web-home' },
  '/extension': { step: 'extension_page_view', source: 'web-extension' },
  '/casinos': { step: 'casino_trust_page_view', source: 'web-casinos' },
  '/dashboard': { step: 'dashboard_handoff_view', source: 'web-dashboard' },
  '/tools/auto-vault': { step: 'vault_handoff_view', source: 'web-autovault' },
};

function getSessionId(): string {
  const existing = window.sessionStorage.getItem('tiltcheck_funnel_session_id');
  if (existing) {
    return existing;
  }

  const created = `funnel_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  window.sessionStorage.setItem('tiltcheck_funnel_session_id', created);
  return created;
}

function sendFunnelEvent(payload: FunnelPayload) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/funnel', blob);
    return;
  }

  void fetch('/api/funnel', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
    keepalive: true,
  });
}

export default function FunnelTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const config = PAGE_STEPS[pathname];
    if (!config) {
      return;
    }

    sendFunnelEvent({
      type: 'page_view',
      step: config.step,
      source: config.source,
      path: pathname,
      sessionId: getSessionId(),
    });
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const element = target.closest<HTMLElement>('[data-funnel-event]');
      if (!element) {
        return;
      }

      const href =
        element instanceof HTMLAnchorElement
          ? element.href
          : element.getAttribute('href') ?? undefined;

      sendFunnelEvent({
        type: 'cta_click',
        step: element.dataset.funnelEvent ?? 'unknown_cta_click',
        source: element.dataset.funnelSource ?? 'unknown',
        label: element.dataset.funnelLabel ?? element.textContent?.trim() ?? undefined,
        href,
        path: pathname,
        sessionId: getSessionId(),
        metadata: {
          element: element.tagName.toLowerCase(),
        },
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  return null;
}
