/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let supabase: any;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('⚠️ [API] Supabase credentials missing. Moderation routes will be limited.');
}

router.post('/report', async (req, res) => {
  try {
    const { targetId, moderatorId, actionType, reason, evidenceUrl } = req.body;

    if (!supabase) {
      return res.status(503).json({ error: 'Moderation service unavailable (unconfigured)' });
    }

    // Basic validation
    if (!targetId || !moderatorId || !actionType || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert into mod_logs table
    const { data, error } = await supabase
      .from('mod_logs')
      .insert([
        {
          target_user_id: targetId,
          moderator_id: moderatorId,
          action_type: actionType,
          reason: reason,
          evidence_url: evidenceUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error logging report:', error);
      return res.status(500).json({ error: 'Failed to log report' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;