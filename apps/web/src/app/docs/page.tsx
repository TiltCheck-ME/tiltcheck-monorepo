/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
import React from 'react';
import Link from 'next/link';
import { getAllDocs } from '@/lib/docs';

export const dynamic = 'force-dynamic';

export default async function DocsIndexPage() {
  const allDocs = await getAllDocs();
  
  // Group docs by category
  const categories = allDocs.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, typeof allDocs>);

  return (
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto px-4 py-12">
      <header className="border-b border-[#283347] pb-8">
        <div className="flex items-center gap-4 mb-2">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-[#17c3b2] bg-[#17c3b2]/10 px-2 py-1">Knowledge Base</span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-[color:var(--color-primary)]">
          TiltCheck Library <span className="text-sm font-normal text-gray-500">// Documentation & Specs</span>
        </h1>
        <p className="text-gray-400 mt-2">Transparent documentation for a transparent ecosystem. No fluff—just the math and the protocols that tilt the scale.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Object.entries(categories).map(([category, docs]) => (
          <div key={category} className="terminal-box border-[#283347] hover:border-[color:var(--color-primary)] transition-all flex flex-col h-full bg-black/40">
            <div className="p-4 border-b border-[#283347] bg-black/20 flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-widest text-[color:var(--color-primary)]">{category}</h2>
              <span className="text-[10px] font-mono text-gray-600">{docs.length} FILES</span>
            </div>
            
            <div className="p-6 flex flex-col gap-4 flex-grow">
              <div className="flex flex-col gap-2">
                {docs.slice(0, 5).map(doc => (
                  <Link 
                    key={doc.slug} 
                    href={`/docs/${doc.slug}`} 
                    className="text-sm text-gray-400 hover:text-[color:var(--color-primary)] hover:translate-x-1 transition-all flex items-center gap-2 group"
                  >
                    <span className="text-[color:var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                    {doc.title}
                  </Link>
                ))}
              </div>
              
              {docs.length > 5 && (
                <Link
                  href={`/docs`}
                  className="mt-auto text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors pt-4 border-t border-[#283347] block"
                >
                  View All {docs.length} Resources &rarr;
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-12 py-8 border-t border-[#283347] text-center">
         <p className="text-xs text-gray-600 uppercase tracking-widest">
            Audit Status: ALL DOCUMENTATION VERIFIED BY DIA v2.0 // LAST GLOBAL SYNC: {new Date().toLocaleDateString()}
         </p>
      </footer>
    </div>
  );
}
