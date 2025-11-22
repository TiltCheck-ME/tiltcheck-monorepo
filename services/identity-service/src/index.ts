import Fastify from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';
import formBody from '@fastify/formbody';
import rateLimit from '@fastify/rate-limit';
import { registerRoutes } from './routes.js';

const PORT = parseInt(process.env.IDENTITY_PORT || '8090', 10);

async function start() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(formBody);
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

  await registerRoutes(app);
  await app.register(fastifyStatic, {
    root: path.resolve('services/identity-service/public'),
    prefix: '/public/',
  });
  app.get('/verify', async (_req, reply) => {
    return reply.sendFile('verify.html');
  });

  app.get('/health', async () => ({ service: 'identity-service', ok: true }));

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Identity Service listening on ${PORT}`);
  } catch (e) {
    app.log.error(e);
    process.exit(1);
  }
}

start();
