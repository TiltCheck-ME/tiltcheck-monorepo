import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getProfile, addWallet, setEmail, addTrustSignal, acceptLegal, linkMagicIssuer } from './store.js';
import { TERMS_VERSION, PRIVACY_VERSION } from './config.js';
import fs from 'fs';
import path from 'path';

const TERMS_PATH = path.resolve('docs/legal/TERMS_OF_SERVICE.md');
const PRIVACY_PATH = path.resolve('docs/legal/PRIVACY_POLICY.md');

export async function registerRoutes(app: FastifyInstance) {
  app.get('/identity/:discordId', async (req, reply) => {
    const { discordId } = req.params as any;
    return getProfile(discordId);
  });

  app.post('/identity/:discordId/wallet', async (req, reply) => {
    const { discordId } = req.params as any;
    const body = z.object({ type: z.string(), address: z.string() }).parse(req.body);
    return addWallet(discordId, body.type, body.address);
  });

  app.post('/identity/:discordId/email', async (req, reply) => {
    const { discordId } = req.params as any;
    const body = z.object({ email: z.string().email() }).parse(req.body);
    return setEmail(discordId, body.email);
  });

  app.post('/identity/:discordId/trust-signal', async (req, reply) => {
    const { discordId } = req.params as any;
    const body = z.object({ source: z.string(), metric: z.string(), value: z.number(), weight: z.number().min(0).max(1) }).parse(req.body);
    return addTrustSignal(discordId, body.source, body.metric, body.value, body.weight);
  });

  app.post('/identity/:discordId/accept-legal', async (req, reply) => {
    const { discordId } = req.params as any;
    const body = z.object({ termsVersion: z.string().optional(), privacyVersion: z.string().optional() }).parse(req.body);
    const tv = body.termsVersion || TERMS_VERSION;
    const pv = body.privacyVersion || PRIVACY_VERSION;
    return acceptLegal(discordId, tv, pv);
  });

  app.post('/identity/:discordId/magic-link', async (req, reply) => {
    const { discordId } = req.params as any;
    const body = z.object({ issuer: z.string() }).parse(req.body);
    return linkMagicIssuer(discordId, body.issuer);
  });

  app.get('/legal/terms', async () => {
    try { return fs.readFileSync(TERMS_PATH, 'utf-8'); } catch { return 'Terms not found'; }
  });

  app.get('/legal/privacy', async () => {
    try { return fs.readFileSync(PRIVACY_PATH, 'utf-8'); } catch { return 'Privacy policy not found'; }
  });
}
