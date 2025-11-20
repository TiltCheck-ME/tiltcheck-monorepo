import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Derive a directory path equivalent of __dirname in ESM modules.
 */
export function dirname(metaUrl: string): string {
  return path.dirname(fileURLToPath(metaUrl));
}

/**
 * Convenience helper returning both filename and dirname.
 */
export function fileMeta(metaUrl: string) {
  const filename = fileURLToPath(metaUrl);
  return { filename, dirname: path.dirname(filename) };
}
