/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
import React from 'react';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDocBySlug, getAllDocs } from '@/lib/docs';
import Link from 'next/link';
import DocsGate from '@/components/DocsGate';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string[] }>;
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const docSlug = slug.join('/');
  const doc = await getDocBySlug(docSlug);
  const allDocs = await getAllDocs();

  if (!doc) {
    notFound();
  }

  // Sidebar navigation - group by category
  const categories = allDocs.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {} as Record<string, typeof allDocs>);

  // Define sensitivity criteria
  const sensitiveFolders = ['security', 'ops', 'governance', 'legal'];
  const sensitiveKeywords = ['ARCHITECTURE', 'BLUEPRINT', 'RUNBOOK', 'PRODUCTION', 'SETUP'];
  
  const isSensitive = sensitiveFolders.includes(doc.category.toLowerCase()) || 
                      sensitiveKeywords.some(kw => docSlug.toUpperCase().includes(kw));

  return (
    <div className="flex min-h-screen bg-black/90">
      {/* Sidebar Navigation */}
      <aside className="w-80 border-r border-[#283347] hidden md:block overflow-y-auto p-6 fixed top-24 bottom-0">
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d946ef] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d946ef] animate-pulse"></span>
                TiltCheck Docs
            </h3>
            <div className="flex flex-col gap-1 text-sm font-semibold uppercase tracking-tight text-[color:var(--color-primary)]">
                <Link href="/docs" className="hover:translate-x-1 transition-all">← Back to Index</Link>
            </div>
          </div>

          {Object.entries(categories).map(([category, docs]) => (
            <div key={category}>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-[#283347] pb-1">{category}</h4>
              <nav className="flex flex-col gap-1">
                {docs.map(d => (
                  <Link 
                    key={d.slug} 
                    href={`/docs/${d.slug}`} 
                    className={`text-xs p-2 rounded transition-all ${d.slug === docSlug ? 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border-l-2 border-[color:var(--color-primary)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {d.title}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-80 p-8 pt-24 max-w-5xl mx-auto w-full">
        <article className="prose prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-[color:var(--color-primary)] prose-code:text-[#d946ef] prose-code:bg-[#d946ef]/10 prose-code:p-1 prose-code:rounded prose-pre:bg-black/40 prose-pre:border prose-pre:border-[#283347] prose-img:rounded-lg">
          <header className="mb-12 border-b border-[#283347] pb-8">
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 mb-4 tracking-widest uppercase">
                <span>DOC_ID: {doc.slug.toUpperCase()}</span>
                <span>//</span>
                <span>CATEGORY: {doc.category}</span>
                {isSensitive && (
                  <span className="ml-auto text-[#d946ef] border border-[#d946ef]/50 px-2 py-0.5 rounded">RESTRICTED</span>
                )}
            </div>
            <h1 className="text-5xl mb-4 tracking-tighter text-white">
              {doc.title}
            </h1>
            {doc.description && <p className="text-xl text-gray-400 leading-relaxed font-medium">{doc.description}</p>}
          </header>

          <section className="docs-content">
            <DocsGate isSensitive={isSensitive}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {doc.content}
              </ReactMarkdown>
            </DocsGate>
          </section>
        </article>
      </main>
    </div>
  );
}
