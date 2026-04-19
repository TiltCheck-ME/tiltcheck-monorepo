// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

const DEFAULT_PAID_PROVIDERS = ['gemini', 'groq', 'openai', 'openrouter'];
const PROFILE_MAP = {
  'local-only': ['ollama'],
  'free-tier': ['huggingface', 'ollama'],
  'balanced': ['groq', 'huggingface', 'gemini', 'ollama', 'openai'],
  'paid': ['groq', 'huggingface', 'gemini', 'ollama', 'openai', 'openrouter'],
};

function parseProviderList(value, fallback = []) {
  if (!value || !String(value).trim()) return [...fallback];
  return String(value)
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getRequestedProvider(defaultProvider) {
  return (process.env.PROVIDER || process.env.AI_PROVIDER || defaultProvider).toLowerCase();
}

export function getProviderPolicy(providers) {
  const profile = (process.env.AI_PROVIDER_PROFILE || 'free-tier').toLowerCase();
  const disablePaidProviders = process.env.AI_DISABLE_PAID_PROVIDERS === 'true';
  const paidProviders = parseProviderList(process.env.AI_PAID_PROVIDERS, DEFAULT_PAID_PROVIDERS);
  const allowedProvidersOverride = parseProviderList(process.env.AI_ALLOWED_PROVIDERS);
  const blockedProviders = parseProviderList(process.env.AI_BLOCKED_PROVIDERS);
  const availableProviders = Object.keys(providers);

  let allowedProviders = profile === 'custom'
    ? allowedProvidersOverride
    : [...(PROFILE_MAP[profile] || PROFILE_MAP.balanced)];

  if (allowedProvidersOverride.length > 0 && profile !== 'custom') {
    allowedProviders = allowedProviders.filter((provider) => allowedProvidersOverride.includes(provider));
  }

  if (disablePaidProviders) {
    allowedProviders = allowedProviders.filter((provider) => !paidProviders.includes(provider));
  }

  if (blockedProviders.length > 0) {
    allowedProviders = allowedProviders.filter((provider) => !blockedProviders.includes(provider));
  }

  return {
    profile,
    disablePaidProviders,
    paidProviders,
    blockedProviders,
    allowedProviders: allowedProviders.filter((provider) => availableProviders.includes(provider)),
  };
}

export function getFallbackProviders(primaryKey, providers) {
  const policy = getProviderPolicy(providers);
  const requested = primaryKey === 'all'
    ? Object.keys(providers)
    : [primaryKey, ...Object.keys(providers).filter((key) => key !== primaryKey)];
  const allowedSet = new Set(policy.allowedProviders);

  return {
    policy,
    providers: requested
      .filter((key) => allowedSet.has(key))
      .map((key) => ({ key, ...providers[key] })),
  };
}
