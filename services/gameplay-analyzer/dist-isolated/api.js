import http from 'http';
import * as DB from './db.js';
import { verify, getPublicKey as edGetPublicKey, etc } from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
// Ensure noble ed25519 has synchronous sha512 (needed in some Node contexts)
if (!etc.sha512Sync) {
    etc.sha512Sync = (msg) => sha512(msg);
}
const PORT = parseInt(process.env.API_PORT || '7072', 10);
function parseQuery(url) {
    const idx = url.indexOf('?');
    if (idx === -1)
        return {};
    const params = new URLSearchParams(url.slice(idx + 1));
    const obj = {};
    params.forEach((v, k) => { obj[k] = v; });
    return obj;
}
export function startApiServer(casinoId) {
    const WSS_PORT = process.env.WSS_PORT || process.env.WSS_PORT_CHAIN?.split(',')[0] || '7071';
    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        const { url = '/', method } = req;
        // Lightweight HTML UI for /analyze (discord command link target)
        if (method === 'GET' && url.startsWith('/analyze')) {
            // Override content type for HTML
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            const q = parseQuery(url);
            const sessionToken = q.session || '';
            const casino = q.casino || casinoId;
            const escapedSession = sessionToken.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escapedCasino = casino.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const provisional = q.provisional === '1';
            // Token decoding (supports raw JSON or base64 of JSON)
            let tokenObj = null;
            let tokenError = null;
            function serializeForSign(o) { return `${o.sessionId}|${o.userId}|${o.casinoId}|${o.expires}`; }
            function derivePublicKey() {
                const pubHex = process.env.SESSION_PUBLIC_KEY?.trim();
                if (pubHex && pubHex.length === 64)
                    return Buffer.from(pubHex, 'hex');
                const privHex = process.env.SESSION_SIGNING_SECRET?.trim();
                if (privHex && privHex.length === 64)
                    return edGetPublicKey(Buffer.from(privHex, 'hex'));
                return null;
            }
            if (sessionToken) {
                try {
                    if (sessionToken.includes('{')) {
                        tokenObj = JSON.parse(sessionToken);
                    }
                    else {
                        const decoded = Buffer.from(sessionToken, 'base64').toString('utf8');
                        tokenObj = JSON.parse(decoded);
                    }
                    const required = ['sessionId', 'userId', 'casinoId', 'expires', 'signature'];
                    if (!required.every(k => tokenObj && tokenObj[k])) {
                        tokenError = 'Missing required token fields';
                    }
                    else if (tokenObj.expires < Date.now()) {
                        tokenError = 'Session expired';
                    }
                    else {
                        const pub = derivePublicKey();
                        if (pub) {
                            const payload = serializeForSign(tokenObj);
                            const sigBytes = Buffer.from(tokenObj.signature, 'base64');
                            let ok = false;
                            try {
                                ok = await verify(sigBytes, Buffer.from(payload, 'utf8'), pub);
                            }
                            catch {
                                ok = false;
                            }
                            if (!ok)
                                tokenError = 'Signature invalid';
                        }
                        else {
                            tokenError = 'Public key not configured';
                        }
                    }
                }
                catch (e) {
                    tokenError = 'Token parse failure';
                }
            }
            else {
                tokenError = 'No token provided';
            }
            res.writeHead(200);
            res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>TiltCheck Analyzer – ${escapedCasino}</title><style>body{font-family:system-ui;background:#0b0d10;color:#eee;margin:0;padding:0}header{padding:12px 16px;background:#12181f;border-bottom:1px solid #1e2630;position:sticky;top:0}main{padding:16px;max-width:950px;margin:0 auto}code{background:#1e2630;padding:2px 4px;border-radius:4px;font-size:12px}#metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:16px} .card{background:#12181f;padding:12px;border-radius:8px;border:1px solid #1e2630} .card h4{margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#8aa4c1} .error{color:#ff6262;margin-top:12px} a{color:#58a6ff} footer{margin-top:40px;font-size:11px;color:#566} .badge{display:inline-block;padding:2px 6px;border-radius:4px;background:#233445;font-size:11px;margin-left:4px} .prov{background:#553300;color:#ffcf70;border:1px solid #c28800;padding:10px 14px;border-radius:6px;margin:12px 0;font-size:13px;line-height:1.4} .prov strong{color:#ffc23c} .anoms{margin-top:28px} .anoms h3{margin:0 0 8px;font-size:15px;letter-spacing:.5px;color:#9fb6d3} .anom-item{background:#12181f;border:1px solid #1e2630;padding:8px 10px;border-radius:6px;margin-bottom:6px;font-size:12px;line-height:1.4} .anom-item strong{color:#ffb347}</style></head><body><header><strong>TiltCheck Gameplay Analyzer</strong> <span style="opacity:.7">Casino:</span> <code>${escapedCasino}</code>${provisional ? '<span class="badge" style="background:#7a4f00;color:#ffd07a">provisional</span>' : ''}</header><main>${provisional ? '<div class="prov"><strong>Provisional Tracking:</strong> Limited metrics + anomaly detail gating. Counts only until approval.</div>' : ''}${tokenError ? `<div class="error">🔒 Session Invalid: ${tokenError}</div>` : `<p>Session User: <code>${(tokenObj?.userId || 'n/a')}</code> Expires <code>${tokenObj ? `<t:${Math.floor(tokenObj.expires / 1000)}:R>` : 'n/a'}</code></p>`}<p>Live metrics stream below. Anomalies update with broadcasts.</p><div id="status">Connecting WebSocket...</div><div id="metrics"></div><div class="anoms" id="anoms"><h3>Anomalies</h3><div id="anomList"></div></div><div class="error" id="error" style="display:none"></div><footer>Prototype UI &middot; Auto-refresh every 5s.</footer><script>window.__ENV={WSS_PORT:'${WSS_PORT}'};const provisional=${provisional ? 'true' : 'false'};const wsProto=location.protocol==='https:'?'wss':'ws';const wssPort=window.__ENV.WSS_PORT||'7071';const ws=new WebSocket(wsProto+'://'+location.host.replace(/:\\d+$/,'')+':'+wssPort);const statusEl=document.getElementById('status');const metricsEl=document.getElementById('metrics');const errorEl=document.getElementById('error');const anomList=document.getElementById('anomList');function renderMetrics(m){metricsEl.innerHTML='';const baseCards=[{t:'Spins',v:m.metrics.count},{t:'Total Bet',v:m.metrics.totalBet.toFixed(2)},{t:'Total Win',v:m.metrics.totalWin.toFixed(2)},{t:'RTP',v:(m.metrics.rtp*100).toFixed(2)+'%'},{t:'Seeds',v:m.seeds.count}];const advCards=[{t:'Window Size',v:m.rtpWindow.size},{t:'Mean NetWin',v:m.rtpWindow.meanNetWin.toFixed(4)},{t:'Deviation Ratio',v:m.rtpWindow.deviationRatio.toFixed(2)},{t:'Avg Seed Interval (m)',v:m.seeds.avgIntervalMs? (m.seeds.avgIntervalMs/60000).toFixed(1):'n/a'}];const cards=provisional?baseCards:baseCards.concat(advCards);for(const c of cards){const div=document.createElement('div');div.className='card';div.innerHTML='<h4>'+c.t+'</h4><div>'+c.v+'</div>';metricsEl.appendChild(div);}statusEl.textContent='Live metrics updated';}function renderAnomalies(summary){anomList.innerHTML='';if(provisional){const counts=summary.counts;const div=document.createElement('div');div.className='anom-item';div.innerHTML='<strong>Gated:</strong> pump='+counts.pump+', compression='+counts.compression+', clustering='+counts.clustering;anomList.appendChild(div);return;}for(const a of summary.latest){const div=document.createElement('div');div.className='anom-item';div.innerHTML='<strong>'+a.type+'</strong> severity='+a.severity+' conf='+a.confidence.toFixed(2)+' <span style="opacity:.7">'+a.reason+'</span>';anomList.appendChild(div);} }ws.onmessage=ev=>{try{const data=JSON.parse(ev.data);if(data.type==='metrics'){renderMetrics(data);}else if(data.type==='anomalySummary'){renderAnomalies(data);}else if(data.type==='welcome'){statusEl.textContent='Connected – spins='+data.spins;}}catch(e){errorEl.style.display='block';errorEl.textContent='Parse error: '+e.message;}};ws.onopen=()=>{statusEl.textContent='WebSocket connected';};ws.onerror=()=>{errorEl.style.display='block';errorEl.textContent='WebSocket error';};ws.onclose=()=>{statusEl.textContent='Disconnected';};</script></main></body></html>`);
            return;
        }
        if (method === 'GET' && url.startsWith('/api/spins')) {
            const query = parseQuery(url);
            const limit = parseInt(query.limit || '1000', 10);
            const spins = DB.getRecentSpins(casinoId, limit);
            res.writeHead(200);
            res.end(JSON.stringify({ spins }));
            return;
        }
        if (method === 'GET' && url.startsWith('/api/seeds')) {
            const seeds = DB.getSeedRotations(casinoId);
            res.writeHead(200);
            res.end(JSON.stringify({ seeds }));
            return;
        }
        if (method === 'GET' && url.startsWith('/api/spins/range')) {
            const query = parseQuery(url);
            const startTs = parseInt(query.start || '0', 10);
            const endTs = parseInt(query.end || `${Date.now()}`, 10);
            const spins = DB.getSpinsByTimeRange(casinoId, startTs, endTs);
            res.writeHead(200);
            res.end(JSON.stringify({ spins, count: spins.length }));
            return;
        }
        if (method === 'GET' && url === '/api/stats') {
            const count = DB.getSpinCount(casinoId);
            const seeds = DB.getSeedRotations(casinoId);
            res.writeHead(200);
            res.end(JSON.stringify({ casino: casinoId, spinCount: count, seedCount: seeds.length }));
            return;
        }
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    server.listen(PORT, () => {
        console.log(`[API] Historical API listening on ${PORT}`);
    });
    return server;
}
