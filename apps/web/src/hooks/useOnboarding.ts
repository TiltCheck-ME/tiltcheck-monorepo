// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export interface OnboardingStatus {
  completedSteps: string[];
  completedAt: string | null;
  isOnboarded: boolean;
  riskLevel: string | null;
  hasAcceptedTerms: boolean;
  quizScores: Record<string, number>;
  preferences: {
    cooldownEnabled: boolean;
    voiceInterventionEnabled: boolean;
    dailyLimit: number | null;
    redeemThreshold: number | null;
    notifyNftIdentityReady: boolean;
    complianceBypass: boolean;
    dataSharing: {
      messageContents: boolean;
      financialData: boolean;
      sessionTelemetry: boolean;
    };
    notifications: {
      tips: boolean;
      trivia: boolean;
      promos: boolean;
    };
  };
}

const DEFAULT_STATUS: OnboardingStatus = {
  completedSteps: [],
  completedAt: null,
  isOnboarded: false,
  riskLevel: null,
  hasAcceptedTerms: false,
  quizScores: {},
  preferences: {
    cooldownEnabled: true,
    voiceInterventionEnabled: false,
    dailyLimit: null,
    redeemThreshold: null,
    notifyNftIdentityReady: false,
    complianceBypass: false,
    dataSharing: {
      messageContents: false,
      financialData: false,
      sessionTelemetry: false,
    },
    notifications: { tips: true, trivia: true, promos: false },
  },
};

interface CanonicalOnboardingStatusResponse {
  completedSteps?: string[];
  completedAt?: string | null;
  riskLevel?: string | null;
  hasAcceptedTerms?: boolean;
  quizScores?: Record<string, number>;
  preferences?: {
    cooldownEnabled?: boolean;
    voiceInterventionEnabled?: boolean;
    dailyLimit?: number | null;
    redeemThreshold?: number | null;
    notifyNftIdentityReady?: boolean;
    complianceBypass?: boolean;
    dataSharing?: {
      messageContents?: boolean;
      financialData?: boolean;
      sessionTelemetry?: boolean;
    };
    notifications?: {
      tips?: boolean;
      trivia?: boolean;
      promos?: boolean;
    };
  };
}

export interface SubmitOnboardingPayload {
  step: 'terms' | 'quiz' | 'preferences' | 'completed';
  riskLevel?: string;
  hasAcceptedTerms?: boolean;
  quizScores?: Record<string, number>;
  preferences?: Partial<OnboardingStatus['preferences']>;
}

function buildHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function normalizeStatus(data: CanonicalOnboardingStatusResponse | null | undefined): OnboardingStatus {
  if (!data) {
    return DEFAULT_STATUS;
  }

  const completedSteps = Array.isArray(data.completedSteps)
    ? data.completedSteps.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    completedSteps,
    completedAt: data.completedAt ?? null,
    isOnboarded: completedSteps.includes('completed'),
    riskLevel: data.riskLevel ?? null,
    hasAcceptedTerms: Boolean(data.hasAcceptedTerms),
    quizScores: data.quizScores ?? {},
    preferences: {
      cooldownEnabled: data.preferences?.cooldownEnabled ?? true,
      voiceInterventionEnabled: data.preferences?.voiceInterventionEnabled ?? false,
      dailyLimit: data.preferences?.dailyLimit ?? null,
      redeemThreshold: data.preferences?.redeemThreshold ?? null,
      notifyNftIdentityReady: data.preferences?.notifyNftIdentityReady ?? false,
      complianceBypass: data.preferences?.complianceBypass ?? false,
      dataSharing: {
        messageContents: data.preferences?.dataSharing?.messageContents ?? false,
        financialData: data.preferences?.dataSharing?.financialData ?? false,
        sessionTelemetry: data.preferences?.dataSharing?.sessionTelemetry ?? false,
      },
      notifications: {
        tips: data.preferences?.notifications?.tips ?? true,
        trivia: data.preferences?.notifications?.trivia ?? true,
        promos: data.preferences?.notifications?.promos ?? false,
      },
    },
  };
}

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
    fetch(`${apiBase}/me/onboarding-status`, { credentials: 'include', headers: buildHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setStatus(normalizeStatus(data as CanonicalOnboardingStatusResponse | null));
      })
      .catch(() => setError('Failed to load onboarding status'))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  return { status, loading: authLoading || loading, error, user };
}

export async function submitOnboarding(payload: SubmitOnboardingPayload): Promise<OnboardingStatus> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
  const res = await fetch(`${apiBase}/me/onboarding-status`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to save onboarding');
  const data = await res.json() as CanonicalOnboardingStatusResponse;
  return normalizeStatus(data);
}
