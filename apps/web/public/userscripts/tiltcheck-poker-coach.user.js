// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-09-22
// ==UserScript==
// @name         TiltCheck Poker Coach
// @namespace    https://tiltcheck.me/userscripts
// @version      1.0.0
// @description  Session + pot-odds coach for Bink.bet Hold'em. Reads visible pot/call amounts. You enter hole cards. Advisory only — no auto-play.
// @author       TiltCheck
// @homepage     https://tiltcheck.me
// @downloadURL  https://tiltcheck.me/userscripts/tiltcheck-poker-coach.user.js
// @updateURL    https://tiltcheck.me/userscripts/tiltcheck-poker-coach.user.js
// @match        *://bink.bet/*
// @match        *://*.bink.bet/*
// @match        https://bink.bet/*
// @match        https://www.bink.bet/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const VERSION = '1.0.0';
    const STORAGE_KEY = 'tiltcheck-poker-coach-v1';
    const HOST = location.hostname.replace(/^www\./, '');
    if (!/(^|\.)bink\.bet$/i.test(HOST)) return;
    if (window.__tiltcheckPokerCoach__) return;
    window.__tiltcheckPokerCoach__ = true;

    const onTable = /\/poker\/table\//i.test(location.pathname);
    const onPoker = /\/poker(\/|$)/i.test(location.pathname);

    const RANKS = '23456789TJQKA';
    const SUITS = 'shdc';
    const SUIT_GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };
    const SUIT_COLOR = { s: '#8aa4c7', h: '#ef4444', d: '#38bdf8', c: '#22c55e' };
    function defaults() {
        return {
            buyIn: 0,
            stopLoss: 20,
            takeProfit: 40,
            maxMinutes: 90,
            opponents: 2,
            pot: '',
            toCall: '',
            hole: ['', ''],
            board: ['', '', '', '', ''],
            x: null,
            y: 16,
            minimized: false,
            tab: onTable ? 'odds' : 'session'
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaults();
            return { ...defaults(), ...JSON.parse(raw) };
        } catch {
            return defaults();
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                buyIn: state.buyIn,
                stopLoss: state.stopLoss,
                takeProfit: state.takeProfit,
                maxMinutes: state.maxMinutes,
                opponents: state.opponents,
                pot: state.pot,
                toCall: state.toCall,
                hole: state.hole,
                board: state.board,
                x: state.x,
                y: state.y,
                minimized: state.minimized,
                tab: state.tab
            }));
        } catch { /* quota */ }
    }

    const state = load();
    const session = {
        startedAt: Date.now(),
        hands: 0,
        wins: 0,
        losses: 0,
        net: 0,
        lastDelta: 0,
        streak: 0
    };
    const scan = { pot: null, toCall: null, street: '—', action: '—', blinds: '—' };

    function parseMoney(text) {
        if (text == null) return NaN;
        const raw = String(text).replace(/\u00a0/g, ' ').replace(/[–—]/g, '-');
        const m = raw.match(/[-+]?\d[\d,]*(?:\.\d+)?/);
        if (!m) return NaN;
        const n = parseFloat(m[0].replace(/,/g, ''));
        return Number.isFinite(n) ? n : NaN;
    }

    function fmtMoney(n) {
        if (!Number.isFinite(n)) return '—';
        const abs = Math.abs(n);
        const sign = n < 0 ? '-' : '';
        return sign + '$' + abs.toFixed(abs >= 100 ? 0 : 2);
    }

    function fmtClock(ms) {
        const s = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function cardLabel(code) {
        if (!code || code.length < 2) return '·';
        return code[0] + SUIT_GLYPH[code[1]];
    }

    function fullDeck() {
        const d = [];
        for (let i = 0; i < RANKS.length; i++) {
            for (let j = 0; j < SUITS.length; j++) d.push(RANKS[i] + SUITS[j]);
        }
        return d;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        return arr;
    }

    function rankValue(r) {
        return RANKS.indexOf(r);
    }

    function eval7(cards) {
        const ranks = cards.map((c) => rankValue(c[0]));
        const suits = cards.map((c) => c[1]);
        const rc = new Array(13).fill(0);
        const sc = { s: 0, h: 0, d: 0, c: 0 };
        for (let i = 0; i < 7; i++) {
            rc[ranks[i]]++;
            sc[suits[i]]++;
        }
        let flushSuit = null;
        for (const s of SUITS) if (sc[s] >= 5) flushSuit = s;
        const uniq = [];
        for (let i = 12; i >= 0; i--) if (rc[i]) uniq.push(i);
        function straightHigh(list) {
            const set = {};
            for (let i = 0; i < list.length; i++) set[list[i]] = 1;
            if (set[12] && set[0] && set[1] && set[2] && set[3]) return 3;
            for (let h = 12; h >= 4; h--) {
                if (set[h] && set[h - 1] && set[h - 2] && set[h - 3] && set[h - 4]) return h;
            }
            return -1;
        }
        let flushCards = [];
        if (flushSuit) {
            for (let i = 0; i < 7; i++) if (suits[i] === flushSuit) flushCards.push(ranks[i]);
            flushCards.sort((a, b) => b - a);
        }
        const sf = flushCards.length ? straightHigh(flushCards) : -1;
        if (sf >= 0) return [8, sf];
        let four = -1;
        let trips = [];
        let pairs = [];
        for (let i = 12; i >= 0; i--) {
            if (rc[i] === 4) four = i;
            else if (rc[i] === 3) trips.push(i);
            else if (rc[i] === 2) pairs.push(i);
        }
        const kick = (skip, n) => {
            const out = [];
            for (let i = 12; i >= 0 && out.length < n; i--) {
                if (skip[i] || !rc[i]) continue;
                out.push(i);
            }
            return out;
        };
        if (four >= 0) return [7, four, kick({ [four]: 1 }, 1)[0] || 0];
        if (trips.length && (pairs.length || trips.length > 1)) {
            const t = trips[0];
            const p = trips.length > 1 ? trips[1] : pairs[0];
            return [6, t, p];
        }
        if (flushCards.length) return [5, ...flushCards.slice(0, 5)];
        const sh = straightHigh(uniq);
        if (sh >= 0) return [4, sh];
        if (trips.length) return [3, trips[0], ...kick({ [trips[0]]: 1 }, 2)];
        if (pairs.length >= 2) return [2, pairs[0], pairs[1], ...kick({ [pairs[0]]: 1, [pairs[1]]: 1 }, 1)];
        if (pairs.length === 1) return [1, pairs[0], ...kick({ [pairs[0]]: 1 }, 3)];
        return [0, ...kick({}, 5)];
    }

    function cmpRank(a, b) {
        const n = Math.max(a.length, b.length);
        for (let i = 0; i < n; i++) {
            const da = a[i] || 0;
            const db = b[i] || 0;
            if (da !== db) return da - db;
        }
        return 0;
    }

    function monteCarlo(hole, board, opponents, trials) {
        const used = new Set([...hole, ...board].filter(Boolean));
        if (hole.filter(Boolean).length < 2) return null;
        const dead = fullDeck().filter((c) => !used.has(c));
        const needBoard = 5 - board.filter(Boolean).length;
        const needOpp = opponents * 2;
        if (dead.length < needBoard + needOpp) return null;
        let wins = 0;
        let ties = 0;
        const n = Math.max(400, trials | 0);
        for (let t = 0; t < n; t++) {
            const deck = shuffle(dead.slice());
            let i = 0;
            const fullBoard = board.filter(Boolean).slice();
            while (fullBoard.length < 5) fullBoard.push(deck[i++]);
            const hero = eval7([...hole, ...fullBoard]);
            let result = 1;
            for (let o = 0; o < opponents; o++) {
                const oppHole = [deck[i++], deck[i++]];
                const vr = cmpRank(hero, eval7([...oppHole, ...fullBoard]));
                if (vr < 0) { result = -1; break; }
                if (vr === 0) result = 0;
            }
            if (result > 0) wins++;
            else if (result === 0) ties++;
        }
        return { equity: (wins + ties / 2) / n, wins, ties, trials: n };
    }

    function potOdds(pot, toCall) {
        const p = Number(pot);
        const c = Number(toCall);
        if (!(p >= 0) || !(c > 0)) return null;
        const pct = c / (p + c);
        return { pct, ratio: (p / c) };
    }

    function scanTable() {
        const root = document.body;
        if (!root) return;
        const texts = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const v = (node.nodeValue || '').trim();
                if (!v || v.length > 80) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let node;
        while ((node = walker.nextNode())) texts.push(node.nodeValue.trim());

        let pot = null;
        for (let i = 0; i < texts.length; i++) {
            if (/^pot\b/i.test(texts[i]) || /^total pot\b/i.test(texts[i])) {
                const here = parseMoney(texts[i]);
                const next = parseMoney(texts[i + 1] || '');
                pot = Number.isFinite(next) ? next : (Number.isFinite(here) ? here : pot);
            }
            const combo = texts[i].match(/pot[^0-9$]{0,12}([$]?\s*\d[\d,]*(?:\.\d+)?)/i);
            if (combo) pot = parseMoney(combo[1]);
        }

        let toCall = null;
        let action = '—';
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
            if (btn.closest('#tc-poker-coach')) continue;
            const label = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '')).replace(/\s+/g, ' ').trim();
            if (!label) continue;
            if (/^fold\b/i.test(label)) action = 'decision';
            const call = label.match(/\b(?:call|call\s*any)\b[^0-9$]{0,8}([$]?\s*\d[\d,]*(?:\.\d+)?)/i);
            if (call) {
                toCall = parseMoney(call[1]);
                action = 'call ' + fmtMoney(toCall);
            } else if (/\bcheck\b/i.test(label) && !/checkout|checkbox/i.test(label)) {
                toCall = 0;
                action = 'check';
            }
            const blinds = label.match(/\$\s*[\d.]+\/\$\s*[\d.]+/);
            if (blinds) scan.blinds = blinds[0].replace(/\s+/g, '');
        }

        let street = 'Preflop';
        const boardish = document.querySelectorAll('[class*="community"], [class*="board"], [data-testid*="board"], [class*="flop"]');
        if (boardish.length >= 5) street = 'River';
        else if (boardish.length === 4) street = 'Turn';
        else if (boardish.length >= 3) street = 'Flop';
        const bodyText = texts.join(' | ');
        if (/\briver\b/i.test(bodyText)) street = 'River';
        else if (/\bturn\b/i.test(bodyText)) street = 'Turn';
        else if (/\bflop\b/i.test(bodyText)) street = 'Flop';

        scan.pot = Number.isFinite(pot) ? pot : null;
        scan.toCall = Number.isFinite(toCall) ? toCall : (toCall === 0 ? 0 : null);
        scan.street = street;
        scan.action = action;
        if (scan.pot != null && !state.potLocked) state.pot = String(scan.pot);
        if (scan.toCall != null && !state.callLocked) state.toCall = String(scan.toCall);
    }

    function tiltLevel() {
        const elapsedMin = (Date.now() - session.startedAt) / 60000;
        let score = 0;
        if (session.net <= -Math.abs(Number(state.stopLoss) || 0)) score += 40;
        if (session.streak <= -3) score += 25;
        if (elapsedMin >= (Number(state.maxMinutes) || 90)) score += 20;
        if (session.losses >= 4 && session.wins === 0) score += 15;
        if (session.net < 0) score += Math.min(20, Math.abs(session.net) / Math.max(1, Number(state.buyIn) || 20) * 20);
        return Math.min(100, Math.round(score));
    }

    function coachLine() {
        const odds = potOdds(state.pot, state.toCall);
        const holeOk = state.hole.filter(Boolean).length === 2;
        const eq = holeOk ? monteCarlo(state.hole, state.board.filter(Boolean), Math.max(1, Number(state.opponents) || 1), 900) : null;
        const tilt = tiltLevel();

        if (tilt >= 70) return 'Tilt guard: stop or buy-in smaller. You are past the line you set.';
        if (Number(state.takeProfit) > 0 && session.net >= Number(state.takeProfit)) return 'Hit take-profit. Stand up while you are winning.';
        if (odds && eq) {
            const need = odds.pct * 100;
            const have = eq.equity * 100;
            if (have + 1.5 < need) return 'Odds: fold is the default. Equity is short of the pot price.';
            if (have > need + 8) return 'Odds: call/raise is fine if stacks and position agree.';
            return 'Odds: close. Prefer position and a plan — do not autopilot.';
        }
        if (odds) {
            return 'Need ~' + Math.round(odds.pct * 100) + '% equity to call. Enter hole cards for a local estimate.';
        }
        if (onTable) return 'Waiting on pot / to-call. You can type amounts if Bink hides them.';
        return 'Open a Bink table — coach follows /poker/table/…';
    }

    function injectStyle() {
        if (document.getElementById('tc-poker-coach-css')) return;
        const css = document.createElement('style');
        css.id = 'tc-poker-coach-css';
        css.textContent = `
#tc-poker-coach{position:fixed;top:16px;right:16px;z-index:2147483000;width:320px;font-family:Inter,Segoe UI,Roboto,system-ui,sans-serif;color:#f4f7fb;background:rgba(10,12,16,.92);border:1px solid rgba(23,195,178,.4);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.45);backdrop-filter:blur(14px);overflow:hidden}
#tc-poker-coach *{box-sizing:border-box}
#tc-poker-coach .hd{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:move;background:linear-gradient(180deg,rgba(23,195,178,.16),transparent)}
#tc-poker-coach .mark{width:22px;height:22px;border-radius:7px;background:#17c3b2;color:#06221f;font-weight:900;font-size:12px;display:grid;place-items:center}
#tc-poker-coach .ttl{font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
#tc-poker-coach .sub{color:#8a97a8;font-size:10px}
#tc-poker-coach .sp{flex:1}
#tc-poker-coach .icon{border:0;background:transparent;color:#c4ced8;cursor:pointer;font-size:16px;line-height:1;padding:2px 4px}
#tc-poker-coach .tabs{display:flex;gap:6px;padding:0 12px 8px}
#tc-poker-coach .tab{flex:1;border:1px solid #1e2533;background:#12161e;color:#8a97a8;border-radius:8px;font-size:11px;font-weight:700;padding:6px 0;cursor:pointer;text-transform:uppercase;letter-spacing:.06em}
#tc-poker-coach .tab.on{color:#17c3b2;border-color:#17c3b2;background:rgba(23,195,178,.08)}
#tc-poker-coach .body{padding:0 12px 12px}
#tc-poker-coach .row{display:flex;gap:8px;margin-bottom:8px}
#tc-poker-coach label{display:block;font-size:10px;color:#8a97a8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
#tc-poker-coach input,#tc-poker-coach select{width:100%;background:#080a0d;border:1px solid #283347;color:#fff;border-radius:8px;padding:7px 8px;font-size:13px}
#tc-poker-coach .stat{flex:1;background:#12161e;border:1px solid #1e2533;border-radius:10px;padding:8px}
#tc-poker-coach .stat b{display:block;font-size:16px;margin-top:2px}
#tc-poker-coach .up{color:#17c3b2} #tc-poker-coach .down{color:#ef4444}
#tc-poker-coach .bar{height:8px;background:#1e2533;border-radius:99px;overflow:hidden;margin:8px 0}
#tc-poker-coach .bar>i{display:block;height:100%;background:#17c3b2}
#tc-poker-coach .bar.warn>i{background:#f59e0b} #tc-poker-coach .bar.hot>i{background:#ef4444}
#tc-poker-coach .hint{font-size:12px;line-height:1.4;color:#c4ced8;background:rgba(23,195,178,.08);border:1px solid rgba(23,195,178,.2);border-radius:10px;padding:8px 10px;min-height:52px}
#tc-poker-coach .cards{display:flex;flex-wrap:wrap;gap:6px}
#tc-poker-coach .card{width:40px;height:48px;border-radius:8px;border:1px solid #283347;background:#12161e;color:#fff;display:grid;place-items:center;font-weight:800;cursor:pointer}
#tc-poker-coach .card.on{border-color:#17c3b2}
#tc-poker-coach .actions{display:flex;gap:6px;margin-top:8px}
#tc-poker-coach .btn{flex:1;border:1px solid #283347;background:#12161e;color:#fff;border-radius:8px;padding:8px 6px;font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase}
#tc-poker-coach .btn.good{border-color:#17c3b2;color:#17c3b2}
#tc-poker-coach .btn.bad{border-color:#ef4444;color:#ef4444}
#tc-poker-coach .foot{padding:8px 12px 10px;color:#8a97a8;font-size:10px}
#tc-poker-coach .picker{position:absolute;inset:auto 12px 12px 12px;background:#0d1118;border:1px solid #17c3b2;border-radius:12px;padding:10px;z-index:2}
#tc-poker-coach .suits{display:flex;gap:6px;margin-bottom:8px}
#tc-poker-coach .mini{flex:1;border:1px solid #283347;background:#12161e;border-radius:8px;padding:6px 0;cursor:pointer;font-weight:800}
#tc-poker-coach.compact .body,#tc-poker-coach.compact .tabs,#tc-poker-coach.compact .foot{display:none}
        `;
        document.documentElement.appendChild(css);
    }

    let pickerSlot = null;
    let pickerSuit = 's';

    function mount() {
        if (!document.body) return false;
        if (document.getElementById('tc-poker-coach')) return true;
        injectStyle();
        const el = document.createElement('div');
        el.id = 'tc-poker-coach';
        if (state.minimized) el.classList.add('compact');
        if (state.x != null) {
            el.style.left = state.x + 'px';
            el.style.top = state.y + 'px';
            el.style.right = 'auto';
        }
        el.innerHTML = `
            <div class="hd" data-drag>
                <div class="mark">TC</div>
                <div><div class="ttl">Poker Coach</div><div class="sub">Bink.bet · v${VERSION}</div></div>
                <div class="sp"></div>
                <button class="icon" data-min title="Minimize">–</button>
            </div>
            <div class="tabs">
                <button class="tab" data-tab="session">Session</button>
                <button class="tab" data-tab="odds">Odds</button>
            </div>
            <div class="body" id="tc-coach-body"></div>
            <div class="foot">Advisory only. Local math. Does not click Fold/Call/Raise.</div>
        `;
        document.body.appendChild(el);
        wire(el);
        render();
        return true;
    }

    function wire(el) {
        el.querySelector('[data-min]').addEventListener('click', (e) => {
            e.stopPropagation();
            state.minimized = !state.minimized;
            el.classList.toggle('compact', state.minimized);
            save();
        });
        el.querySelectorAll('[data-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.tab = btn.getAttribute('data-tab');
                save();
                render();
            });
        });
        const hd = el.querySelector('[data-drag]');
        let drag = null;
        hd.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button')) return;
            const r = el.getBoundingClientRect();
            drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            hd.setPointerCapture(e.pointerId);
        });
        hd.addEventListener('pointermove', (e) => {
            if (!drag) return;
            state.x = Math.max(8, e.clientX - drag.dx);
            state.y = Math.max(8, e.clientY - drag.dy);
            el.style.left = state.x + 'px';
            el.style.top = state.y + 'px';
            el.style.right = 'auto';
        });
        hd.addEventListener('pointerup', () => { drag = null; save(); });
    }

    function render() {
        const root = document.getElementById('tc-poker-coach');
        if (!root) return;
        root.querySelectorAll('[data-tab]').forEach((b) => {
            b.classList.toggle('on', b.getAttribute('data-tab') === state.tab);
        });
        const body = document.getElementById('tc-coach-body');
        if (!body) return;
        if (state.tab === 'session') renderSession(body);
        else renderOdds(body);
    }

    function renderSession(body) {
        const elapsed = Date.now() - session.startedAt;
        const tilt = tiltLevel();
        const barClass = tilt >= 70 ? 'hot' : tilt >= 40 ? 'warn' : '';
        const netCls = session.net > 0 ? 'up' : session.net < 0 ? 'down' : '';
        body.innerHTML = `
            <div class="row">
                <div class="stat"><label>Time</label><b>${fmtClock(elapsed)}</b></div>
                <div class="stat"><label>Hands</label><b>${session.hands}</b></div>
                <div class="stat"><label>Net</label><b class="${netCls}">${fmtMoney(session.net)}</b></div>
            </div>
            <label>Tilt</label>
            <div class="bar ${barClass}"><i style="width:${tilt}%"></i></div>
            <div class="row">
                <div><label>Buy-in</label><input id="tc-buy" type="number" min="0" step="0.01" value="${state.buyIn || ''}"></div>
                <div><label>Stop-loss $</label><input id="tc-sl" type="number" min="0" step="1" value="${state.stopLoss || ''}"></div>
            </div>
            <div class="row">
                <div><label>Take-profit $</label><input id="tc-tp" type="number" min="0" step="1" value="${state.takeProfit || ''}"></div>
                <div><label>Max minutes</label><input id="tc-mm" type="number" min="10" step="5" value="${state.maxMinutes || ''}"></div>
            </div>
            <div class="actions">
                <button class="btn good" data-res="win">+ Win</button>
                <button class="btn" data-res="even">Even</button>
                <button class="btn bad" data-res="lose">− Loss</button>
            </div>
            <div class="hint" style="margin-top:8px">${coachLine()}</div>
        `;
        bindNum(body, '#tc-buy', 'buyIn');
        bindNum(body, '#tc-sl', 'stopLoss');
        bindNum(body, '#tc-tp', 'takeProfit');
        bindNum(body, '#tc-mm', 'maxMinutes');
        body.querySelectorAll('[data-res]').forEach((btn) => {
            btn.addEventListener('click', () => logResult(btn.getAttribute('data-res')));
        });
    }

    function renderOdds(body) {
        const odds = potOdds(state.pot, state.toCall);
        const holeOk = state.hole.filter(Boolean).length === 2;
        const eq = holeOk ? monteCarlo(state.hole, state.board.filter(Boolean), Math.max(1, Number(state.opponents) || 1), 1200) : null;
        const need = odds ? Math.round(odds.pct * 100) : null;
        const have = eq ? Math.round(eq.equity * 100) : null;
        body.innerHTML = `
            <div class="row">
                <div class="stat"><label>Felt pot</label><b>${scan.pot == null ? '—' : fmtMoney(scan.pot)}</b></div>
                <div class="stat"><label>To call</label><b>${scan.toCall == null ? '—' : fmtMoney(scan.toCall)}</b></div>
                <div class="stat"><label>Street</label><b>${scan.street}</b></div>
            </div>
            <div class="row">
                <div><label>Pot $</label><input id="tc-pot" type="number" min="0" step="0.01" value="${state.pot}"></div>
                <div><label>To call $</label><input id="tc-call" type="number" min="0" step="0.01" value="${state.toCall}"></div>
            </div>
            <div class="row">
                <div class="stat"><label>Need</label><b>${need == null ? '—' : need + '%'}</b></div>
                <div class="stat"><label>Equity</label><b class="${have != null && need != null ? (have >= need ? 'up' : 'down') : ''}">${have == null ? '—' : have + '%'}</b></div>
                <div><label>Villains</label><input id="tc-ops" type="number" min="1" max="8" step="1" value="${state.opponents}"></div>
            </div>
            <label>Hole</label>
            <div class="cards" id="tc-hole">${state.hole.map((c, i) => cardBtn(c, 'h' + i)).join('')}</div>
            <label style="margin-top:8px">Board</label>
            <div class="cards" id="tc-board">${state.board.map((c, i) => cardBtn(c, 'b' + i)).join('')}</div>
            <div class="actions">
                <button class="btn" id="tc-clear">Clear cards</button>
            </div>
            <div class="hint" style="margin-top:8px">${coachLine()}</div>
        `;
        body.querySelector('#tc-pot').addEventListener('input', (e) => { state.pot = e.target.value; state.potLocked = true; save(); render(); });
        body.querySelector('#tc-call').addEventListener('input', (e) => { state.toCall = e.target.value; state.callLocked = true; save(); render(); });
        bindNum(body, '#tc-ops', 'opponents');
        body.querySelectorAll('[data-slot]').forEach((btn) => btn.addEventListener('click', () => openPicker(btn.getAttribute('data-slot'))));
        body.querySelector('#tc-clear').addEventListener('click', () => {
            state.hole = ['', ''];
            state.board = ['', '', '', '', ''];
            save();
            render();
        });
        if (pickerSlot) drawPicker(body);
    }

    function cardBtn(code, slot) {
        const col = code ? SUIT_COLOR[code[1]] || '#fff' : '#8a97a8';
        return `<button class="card ${code ? 'on' : ''}" data-slot="${slot}" style="color:${col}">${cardLabel(code)}</button>`;
    }

    function openPicker(slot) {
        pickerSlot = pickerSlot === slot ? null : slot;
        render();
    }

    function drawPicker(body) {
        const box = document.createElement('div');
        box.className = 'picker';
        box.innerHTML = `
            <div class="suits">${SUITS.map((s) => `<button class="mini" data-suit="${s}" style="color:${SUIT_COLOR[s]}">${SUIT_GLYPH[s]}</button>`).join('')}</div>
            <div class="cards">${RANKS.split('').map((r) => `<button class="card" data-pick="${r}${pickerSuit}" style="color:${SUIT_COLOR[pickerSuit]}">${r}${SUIT_GLYPH[pickerSuit]}</button>`).join('')}</div>
        `;
        body.appendChild(box);
        box.querySelectorAll('[data-suit]').forEach((b) => {
            b.addEventListener('click', () => { pickerSuit = b.getAttribute('data-suit'); render(); });
        });
        box.querySelectorAll('[data-pick]').forEach((b) => {
            b.addEventListener('click', () => {
                const code = b.getAttribute('data-pick');
                if (pickerSlot[0] === 'h') state.hole[Number(pickerSlot[1])] = code;
                else state.board[Number(pickerSlot[1])] = code;
                pickerSlot = null;
                save();
                render();
            });
        });
    }

    function bindNum(scope, sel, key) {
        const input = scope.querySelector(sel);
        if (!input) return;
        input.addEventListener('change', () => {
            state[key] = Number(input.value) || 0;
            save();
            render();
        });
    }

    function logResult(kind) {
        const unit = Number(state.buyIn) > 0 ? Number(state.buyIn) * 0.15 : 1;
        session.hands += 1;
        if (kind === 'win') {
            session.wins += 1;
            session.net += unit;
            session.streak = session.streak >= 0 ? session.streak + 1 : 1;
        } else if (kind === 'lose') {
            session.losses += 1;
            session.net -= unit;
            session.streak = session.streak <= 0 ? session.streak - 1 : -1;
        } else {
            session.streak = 0;
        }
        render();
    }

    function boot() {
        if (mount()) {
            scanTable();
            render();
            return;
        }
        setTimeout(boot, 250);
    }

    const obs = new MutationObserver(() => {
        if (!onPoker && !onTable) return;
        scanTable();
    });

    function startWatch() {
        if (!document.body) return;
        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    boot();
    startWatch();
    window.addEventListener('load', boot);
    setInterval(() => {
        if (onTable || onPoker) scanTable();
        if (state.tab === 'session') render();
    }, 1000);
})();
