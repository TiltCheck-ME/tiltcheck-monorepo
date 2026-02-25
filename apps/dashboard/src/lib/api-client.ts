/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * API Client Configuration
 * Shared TiltCheck client with auth token management
 */

import { createClient, TiltCheckClient } from '@tiltcheck/shared';

// Determine API URL based on environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create singleton client instance
let clientInstance: TiltCheckClient | null = null;

/**
 * Get or create the API client instance
 */
export function getApiClient(): TiltCheckClient {
  if (!clientInstance) {
    clientInstance = createClient({
      baseUrl: API_URL,
    });
    
    // Try to load token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('tiltcheck_token');
      if (token) {
        clientInstance.setToken(token);
      }
    }
  }
  
  return clientInstance;
}

/**
 * Set auth token and save to localStorage
 */
export function setAuthToken(token: string | null): void {
  const client = getApiClient();
  client.setToken(token);
  
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('tiltcheck_token', token);
    } else {
      localStorage.removeItem('tiltcheck_token');
    }
  }
}

/**
 * Get current auth token
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tiltcheck_token');
  }
  return null;
}

/**
 * Clear auth token
 */
export function clearAuthToken(): void {
  setAuthToken(null);
}
