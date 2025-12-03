/**
 * @tiltcheck/auth - Solana Signature Verification Module
 * Verify Solana wallet signatures for authentication
 */

import { verify } from '@noble/ed25519';
import bs58 from 'bs58';
import type { 
  SolanaSignatureRequest, 
  SolanaVerifyResult, 
  SolanaSignInMessage 
} from './types.js';

/**
 * Verify a Solana signature
 */
export async function verifySolanaSignature(
  request: SolanaSignatureRequest
): Promise<SolanaVerifyResult> {
  try {
    const { message, signature, publicKey } = request;
    
    // Decode the signature and public key from base58
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    
    // Encode the message as bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Verify the signature
    const isValid = await verify(signatureBytes, messageBytes, publicKeyBytes);
    
    if (isValid) {
      return {
        valid: true,
        publicKey,
      };
    } else {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signature verification failed';
    return {
      valid: false,
      error: message,
    };
  }
}

/**
 * Create a sign-in message following SIWS (Sign-In With Solana) format
 */
export function createSignInMessage(params: {
  domain: string;
  address: string;
  statement?: string;
  nonce?: string;
  issuedAt?: Date;
  expirationTime?: Date;
  requestId?: string;
  chainId?: string;
  resources?: string[];
}): SolanaSignInMessage {
  const nonce = params.nonce || generateNonce();
  const issuedAt = params.issuedAt || new Date();
  
  return {
    domain: params.domain,
    address: params.address,
    statement: params.statement || 'Sign in to TiltCheck',
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: params.expirationTime?.toISOString(),
    requestId: params.requestId,
    chainId: params.chainId,
    resources: params.resources,
  };
}

/**
 * Format a sign-in message to the standard string format
 */
export function formatSignInMessage(message: SolanaSignInMessage): string {
  const lines: string[] = [
    `${message.domain} wants you to sign in with your Solana account:`,
    message.address,
    '',
    message.statement,
    '',
  ];
  
  if (message.requestId) {
    lines.push(`Request ID: ${message.requestId}`);
  }
  
  if (message.chainId) {
    lines.push(`Chain ID: ${message.chainId}`);
  }
  
  lines.push(`Nonce: ${message.nonce}`);
  lines.push(`Issued At: ${message.issuedAt}`);
  
  if (message.expirationTime) {
    lines.push(`Expiration Time: ${message.expirationTime}`);
  }
  
  if (message.resources && message.resources.length > 0) {
    lines.push('Resources:');
    message.resources.forEach((resource) => {
      lines.push(`- ${resource}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Parse a sign-in message string back to structured format
 */
export function parseSignInMessage(messageStr: string): SolanaSignInMessage | null {
  try {
    const lines = messageStr.split('\n');
    
    // Extract domain from first line
    const domainMatch = lines[0]?.match(/^(.+) wants you to sign in/);
    if (!domainMatch) return null;
    
    const domain = domainMatch[1];
    const address = lines[1]?.trim();
    
    if (!address) return null;
    
    // Find statement (between address and key-value pairs)
    let statement = '';
    let lineIndex = 3;
    while (lineIndex < lines.length && !lines[lineIndex]?.includes(':')) {
      if (lines[lineIndex]?.trim()) {
        statement = lines[lineIndex].trim();
      }
      lineIndex++;
    }
    
    // Parse key-value pairs
    const parsed: Partial<SolanaSignInMessage> = { domain, address, statement };
    const resources: string[] = [];
    let inResources = false;
    
    for (let i = lineIndex; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      if (inResources) {
        if (line.startsWith('-')) {
          resources.push(line.substring(1).trim());
        }
        continue;
      }
      
      if (line === 'Resources:') {
        inResources = true;
        continue;
      }
      
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '');
      const value = line.substring(colonIndex + 1).trim();
      
      switch (key) {
        case 'nonce':
          parsed.nonce = value;
          break;
        case 'issuedat':
          parsed.issuedAt = value;
          break;
        case 'expirationtime':
          parsed.expirationTime = value;
          break;
        case 'requestid':
          parsed.requestId = value;
          break;
        case 'chainid':
          parsed.chainId = value;
          break;
      }
    }
    
    if (resources.length > 0) {
      parsed.resources = resources;
    }
    
    if (!parsed.nonce || !parsed.issuedAt) {
      return null;
    }
    
    return parsed as SolanaSignInMessage;
  } catch {
    return null;
  }
}

/**
 * Validate a sign-in message hasn't expired
 */
export function validateSignInMessage(
  message: SolanaSignInMessage,
  options: {
    maxAgeMs?: number;
    allowedDomains?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxAgeMs = 5 * 60 * 1000, allowedDomains } = options;
  
  // Check domain if specified
  if (allowedDomains && !allowedDomains.includes(message.domain)) {
    return { valid: false, error: 'Invalid domain' };
  }
  
  // Check expiration time if specified
  if (message.expirationTime) {
    const expiration = new Date(message.expirationTime);
    if (expiration < new Date()) {
      return { valid: false, error: 'Message has expired' };
    }
  }
  
  // Check issued at time
  const issuedAt = new Date(message.issuedAt);
  const now = new Date();
  
  if (issuedAt > now) {
    return { valid: false, error: 'Message issued in the future' };
  }
  
  if (now.getTime() - issuedAt.getTime() > maxAgeMs) {
    return { valid: false, error: 'Message is too old' };
  }
  
  return { valid: true };
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Full Solana sign-in verification flow
 */
export async function verifySolanaSignIn(
  request: SolanaSignatureRequest,
  options: {
    maxAgeMs?: number;
    allowedDomains?: string[];
  } = {}
): Promise<SolanaVerifyResult> {
  // Parse the message
  const message = parseSignInMessage(request.message);
  
  if (!message) {
    return { valid: false, error: 'Invalid message format' };
  }
  
  // Validate the message
  const validation = validateSignInMessage(message, options);
  
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }
  
  // Check that the address in the message matches the public key
  if (message.address !== request.publicKey) {
    return { valid: false, error: 'Address mismatch' };
  }
  
  // Verify the signature
  return verifySolanaSignature(request);
}

export type { SolanaSignatureRequest, SolanaVerifyResult, SolanaSignInMessage };
