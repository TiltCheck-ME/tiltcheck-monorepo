import { WebSocketServer } from 'ws';
import { normalizeSpinEvent } from './adapters/types.js';
import { gradeEngine } from '@tiltcheck/grading-engine';
import * as DB from './db.js';
import { eventRouter } from '@tiltcheck/event-router';
import { verify } from '@noble/ed25519';

interface SessionToken {
  sessionId: string;
  casinoId: string;
  userId: string;
  expires: number;
  signature: string;
}

const activeSessions = new Map<string, { userId: string; casinoId: string; expires: number }>();

function parseSession(raw: string): SessionToken | null {
  try {
    const obj = JSON.parse(raw);
    if (!obj.sessionId || !obj.userId || !obj.casinoId || !obj.expires || !obj.signature) return null;
    return obj as SessionToken;
  } catch {
    return null;
  }
}

function serializeForVerify(info: SessionToken) {
  return `${info.sessionId}|${info.userId}|${info.casinoId}|${info.expires}`;
}

function getPublicKey(): Uint8Array | null {
  const hex = process.env.SESSION_PUBLIC_KEY;
  if (!hex || hex.length < 64) return null;
  return Buffer.from(hex, 'hex');
}

const PORT = parseInt(process.env.WS_PORT || '8083', 10);

const wss = new WebSocketServer({ port: PORT });
console.log(`[WS-Ingest] WebSocket ingest listening on ${PORT}`);

wss.on('connection', ws => {
  ws.on('message', async (msg) => {
    try {
      const { session, casino, spin } = JSON.parse(msg.toString());
      const token = parseSession(session);
      if (!token) {
        console.warn('[WS-Ingest] Invalid session token');
        return;
      }
      if (token.expires < Date.now()) {
        console.warn('[WS-Ingest] Expired session');
        return;
      }
      // Signature verify
      const pub = getPublicKey();
      if (pub) {
        const payload = serializeForVerify(token);
        const sig = Buffer.from(token.signature, 'base64');
        const ok = await verify(sig, payload, pub);
        if (!ok) {
          console.warn('[WS-Ingest] Signature verification failed');
          return;
        }
      } else {
        console.warn('[WS-Ingest] Public key not set; skipping signature verification');
      }
      activeSessions.set(token.sessionId, { userId: token.userId, casinoId: token.casinoId, expires: token.expires });
      // Normalize spin event
      const spinRecord = normalizeSpinEvent(spin, casino);
      DB.insertSpin({
        id: spinRecord.id,
        casino_id: casino,
        ts: spinRecord.ts,
        bet: spinRecord.bet,
        win: spinRecord.payout,
        net_win: spinRecord.payout - spinRecord.bet,
        outcome: spinRecord.symbols?.join(',') || '',
      });
      // Grade and publish trust update
      const spins = DB.getRecentSpins(casino, 200);
      const engineSpins = spins.map(s => ({ ts: s.ts, netWin: s.net_win }));
      const trust = gradeEngine({ casino, spins: engineSpins });
      // Compute volatility (stddev of net wins) and RTP
      const netWins = spins.map(s => s.net_win);
      const mean = netWins.reduce((a,b)=>a+b,0)/Math.max(netWins.length,1);
      const variance = netWins.reduce((a,b)=>a+Math.pow(b-mean,2),0)/Math.max(netWins.length,1);
      const volatility = Math.sqrt(variance);
      const totalBet = spins.reduce((a,s)=>a+s.bet,0);
      const totalWin = spins.reduce((a,s)=>a+s.win,0);
      const rtp = totalBet>0 ? totalWin/totalBet : 0;
      const meanBet = spins.length ? (totalBet / spins.length) : 0;
      // Severity classification
      const baselineRtp = parseFloat(process.env.EXPECTED_RTP_BASELINE || '0.96');
      const baseScore = typeof (trust as any).anomalyScore === 'number' ? (trust as any).anomalyScore : (typeof (trust as any).severity === 'number' ? (trust as any).severity : 0);
      const rtpDriftFrac = baselineRtp > 0 ? Math.abs(rtp - baselineRtp) / baselineRtp : 0;
      let rtpAdj = 0;
      if (rtpDriftFrac > 0.10) rtpAdj += 0.15; else if (rtpDriftFrac > 0.05) rtpAdj += 0.05;
      const volRatio = meanBet > 0 ? volatility / meanBet : 0;
      let volAdj = 0;
      if (volRatio > 3) volAdj += 0.15; else if (volRatio > 1.5) volAdj += 0.05;
      let severityScore = Math.min(1, baseScore + rtpAdj + volAdj);
      const severityLabel = severityScore < 0.2 ? 'NONE'
        : severityScore < 0.4 ? 'LOW'
        : severityScore < 0.6 ? 'ELEVATED'
        : severityScore < 0.8 ? 'HIGH'
        : 'CRITICAL';
      const payload = {
        casinoId: casino,
        sessionId: token.sessionId,
        userId: token.userId,
        spinCount: spins.length,
        metrics: { 
          ...trust, 
          rtp, 
          volatility, 
          meanBet,
          rtpFormatted: (rtp*100).toFixed(2) + '%',
          volatilityFormatted: volatility.toFixed(2),
          severityScore,
          severityLabel,
          rtpDriftFrac,
          volRatio
        },
        ts: Date.now(),
      };
      void eventRouter.publish('trust.casino.updated', 'gameplay-analyzer-ws' as any, payload);
      console.log(`[WS-Ingest] Published trust.casino.updated for ${casino} spinCount=${spins.length}`);
    } catch (e) {
      console.error('[WS-Ingest] Error:', e);
    }
  });
});
