// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export interface OnboardingStatus {
  isOnboarded: boolean;
  riskLevel: string | null;
  hasAcceptedTerms: boolean;
  preferences: {
    cooldownEnabled: boolean;
    voiceInterventionEnabled: boolean;
    dailyLimit: number | null;
    notifications: {
      tips: boolean;
      trivia: boolean;
      promos: boolean;
    };
  };
}

const DEFAULT_STATUS: OnboardingStatus = {
  isOnboarded: false,
  riskLevel: null,
  hasAcceptedTerms: false,
  preferences: {
    cooldownEnabled: true,
    voiceInterventionEnabled: false,
    dailyLimit: null,
    notifications: { tips: true, trivia: true, promos: false },
  },
};

export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${apiBase}/user/onboarding`, { credentials: 'include', headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStatus({
            isOnboarded: Boolean(data.isOnboarded),
            riskLevel: data.riskLevel ?? null,
            hasAcceptedTerms: Boolean(data.hasAcceptedTerms),
            preferences: {
              cooldownEnabled: data.preferences?.cooldownEnabled ?? true,
              voiceInterventionEnabled: data.preferences?.voiceInterventionEnabled ?? false,
              dailyLimit: data.preferences?.dailyLimit ?? null,
              notifications: {
                tips: data.preferences?.notifications?.tips ?? true,
                trivia: data.preferences?.notifications?.trivia ?? true,
                promos: data.preferences?.notifications?.promos ?? false,
              },
            },
          });
        }
      })
      .catch(() => setError('Failed to load onboarding status'))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  return { status, loading: authLoading || loading, error, user };
}

export async function submitOnboarding(payload: {
  isOnboarded?: boolean;
  riskLevel?: string;
  hasAcceptedTerms?: boolean;
  preferences?: Partial<OnboardingStatus['preferences']>;
}): Promise<{ success: boolean }> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${apiBase}/user/onboarding`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to save onboarding');
  return res.json();
}
