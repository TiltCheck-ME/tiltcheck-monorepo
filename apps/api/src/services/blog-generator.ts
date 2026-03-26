/* Copyright (c) 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-24 */
/**
 * Blog Generator Service
 * 
 * Automatically generates blog posts every 3 days using Ollama.
 * Adheres to TiltCheck brand laws: Direct, blunt tone; no emojis; degen-centric.
 */

import { getLatestBlogPost, createBlogPost } from '@tiltcheck/db';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/v1';
const AI_MODEL = process.env.AI_MODEL || 'llama3.2:1b';
const GENERATION_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * System prompt for TiltCheck blog generation.
 * Enforces the "Degen Laws".
 */
const BLOG_SYSTEM_PROMPT = `You are TiltCheck's lead editor. 
Your goal is to write short, data-dense, slightly ironic blog posts for millennial degens.
Tone: Direct, blunt, clinical, butStreet-savvy. No fluff. No apologies. 
NO EMOJIS. EVER.
Focus on topics like: RTP variance, bankroll management (as a survival skill, not advice), detecting casino lies, and the mathematics of avoiding tilt.
Format: Return only RAW JSON.
{
  "title": "Short punchy title",
  "slug": "url-friendly-slug",
  "excerpt": "One clinical sentence summary",
  "content": "The full post in Markdown format. Keep it under 400 words. Stick to the TiltCheck tone.",
  "tags": ["tag1", "tag2"]
}`;

/**
 * Generate a new blog post using Ollama
 */
export async function generateNewPost(): Promise<void> {
  console.log('[BlogGenerator] Starting automated generation...');

  try {
    const latest = await getLatestBlogPost();
    const now = new Date();

    if (latest && (now.getTime() - new Date(latest.created_at).getTime() < GENERATION_INTERVAL_MS)) {
      console.log('[BlogGenerator] Recent post exists. Skipping generation.');
      return;
    }

    const topics = [
      "Why your 'strategy' is just noise in the variance",
      "The math of the 96% RTP trap",
      "Bankroll survival: The 1% rule",
      "Tilt detection: Your body knows before your brain does",
      "Casino 'bonuses' are just liquidity for the house",
      "The myth of the 'hot' slot",
      "Liquidity management for the common degen",
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    console.log(`[BlogGenerator] Generating post on: ${randomTopic}`);

    const response = await fetch(`${OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: BLOG_SYSTEM_PROMPT },
          { role: 'user', content: `Write a blog post about: ${randomTopic}` }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const postData = JSON.parse(data.choices[0].message.content);

    // Final sanity check for brand laws in code (no emojis, etc.)
    const cleanContent = postData.content.replace(/[\u1F600-\u1F64F]/g, '');

    await createBlogPost({
      title: postData.title,
      slug: postData.slug + '-' + Math.floor(Math.random() * 1000), // Ensure unique
      excerpt: postData.excerpt,
      content: cleanContent,
      author: 'TiltCheck AI',
      tags: postData.tags || ['intelligence'],
    });

    console.log(`[BlogGenerator] Successfully created new post: ${postData.title}`);
  } catch (error) {
    console.error('[BlogGenerator] Failed to generate post:', error);
  }
}

/**
 * Start the generator loop
 */
export function startBlogGenerator(): void {
  // Run check on startup
  void generateNewPost();

  // Then every 6 hours check if we need to generate (to catch the 3-day window)
  setInterval(() => {
    void generateNewPost();
  }, 6 * 60 * 60 * 1000);
  
  console.log('[BlogGenerator] Background check loop started.');
}
