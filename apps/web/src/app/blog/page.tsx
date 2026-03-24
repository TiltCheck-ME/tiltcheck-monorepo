/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-24 */
import React from 'react';
import Link from 'next/link';

// Since this is a server component in Next.js, we can fetch directly or from the API
// For now, we'll hit the API we just created.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/blog';

async function getPosts() {
  try {
    const res = await fetch(API_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.data.rows : [];
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return [];
  }
}

// Define the local type for the blog post based on our DB schema
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  tags?: string[];
  created_at: string;
}

export default async function BlogPage() {
  const posts: BlogPost[] = await getPosts();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 max-w-5xl mx-auto">
      <section className="w-full mb-12">
        <h1 className="neon neon-main text-5xl mb-4" data-text="DEGEN INTEL">
          DEGEN INTEL
        </h1>
        <p className="text-muted max-w-2xl border-l-2 border-primary pl-4 py-2">
          Clinical analysis of variance, RTP anomalies, and the mathematical reality of your dopamine addiction. 
          Updated every 72 hours by TiltCheck AI. No fluff. No apologies.
        </p>
      </section>

      <div className="w-full flex flex-col gap-8">
        {posts.length === 0 ? (
          <div className="hero-body text-center p-12">
            <p>Scanning for new intel... No records found in the current session.</p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="group relative border border-border-default bg-bg-secondary p-6 hover:border-color-primary transition-all duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-color-primary uppercase tracking-widest">
                  <span>[INTEL_LOG]</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  {post.tags?.map((tag: string) => (
                    <span key={tag} className="badge-live text-[10px] py-0.5 px-2">{tag}</span>
                  ))}
                </div>
              </div>
              
              <Link href={`/blog/${post.slug}`}>
                <h2 className="text-2xl font-bold mb-3 group-hover:text-color-primary transition-colors cursor-pointer uppercase tracking-tight">
                  {post.title}
                </h2>
              </Link>
              
              <p className="text-text-secondary line-clamp-2 mb-6 font-sans leading-relaxed">
                {post.excerpt || post.content.substring(0, 160) + '...'}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-mono">AUTHOR: {post.author}</span>
                <Link href={`/blog/${post.slug}`} className="text-xs font-bold text-color-primary hover:underline uppercase tracking-tighter">
                   READ_ANALYSIS &gt;
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      <footer className="mt-20 py-8 text-center text-xs text-text-muted opacity-50 uppercase tracking-[0.3em]">
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}
