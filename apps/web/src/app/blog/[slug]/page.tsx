/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-24 */
import React from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/blog';

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API_URL}/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    return null;
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="neon neon-main text-error" data-text="404">404</h1>
        <p className="text-muted mt-4">INTEL NOT FOUND. LINK MAY BE CORRUPTED.</p>
        <Link href="/blog" className="btn btn-secondary mt-8 uppercase tracking-widest text-xs">Return to Feed</Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 max-w-4xl mx-auto">
      <Link href="/blog" className="self-start text-xs font-bold text-color-primary hover:underline uppercase tracking-tighter mb-8 bg-bg-secondary px-3 py-1 border border-border-default">
         &lt; BACK_TO_FEED
      </Link>

      <article className="w-full">
        <header className="mb-12 border-b border-border-default pb-8">
          <div className="flex items-center gap-3 text-xs font-mono text-text-muted mb-6 uppercase tracking-widest">
            <span className="text-color-primary font-bold">LOG_ID: {post.id.substring(0, 8)}</span>
            <span>|</span>
            <span>DATE: {new Date(post.created_at).toLocaleDateString()}</span>
            <span>|</span>
            <span>AUTHOR: {post.author}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tight leading-none">
            {post.title}
          </h1>

          <div className="flex flex-wrap gap-2">
            {post.tags?.map((tag: string) => (
              <span key={tag} className="badge-live text-[10px] py-1 px-3 bg-opacity-20">{tag}</span>
            ))}
          </div>
        </header>

        {/* Content with Markdown-like styling */}
        <div className="prose prose-invert prose-tiltcheck max-w-none font-sans leading-relaxed text-text-secondary mb-20 whitespace-pre-wrap">
          {post.content}
        </div>
      </article>

      <footer className="w-full mt-20 pt-12 border-t border-border-default pb-12 text-center text-xs text-text-muted opacity-50 uppercase tracking-[0.3em] flex flex-col gap-4">
        <div>TiltCheck Intel Logging - Session-001</div>
        <div>Made for Degens. By Degens.</div>
      </footer>
    </main>
  );
}
