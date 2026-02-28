/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { Router } from 'express';
import { join } from 'path';
import fs from 'fs/promises';

const router = Router();
const DATA_DIR = join(process.cwd(), 'data/casino');
const CASINO_DATA_PATH = join(DATA_DIR, 'casinos.json');

async function loadCasinos() {
    try {
        const data = await fs.readFile(CASINO_DATA_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

router.get('/casinos', async (req, res) => {
    try {
        const casinos = await loadCasinos();
        res.json({ casinos: Object.values(casinos), count: Object.keys(casinos).length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/casinos/:id', async (req, res) => {
    try {
        const casinos = await loadCasinos();
        const casino = (casinos as any)[req.params.id];
        if (!casino) return res.status(404).json({ error: 'Casino not found' });
        res.json(casino);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { router as casinoRouter };
