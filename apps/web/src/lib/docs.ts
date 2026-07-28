/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Resolve monorepo docs/ whether cwd is repo root (Docker standalone)
 * or apps/web (local `pnpm -C apps/web dev`).
 */
function resolveDocsRoot(): string {
  const fromEnv = process.env.DOCS_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const candidates = [
    path.join(process.cwd(), 'docs'),
    path.join(process.cwd(), '..', '..', 'docs'),
    path.resolve(process.cwd(), 'apps', 'web', '..', '..', 'docs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

const ROOT_DOCS_PATH = resolveDocsRoot();

/** Folders that must not appear in the public /docs index or slug fetch. */
const PRIVATE_DOC_PREFIXES = [
  'migration/',
  'migrations/',
  'security/',
  'ops/',
  'governance/',
  'legal/',
  'history/',
  'internal/',
];

function isPrivateDocSlug(slug: string): boolean {
  const normalized = slug.replace(/\\/g, '/');
  if (normalized.includes('..')) return true;
  return PRIVATE_DOC_PREFIXES.some(
    (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
  );
}

function resolveSafeDocPath(slug: string): string | null {
  if (!slug || slug.includes('\0') || slug.includes('..')) return null;
  const normalizedSlug = slug.replace(/\\/g, '/').replace(/^\/+/, '');
  if (isPrivateDocSlug(normalizedSlug)) return null;

  const fullPath = path.resolve(ROOT_DOCS_PATH, `${normalizedSlug}.md`);
  const rootResolved = path.resolve(ROOT_DOCS_PATH);
  const relative = path.relative(rootResolved, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (!relative.endsWith('.md')) return null;
  return fullPath;
}

export interface DocMetadata {
  slug: string;
  title: string;
  category: string;
  lastUpdated?: string;
  description?: string;
}

export interface DocContent extends DocMetadata {
  content: string;
}

/**
 * Gets a list of all documentation files, categorized.
 */
export async function getAllDocs(): Promise<DocMetadata[]> {
  if (!fs.existsSync(ROOT_DOCS_PATH)) {
    console.warn(`[DocsService] Path not found: ${ROOT_DOCS_PATH}`);
    return [];
  }

  const files = fs.readdirSync(ROOT_DOCS_PATH, { recursive: true }) as string[];

  const docs = files
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !file.includes('node_modules'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '').replace(/\\/g, '/');
      if (isPrivateDocSlug(slug)) return null;

      const fullPath = resolveSafeDocPath(slug);
      if (!fullPath || !fs.existsSync(fullPath)) return null;

      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      const category = file.includes(path.sep) ? file.split(path.sep)[0] : 'General';

      return {
        slug,
        title: data.title || slug.split('/').pop()?.replace(/-/g, ' ') || 'Untitled',
        category: data.category || category,
        lastUpdated: data.date || '',
        description: data.description || '',
      } satisfies DocMetadata;
    })
    .filter((doc): doc is DocMetadata => doc != null);

  return docs;
}

/**
 * Fetches a single document by its slug.
 */
export async function getDocBySlug(slug: string): Promise<DocContent | null> {
  const fullPath = resolveSafeDocPath(slug);
  if (!fullPath || !fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  const normalizedSlug = slug.replace(/\\/g, '/').replace(/^\/+/, '');

  return {
    slug: normalizedSlug,
    title: data.title || normalizedSlug.split('/').pop()?.replace(/-/g, ' ') || 'Untitled',
    category: data.category || (normalizedSlug.includes('/') ? normalizedSlug.split('/')[0] : 'General'),
    content,
    lastUpdated: data.date || '',
    description: data.description || '',
  };
}
