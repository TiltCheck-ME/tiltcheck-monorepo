/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { Router } from 'express';
import { aiGateway } from '@tiltcheck/ai-gateway';

const router = Router();

// Generic AI processing endpoint
router.post('/process', async (req, res) => {
    try {
        const response = await aiGateway.process(req.body);
        res.json(response);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// App-specific shortcuts
const apps = ['survey-matching', 'card-generation', 'moderation', 'tilt-detection', 'nl-commands', 'recommendations', 'support'];

apps.forEach(app => {
    router.post(`/${app}`, async (req, res) => {
        try {
            const response = await aiGateway.process({ application: app, ...req.body });
            res.json(response);
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

export { router as aiRouter };
