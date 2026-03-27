/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { Router } from 'express';
import { getBlogPosts, getBlogPostBySlug } from '@tiltcheck/db';

const router = Router();

/**
 * GET /blog
 * Returns a paginated list of published blog posts
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await getBlogPosts({ limit, offset });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Blog] Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog posts',
    });
  }
});

/**
 * GET /blog/:slug
 * Returns a single blog post by its slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const post = await getBlogPostBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found',
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('[Blog] Error fetching post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog post',
    });
  }
});

import { generateNewPost } from '../services/blog-generator.js';

// ... existing routes ...

/**
 * POST /blog/generate-force
 * Triggers the AI blog generation manually (used by Cloud Scheduler)
 * Requires internal service secret for security.
 */
router.post('/generate-force', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await generateNewPost();
    res.json({ success: true, message: 'Blog generation task triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger blog generation' });
  }
});

export { router as blogRouter };
