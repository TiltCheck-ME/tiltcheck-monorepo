/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { API_BASE } from './constants.js';

export async function apiCall(endpoint: string, options: any = {}, auth: { demoMode: boolean, authToken: string | null }) {
  if (auth.demoMode) {
    return mockApiCall(endpoint, options);
  }
  
  const headers: any = { 'Content-Type': 'application/json' };
  if (auth.authToken) headers['Authorization'] = `Bearer ${auth.authToken}`;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { error: 'Network issue. Try again.' };
  }
}

function mockApiCall(endpoint: string, _options: any = {}) {
  const now = Date.now();

  if (endpoint.startsWith('/security/scan-url')) {
    return {
      success: true,
      scan: {
        isSafe: true,
        trustScore: 92,
        details: 'Mock demo result: no obvious risk indicators.',
      },
    };
  }

  if (endpoint.startsWith('/safety/report')) {
    return { success: true, id: `demo-report-${now}` };
  }

  if (endpoint.startsWith('/safety/signals/recent')) {
      return {
          success: true,
          signals: [
              { type: 'payout_change', casino: 'stake.us', details: 'Delayed payouts reported.' },
              { type: 'rtp_change', casino: 'roobet.com', details: 'RTP seems lower than usual.' }
          ]
      }
  }

  return { success: true };
}
