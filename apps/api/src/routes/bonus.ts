/**
 * Bonus routes - CollectClock casino list
 */
import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const rootDir = process.env.TILTCHECK_ROOT || process.cwd();
const BONUS_DATA_PATH = path.resolve(rootDir, 'data', 'bonus-data.json');

router.get('/casinos', (_req, res) => {
  try {
    if (!fs.existsSync(BONUS_DATA_PATH)) {
      res.json({ casinos: [], source: 'missing' });
      return;
    }

    const raw = fs.readFileSync(BONUS_DATA_PATH, 'utf8');
    const data = JSON.parse(raw) as Array<{ brand?: string; url?: string }>;
    const casinos = data
      .map((item) => {
        const url = item.url || '';
        if (!url) return null;
        try {
          const host = new URL(url).hostname.replace(/^www\./, '');
          return { brand: item.brand || host, url, host };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({ casinos, source: 'bonus-data' });
  } catch (error) {
    console.error('[Bonus] Failed to load bonus-data.json', error);
    res.status(500).json({ casinos: [], error: 'FAILED_TO_LOAD_BONUS_DATA' });
  }
});

export { router as bonusRouter };
