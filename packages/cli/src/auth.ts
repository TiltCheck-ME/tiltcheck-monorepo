/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
/**
 * CLI Authentication helpers
 * Stores and retrieves encrypted JWT tokens from ~/.tiltcheck/token
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { chmod, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.tiltcheck');
const TOKEN_FILE = join(CONFIG_DIR, 'token');
const KEY_FILE = join(CONFIG_DIR, 'token.key');
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

type StoredToken = {
  version: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
};

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await chmod(CONFIG_DIR, 0o700).catch(() => undefined);
}

async function readOrCreateKey(): Promise<Buffer> {
  try {
    return await readKey();
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') {
      throw error;
    }

    const key = randomBytes(KEY_LENGTH);
    await writeFile(KEY_FILE, key.toString('hex'), { encoding: 'utf-8', mode: 0o600 });
    await chmod(KEY_FILE, 0o600).catch(() => undefined);
    return key;
  }
}

async function readKey(): Promise<Buffer> {
  const storedKey = (await readFile(KEY_FILE, 'utf-8')).trim();
  const key = Buffer.from(storedKey, 'hex');

  if (key.length !== KEY_LENGTH) {
    throw new Error('Stored token key is invalid.');
  }

  return key;
}

function encryptToken(token: string, key: Buffer): StoredToken {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
  };
}

function decryptToken(storedToken: StoredToken, key: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(storedToken.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(storedToken.authTag, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(storedToken.ciphertext, 'hex')),
    decipher.final(),
  ]).toString('utf-8');
}

/**
 * Save token to disk
 */
export async function saveToken(token: string): Promise<void> {
  try {
    await ensureConfigDir();
    const key = await readOrCreateKey();
    const encryptedToken = encryptToken(token, key);
    await writeFile(TOKEN_FILE, JSON.stringify(encryptedToken), { encoding: 'utf-8', mode: 0o600 });
    await chmod(TOKEN_FILE, 0o600).catch(() => undefined);
  } catch (error) {
    throw new Error(`Failed to save token: ${error}`);
  }
}

/**
 * Load token from disk
 */
export async function loadToken(): Promise<string | null> {
  try {
    const storedToken = await readFile(TOKEN_FILE, 'utf-8');
    const parsed = JSON.parse(storedToken) as Partial<StoredToken>;

    if (parsed.version === 1 && parsed.iv && parsed.authTag && parsed.ciphertext) {
      const key = await readKey();
      return decryptToken(parsed as StoredToken, key).trim();
    }

    return storedToken.trim();
  } catch (error) {
    if (error instanceof SyntaxError) {
      try {
        const legacyToken = await readFile(TOKEN_FILE, 'utf-8');
        return legacyToken.trim();
      } catch {
        return null;
      }
    }

    return null;
  }
}

/**
 * Clear saved token
 */
export async function clearToken(): Promise<void> {
  try {
    await Promise.all([
      rm(TOKEN_FILE, { force: true }),
      rm(KEY_FILE, { force: true }),
    ]);
  } catch (error) {
    // Ignore errors
  }
}
