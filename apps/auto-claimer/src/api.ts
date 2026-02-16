/**
 * API client for Auto-Claimer backend
 */

import type {
  ClaimStatus,
  ClaimHistory,
  AvailableCode,
  SubmitApiKeyResponse,
} from './types.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Submit user's Stake API key
 */
export async function submitApiKey(apiKey: string): Promise<SubmitApiKeyResponse> {
  const response = await fetch(`${API_BASE_URL}/claim/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit API key');
  }

  return response.json();
}

/**
 * Get claim status for a user
 */
export async function getClaimStatus(userId: string): Promise<ClaimStatus> {
  const response = await fetch(`${API_BASE_URL}/claim/status/${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch status');
  }

  return response.json();
}

/**
 * Get claim history for a user
 */
export async function getClaimHistory(
  userId: string,
  limit: number = 50,
  statusFilter?: string
): Promise<ClaimHistory> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(statusFilter && { status: statusFilter }),
  });

  const response = await fetch(
    `${API_BASE_URL}/claim/history/${userId}?${params}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch history');
  }

  return response.json();
}

/**
 * Get available codes
 */
export async function getAvailableCodes(): Promise<AvailableCode[]> {
  const response = await fetch(`${API_BASE_URL}/claim/codes`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch codes');
  }

  const data = await response.json();
  return data.codes;
}

/**
 * Delete user data
 */
export async function deleteUserData(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/claim/user/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete user data');
  }
}
