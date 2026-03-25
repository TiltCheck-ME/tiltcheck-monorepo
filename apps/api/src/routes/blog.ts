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

export { router as blogRouter };
