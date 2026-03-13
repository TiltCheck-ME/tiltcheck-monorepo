import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { tipRouter } from './routes/tip';
import { vaultRouter } from './routes/vault';
import { rgaasRouter } from './routes/rgaas';
import { safetyRouter } from './routes/safety';
import modRouter from './routes/mod.js';
import { stripeRouter } from './routes/stripe';
import { newsletterRouter } from './routes/newsletter';
import { pricingRouter } from './routes/pricing';
import { casinoRouter } from './routes/casino';
import { bonusRouter } from './routes/bonus';
import { servicesRouter } from './routes/services';
import { affiliateRouter } from './routes/affiliate';
import { betaRouter } from './routes/beta';
import { statsRouter } from './routes/stats';

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.post('/user/wallet', userRouter);
app.use('/tip', tipRouter);
app.use('/vault', vaultRouter);
app.use('/rgaas', rgaasRouter);
app.use('/safety', safetyRouter);
app.use('/mod', modRouter);
app.use('/stripe', stripeRouter);
app.use('/newsletter', newsletterRouter);
app.use('/pricing', pricingRouter);
app.use('/casino', casinoRouter);
app.use('/bonus', bonusRouter);
app.use('/services', servicesRouter);
app.use('/affiliate', affiliateRouter);
app.use('/beta', betaRouter);
app.use('/stats', statsRouter);

export { app };
