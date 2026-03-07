/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Returns the directory name of the current module.
 * Equivalent to __dirname in CommonJS.
 * 
 * Usage: const __dirname = getDirname(import.meta.url);
 */
export function getDirname(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl));
}

/**
 * Returns the file name of the current module.
 * Equivalent to __filename in CommonJS.
 * 
 * Usage: const __filename = getFilename(import.meta.url);
 */
export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl);
}

/**
 * Resolves a sequence of paths or path segments into an absolute path.
 * 
 * Usage: const configPath = resolvePath(getDirname(import.meta.url), 'config.json');
 */
export function resolvePath(...segments: string[]): string {
  return path.resolve(...segments);
}

/**
 * Helper to get all ESM path utilities at once for a module.
 * 
 * Usage: const { __dirname, __filename, resolve } = getHelpers(import.meta.url);
 */
export function getHelpers(importMetaUrl: string) {
  const __filename = getFilename(importMetaUrl);
  const __dirname = path.dirname(__filename);

  return {
    __filename,
    __dirname,
    resolve: (...segments: string[]) => path.resolve(__dirname, ...segments)
  };
}

// Backwards compatibility for early adopters
export const dirname = getDirname;
export const fileMeta = (metaUrl: string) => ({
  filename: getFilename(metaUrl),
  dirname: getDirname(metaUrl)
});
