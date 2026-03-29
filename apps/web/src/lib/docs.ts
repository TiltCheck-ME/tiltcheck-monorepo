/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DOCS_DIRECTORY = path.join(process.cwd(), '../../docs'); // Relative to apps/web/src/lib/ or absolute from project root
// In Next.js Server Components, process.cwd() is the root of the monorepo if run from the root, 
// but for standalone builds we should be careful. 
// For now, let's use a path relative to the monorepo root.
const ROOT_DOCS_PATH = path.join(process.cwd(), 'docs');

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
    .filter(file => file.endsWith('.md'))
    .filter(file => !file.includes('node_modules'))
    .filter(file => !file.startsWith('migrations'))
    .map(file => {
      const fullPath = path.join(ROOT_DOCS_PATH, file);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      
      // Derive slug from filename
      const slug = file.replace(/\.md$/, '').replace(/\\/g, '/');
      const category = file.includes(path.sep) ? file.split(path.sep)[0] : 'General';

      return {
        slug,
        title: data.title || slug.split('/').pop()?.replace(/-/g, ' ') || 'Untitled',
        category: data.category || category,
        lastUpdated: data.date || '',
        description: data.description || ''
      };
    });

  return docs;
}

/**
 * Fetches a single document by its slug.
 */
export async function getDocBySlug(slug: string): Promise<DocContent | null> {
  const fullPath = path.join(ROOT_DOCS_PATH, `${slug}.md`);
  
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || slug.split('/').pop()?.replace(/-/g, ' ') || 'Untitled',
    category: data.category || (slug.includes('/') ? slug.split('/')[0] : 'General'),
    content,
    lastUpdated: data.date || '',
    description: data.description || ''
  };
}
