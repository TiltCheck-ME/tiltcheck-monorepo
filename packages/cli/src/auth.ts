/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * CLI Authentication helpers
 * Stores and retrieves JWT tokens from ~/.tiltcheck/token
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.tiltcheck');
const TOKEN_FILE = join(CONFIG_DIR, 'token');

/**
 * Save token to disk
 */
export async function saveToken(token: string): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(TOKEN_FILE, token, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save token: ${error}`);
  }
}

/**
 * Load token from disk
 */
export async function loadToken(): Promise<string | null> {
  try {
    const token = await readFile(TOKEN_FILE, 'utf-8');
    return token.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Clear saved token
 */
export async function clearToken(): Promise<void> {
  try {
    await writeFile(TOKEN_FILE, '', 'utf-8');
  } catch (error) {
    // Ignore errors
  }
}
