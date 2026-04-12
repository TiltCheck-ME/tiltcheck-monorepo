// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

'use strict';

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let ws = null;
let vaultState = { locked: false, unlockAt: null, amount: 0 };
let selectedVaultDuration = 14400000; // 4h default
let vaultCountdownTimer = null;

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
        localStorage.setItem('tiltcheck-token', urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await checkAuth();
    setupTabNavigation();
    setupAgentChat();
    setupVaultPanel();
    setupWalletPanel();
    setupBuddyPanel();
    setupLogout();
});

// ============================================================
// AUTH
// ============================================================
function apiRequest(url, options = {}) {
    const token = localStorage.getItem('tiltcheck-token');
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
}

async function checkAuth() {
    const token = localStorage.getItem('tiltcheck-token');
    if (!token) { showLogin(); return; }

    try {
        const res = await apiRequest('/api/auth/me');
        if (!res.ok) { localStorage.removeItem('tiltcheck-token'); showLogin(); return; }
        currentUser = await res.json();
        if (!currentUser || !currentUser.discordId) { showLogin(); return; }
        showDashboard();
        await loadAllData();
        initWebSocket();
    } catch (err) {
        console.error('[Auth]', err);
        showNotification('Connection error. Check your network.', 'error');
        setTimeout(checkAuth, 8000);
    }
}

function showLogin() {
    const notLoggedIn = document.getElementById('not-logged-in');
    const dashboard = document.getElementById('dashboard');
    if (notLoggedIn) notLoggedIn.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
}

function showDashboard() {
    document.getElementById('not-logged-in').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = currentUser.username || 'Degen';
    if (avatarEl && currentUser.avatar) {
        avatarEl.src = currentUser.avatar.startsWith('http')
            ? currentUser.avatar
            : `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
    }
}

function setupLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('tiltcheck-token');
        if (ws) ws.close();
        window.location.href = '/';
    });
}

// ============================================================
// DATA LOADING
// ============================================================
async function loadAllData() {
    const overlay = document.getElementById('loadingOverlay');
    const content = document.getElementById('dashboardContent');
    if (overlay) overlay.style.display = 'flex';
    if (content) content.style.opacity = '0';

    await Promise.allSettled([
        loadUserProfile(),
        loadTrustMetrics(),
        loadSessionAnalytics(),
        loadActivity(),
        loadVaults(),
        loadBonuses(),
        loadBuddies()
    ]);

    if (overlay) overlay.style.display = 'none';
    if (content) { content.style.opacity = '1'; content.style.transition = 'opacity 0.3s'; }
}

async function loadUserProfile() {
    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}`);
        if (!res.ok) return;
        const user = await res.json();

        setText('trustScore', user.trustScore ?? '--');
        setText('redeemWins', user.analytics?.redeemWins ?? 0);
        setText('totalRedeemed', '$' + Number(user.analytics?.totalRedeemed ?? 0).toFixed(2));
        setText('totalJuice', Number(user.analytics?.totalJuice ?? 0).toFixed(3) + ' SOL');
        setText('totalTipsCaught', Number(user.analytics?.totalTipsCaught ?? 0).toFixed(3) + ' SOL');

        const trustBar = document.getElementById('trustScoreBar');
        if (trustBar) trustBar.style.width = (user.trustScore ?? 0) + '%';

        const tierEl = document.getElementById('user-tier');
        if (tierEl && user.degenIdentity?.trust_tier) {
            tierEl.textContent = user.degenIdentity.trust_tier.toUpperCase();
            tierEl.className = `user-tier-badge tier-${user.degenIdentity.trust_tier.toLowerCase()}`;
        }

        if (user.degenIdentity?.primary_external_address) {
            const addr = user.degenIdentity.primary_external_address;
            setText('externalWalletDisplay', addr.slice(0, 6) + '...' + addr.slice(-4));
        }

        if (user.nftIdentity) {
            setText('nftIdentityStatus', user.nftIdentity.status);
            setText('nftIdentitySub', user.nftIdentity.detail);

            const noticeKey = `nft-ready-banner-${currentUser.discordId}`;
            if (user.nftIdentity.notificationPending && !sessionStorage.getItem(noticeKey)) {
                showNotification('NFT identity waitlist ready. Terms are signed and a wallet is linked.', 'success');
                sessionStorage.setItem(noticeKey, '1');
            }
        } else {
            setText('nftIdentityStatus', 'Unknown');
            setText('nftIdentitySub', 'Identity status is offline right now.');
        }
    } catch (err) { console.error('[Profile]', err); }
}

async function loadTrustMetrics() {
    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/trust`);
        if (!res.ok) return;
        const data = await res.json();

        const consistency = data.factors?.consistency ?? 0;
        const community = data.factors?.community ?? 0;
        const tips = Math.min(100, (data.factors?.tips_sent ?? 0));

        setBarAndVal('factor-consistency', consistency);
        setBarAndVal('factor-community', community);
        setBarAndVal('factor-tips', tips);

        const tiltEl = document.getElementById('tiltLevel');
        const tiltSub = document.getElementById('tiltLevelSub');
        const tilt = data.tiltLevel ?? 0;
        if (tiltEl) {
            if (tilt >= 70) { tiltEl.textContent = 'ON TILT'; tiltEl.className = 'stat-value tilt-danger'; }
            else if (tilt >= 50) { tiltEl.textContent = 'HEATING'; tiltEl.className = 'stat-value tilt-warning'; }
            else if (tilt >= 30) { tiltEl.textContent = 'WATCHFUL'; tiltEl.className = 'stat-value tilt-caution'; }
            else { tiltEl.textContent = 'CALM'; tiltEl.className = 'stat-value tilt-calm'; }
        }
        if (tiltSub) tiltSub.textContent = data.tiltSignal ?? 'No signals detected';
    } catch (err) { console.error('[Trust]', err); }
}

async function loadActivity() {
    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/activity`);
        if (!res.ok) return;
        const data = await res.json();
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        const activities = data.activities ?? [];
        if (activities.length === 0) {
            feed.innerHTML = '<div class="activity-empty">No activity yet. Start playing to see data here.</div>';
            return;
        }

        feed.innerHTML = activities.map(item => `
            <div class="activity-item">
                <span class="activity-type activity-type-${item.type}">${item.type.toUpperCase()}</span>
                <span class="activity-desc">${escapeHtml(item.description)}</span>
                <span class="activity-time">${timeAgo(item.timestamp)}</span>
            </div>
        `).join('');
    } catch (err) { console.error('[Activity]', err); }
}

async function loadSessionAnalytics() {
    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/sessions`);
        if (!res.ok) return;

        const data = await res.json();
        const stats = data.stats ?? {};
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];

        setText('weeklyPL', formatCurrency(stats.weeklyPL ?? 0));
        setText('winRate', `${stats.winRate ?? 0}%`);
        setText('avgSession', `${stats.avgSession ?? 0}m`);
        setText('rtpDrift', formatPercent(stats.rtpDrift ?? 0));

        const chart = document.getElementById('plChart');
        if (chart) {
            if (sessions.length === 0) {
                chart.innerHTML = '<div class="chart-placeholder">No session data yet. Install the Chrome extension to track sessions.</div>';
            } else {
                chart.innerHTML = sessions.slice(0, 7).map((session, index) => {
                    const pl = Number(session.net_pl ?? 0);
                    const completedAt = session.completed_at || session.created_at || Date.now();
                    return `
                        <div class="activity-item">
                            <span class="activity-type">SESSION ${index + 1}</span>
                            <span class="activity-desc">${formatCurrency(pl)}</span>
                            <span class="activity-time">${timeAgo(completedAt)}</span>
                        </div>
                    `;
                }).join('');
            }
        }

        const breakdown = document.getElementById('casinoBreakdown');
        if (breakdown) {
            const byCasino = new Map();
            sessions.forEach(session => {
                const casino = session.casino_name || session.casino || 'Unknown';
                const next = byCasino.get(casino) || { count: 0, net: 0 };
                next.count += 1;
                next.net += Number(session.net_pl ?? 0);
                byCasino.set(casino, next);
            });

            if (byCasino.size === 0) {
                breakdown.innerHTML = '<div class="activity-empty">No casino sessions recorded.</div>';
            } else {
                breakdown.innerHTML = Array.from(byCasino.entries()).slice(0, 6).map(([casino, summary]) => `
                    <div class="activity-item">
                        <span class="activity-type">${escapeHtml(casino)}</span>
                        <span class="activity-desc">${summary.count} session${summary.count === 1 ? '' : 's'} · ${formatCurrency(summary.net)}</span>
                    </div>
                `).join('');
            }
        }
    } catch (err) { console.error('[Sessions]', err); }
}

async function loadVaults() {
    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/vault`);
        if (!res.ok) return;
        const data = await res.json();

        vaultState = {
            locked: data.locked ?? false,
            unlockAt: data.unlockAt ? new Date(data.unlockAt) : null,
            amount: data.amount ?? 0
        };

        renderVaultStatus();

        const historyEl = document.getElementById('vault-history');
        if (historyEl && Array.isArray(data.history) && data.history.length > 0) {
            historyEl.innerHTML = data.history.slice(0, 5).map(entry => `
                <div class="vault-history-item">
                    <span class="vault-hist-amount">${Number(entry.amount_sol ?? 0).toFixed(3)} SOL</span>
                    <span class="vault-hist-date">${new Date(entry.locked_at).toLocaleDateString()}</span>
                    <span class="vault-hist-status ${entry.status}">${entry.status.toUpperCase()}</span>
                </div>
            `).join('');
        }
    } catch (err) { console.error('[Vault]', err); }
}

function renderVaultStatus() {
    const badge = document.getElementById('vault-status-label');
    const amountEl = document.getElementById('vault-locked-amount');
    const countdownEl = document.getElementById('vault-countdown');
    const extendBtn = document.getElementById('vault-extend-btn');
    const unlockBtn = document.getElementById('vault-unlock-btn');

    if (!badge) return;

    if (vaultState.locked && vaultState.unlockAt) {
        badge.textContent = 'LOCKED';
        badge.className = 'vault-status-badge locked';
        if (amountEl) { amountEl.textContent = vaultState.amount.toFixed(3) + ' SOL locked'; amountEl.style.display = 'block'; }
        if (countdownEl) countdownEl.style.display = 'block';
        if (extendBtn) extendBtn.style.display = 'inline-block';
        if (unlockBtn) unlockBtn.style.display = 'inline-block';
        startVaultCountdown(vaultState.unlockAt);
    } else {
        badge.textContent = 'UNLOCKED';
        badge.className = 'vault-status-badge unlocked';
        if (amountEl) amountEl.style.display = 'none';
        if (countdownEl) countdownEl.style.display = 'none';
        if (extendBtn) extendBtn.style.display = 'none';
        if (unlockBtn) unlockBtn.style.display = 'none';
        if (vaultCountdownTimer) { clearInterval(vaultCountdownTimer); vaultCountdownTimer = null; }
    }
}

function startVaultCountdown(unlockDate) {
    if (vaultCountdownTimer) clearInterval(vaultCountdownTimer);
    const el = document.getElementById('vault-countdown');
    const update = () => {
        const ms = unlockDate - Date.now();
        if (ms <= 0) { if (el) el.textContent = 'Unlocking...'; clearInterval(vaultCountdownTimer); loadVaults(); return; }
        if (el) el.textContent = 'Unlocks in ' + formatDuration(ms);
    };
    update();
    vaultCountdownTimer = setInterval(update, 1000);
}

async function loadBonuses() {
    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/bonuses`);
        if (!res.ok) return;
        const data = await res.json();
        const grid = document.getElementById('bonusList');
        const historyEl = document.getElementById('bonusHistory');
        if (!grid) return;

        const active = data.active ?? [];
        const history = data.history ?? [];
        const nerfs = data.nerfs ?? [];

        if (nerfs.length > 0) {
            const nerfContainer = document.getElementById('bonus-nerf-alerts');
            if (nerfContainer) {
                nerfContainer.style.display = 'block';
                nerfContainer.innerHTML = nerfs.map(n => `
                    <div class="nerf-alert">
                        <strong>${escapeHtml(n.casino)}</strong> bonus nerfed: ${escapeHtml(n.description)}
                    </div>
                `).join('');
            }
        }

        if (active.length === 0) {
            grid.innerHTML = '<div class="activity-empty">No bonuses tracked.</div>';
        } else {
            grid.innerHTML = active.map(bonus => {
                const isReady = !bonus.nextClaimAt || new Date(bonus.nextClaimAt) <= new Date();
                return `
                <div class="bonus-card ${isReady ? 'ready' : ''}">
                    <div class="bonus-casino">${escapeHtml(bonus.casinoName)}</div>
                    <div class="bonus-desc">${escapeHtml(bonus.description)}</div>
                    <div class="bonus-cooldown ${isReady ? 'ready' : ''}">${isReady ? 'READY TO CLAIM' : 'Resets in ' + timeUntil(bonus.nextClaimAt)}</div>
                    ${isReady ? `<button class="btn btn-primary btn-sm claim-bonus-btn" data-bonus-id="${bonus.id}">Claim</button>` : ''}
                </div>`;
            }).join('');

            grid.querySelectorAll('.claim-bonus-btn').forEach(btn => {
                btn.addEventListener('click', () => claimBonus(btn.dataset.bonusId, btn));
            });
        }

        if (historyEl && history.length > 0) {
            historyEl.innerHTML = history.slice(0, 10).map(h => `
                <div class="activity-item">
                    <span class="activity-type">${escapeHtml(h.casinoName)}</span>
                    <span class="activity-desc">${escapeHtml(h.description)}</span>
                    <span class="activity-time">${timeAgo(h.claimedAt)}</span>
                </div>
            `).join('');
        }
    } catch (err) { console.error('[Bonuses]', err); }
}

async function claimBonus(bonusId, btn) {
    btn.textContent = 'Claiming...';
    btn.disabled = true;
    try {
        const res = await apiRequest(`/api/bonus/${currentUser.discordId}/claim`, {
            method: 'POST',
            body: JSON.stringify({ bonusId })
        });
        if (res.ok) { btn.textContent = 'Claimed!'; setTimeout(loadBonuses, 1500); }
        else { btn.textContent = 'Failed'; btn.disabled = false; }
    } catch (err) { btn.textContent = 'Error'; btn.disabled = false; }
}

async function loadBuddies() {
    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/buddies`);
        if (!res.ok) return;
        const data = await res.json();
        const buddyList = document.getElementById('buddyList');
        const pendingList = document.getElementById('pendingBuddyList');
        const statusEl = document.getElementById('buddyStatus');

        const buddies = data.buddies ?? [];
        const pending = data.pending ?? [];

        if (statusEl) statusEl.textContent = `${buddies.length} active, ${pending.length} pending`;

        if (buddyList) {
            buddyList.innerHTML = buddies.length === 0
                ? '<div class="activity-empty">No active buddies. Send an invite above.</div>'
                : buddies.map(b => `
                    <div class="buddy-item">
                        <span class="buddy-name">${escapeHtml(b.buddy_id)}</span>
                        <span class="badge badge-success">ACTIVE</span>
                        <span class="buddy-ping-time">${b.last_ping ? 'Last ping: ' + timeAgo(b.last_ping) : 'No pings yet'}</span>
                    </div>`).join('');
        }

        if (pendingList) {
            pendingList.innerHTML = pending.length === 0
                ? '<div class="activity-empty">No pending requests.</div>'
                : pending.map(r => `
                    <div class="buddy-item pending">
                        <span class="buddy-name">${escapeHtml(r.buddy_id)}</span>
                        <span class="badge badge-warning">PENDING</span>
                        <button class="btn btn-primary btn-sm accept-buddy-btn" data-id="${r.id}">Accept</button>
                        <button class="btn btn-ghost btn-sm decline-buddy-btn" data-id="${r.id}">Decline</button>
                    </div>`).join('');

            pendingList.querySelectorAll('.accept-buddy-btn').forEach(btn => {
                btn.addEventListener('click', () => respondBuddy(btn.dataset.id, 'accept'));
            });
            pendingList.querySelectorAll('.decline-buddy-btn').forEach(btn => {
                btn.addEventListener('click', () => respondBuddy(btn.dataset.id, 'decline'));
            });
        }
    } catch (err) { console.error('[Buddies]', err); }
}

async function respondBuddy(requestId, action) {
    try {
        await apiRequest(`/api/user/${currentUser.discordId}/buddies/${requestId}/${action}`, { method: 'POST' });
        loadBuddies();
    } catch (err) { console.error('[Buddy response]', err); }
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function setupTabNavigation() {
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tab = link.dataset.tab;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            const section = document.getElementById(`${tab}-tab`);
            if (section) section.classList.add('active');
        });
    });
}

// ============================================================
// VAULT PANEL
// ============================================================
function setupVaultPanel() {
    document.querySelectorAll('.duration-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.duration-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const val = chip.dataset.duration;
            const customInput = document.getElementById('vault-custom-duration');
            if (val === 'custom') {
                if (customInput) customInput.style.display = 'block';
            } else {
                selectedVaultDuration = parseInt(val, 10);
                if (customInput) customInput.style.display = 'none';
            }
        });
    });

    document.getElementById('vault-custom-duration')?.addEventListener('input', e => {
        selectedVaultDuration = parseInt(e.target.value, 10) * 3600000;
    });

    document.querySelectorAll('.threshold-examples .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.threshold-examples .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const input = document.getElementById('vault-amount-input');
            if (input) input.value = chip.dataset.val;
        });
    });

    document.getElementById('vault-lock-btn')?.addEventListener('click', async () => {
        const amountInput = document.getElementById('vault-amount-input');
        const amount = parseFloat(amountInput?.value ?? '0');
        if (!amount || amount <= 0) { showNotification('Enter a valid SOL amount.', 'error'); return; }
        const btn = document.getElementById('vault-lock-btn');
        btn.disabled = true; btn.textContent = 'Locking...';
        try {
            const res = await apiRequest(`/api/user/${currentUser.discordId}/vault/lock`, {
                method: 'POST',
                body: JSON.stringify({ amountSol: amount, durationMs: selectedVaultDuration })
            });
            if (res.ok) {
                showNotification('Vault locked. Your profit is secured.', 'success');
                loadVaults();
            } else {
                const err = await res.json();
                showNotification(err.error ?? 'Vault lock failed.', 'error');
            }
        } catch (err) { showNotification('Network error.', 'error'); }
        btn.disabled = false; btn.textContent = 'Lock Vault';
    });

    document.getElementById('vault-unlock-btn')?.addEventListener('click', async () => {
        if (!confirm('Request early unlock? You will need to confirm again in 24 hours.')) return;
        try {
            await apiRequest(`/api/user/${currentUser.discordId}/vault/unlock`, { method: 'POST' });
            showNotification('Unlock request submitted.', 'success');
            loadVaults();
        } catch (err) { showNotification('Error requesting unlock.', 'error'); }
    });
}

// ============================================================
// WALLET PANEL
// ============================================================
function setupWalletPanel() {
    const linkBtn = document.getElementById('link-wallet-btn');
    const form = document.getElementById('wallet-link-form');
    const saveBtn = document.getElementById('save-wallet-btn');
    const cancelBtn = document.getElementById('cancel-wallet-btn');

    linkBtn?.addEventListener('click', () => { if (form) form.style.display = 'flex'; });
    cancelBtn?.addEventListener('click', () => { if (form) form.style.display = 'none'; });

    saveBtn?.addEventListener('click', async () => {
        const addrInput = document.getElementById('wallet-address-input');
        const address = addrInput?.value?.trim();
        if (!address || address.length < 32) { showNotification('Enter a valid Solana wallet address.', 'error'); return; }
        try {
            const res = await apiRequest('/api/auth/wallet/link', {
                method: 'POST',
                body: JSON.stringify({ address })
            });
            if (res.ok) {
                const data = await res.json();
                setText('externalWalletDisplay', address.slice(0, 6) + '...' + address.slice(-4));
                if (data?.nftIdentity) {
                    setText('nftIdentityStatus', data.nftIdentity.status);
                    setText('nftIdentitySub', data.nftIdentity.detail);
                }
                if (form) form.style.display = 'none';
                showNotification('Wallet linked.', 'success');
                loadUserProfile();
            }
        } catch (err) { showNotification('Error linking wallet.', 'error'); }
    });
}

// ============================================================
// BUDDY PANEL
// ============================================================
function setupBuddyPanel() {
    document.getElementById('sendBuddyInviteBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('buddyInviteInput');
        const buddyId = input?.value?.trim();
        if (!buddyId) return;
        const btn = document.getElementById('sendBuddyInviteBtn');
        btn.disabled = true; btn.textContent = 'Sending...';
        try {
            const res = await apiRequest(`/api/user/${currentUser.discordId}/buddies`, {
                method: 'POST',
                body: JSON.stringify({ buddyId })
            });
            if (res.ok) {
                input.value = '';
                btn.textContent = 'Sent!';
                showNotification('Buddy invite sent.', 'success');
                setTimeout(loadBuddies, 1000);
            } else {
                btn.textContent = 'Failed';
            }
        } catch (err) { btn.textContent = 'Error'; }
        setTimeout(() => { btn.textContent = 'Send Invite'; btn.disabled = false; }, 2000);
    });
}

// ============================================================
// AI AGENT CHAT
// ============================================================
function setupAgentChat() {
    document.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const input = document.getElementById('agent-input');
            if (input) { input.value = chip.dataset.prompt; input.focus(); }
        });
    });

    document.getElementById('agent-send-btn')?.addEventListener('click', sendAgentMessage);
    document.getElementById('agent-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendAgentMessage();
    });
}

async function sendAgentMessage() {
    const input = document.getElementById('agent-input');
    const query = input?.value?.trim();
    if (!query) return;

    appendChatMsg('user', escapeHtml(query));
    input.value = '';

    const thinkingId = appendChatMsg('agent', 'Thinking...', true);

    try {
        const res = await apiRequest('/api/agent/query', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        removeChatMsg(thinkingId);
        appendChatMsg('agent', escapeHtml(data.response ?? data.error ?? 'No response.'));
    } catch (err) {
        removeChatMsg(thinkingId);
        appendChatMsg('agent', 'Agent unavailable. Try again later.');
    }
}

function appendChatMsg(role, text, isThinking = false) {
    const chat = document.getElementById('agent-chat');
    if (!chat) return null;
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `chat-msg ${role}${isThinking ? ' thinking' : ''}`;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return id;
}

function removeChatMsg(id) {
    if (id) document.getElementById(id)?.remove();
}

// ============================================================
// WEBSOCKET (REAL-TIME UPDATES)
// ============================================================
function initWebSocket() {
    const wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
        + '//' + window.location.host + '/ws';

    try {
        ws = new WebSocket(wsUrl);
    } catch (err) {
        return;
    }

    ws.addEventListener('open', () => {
        updateWsIndicator(true);
        ws.send(JSON.stringify({ type: 'auth', discordId: currentUser.discordId }));
    });

    ws.addEventListener('message', e => {
        try {
            const msg = JSON.parse(e.data);
            handleWsMessage(msg);
        } catch (_) { /* ignore malformed messages */ }
    });

    ws.addEventListener('close', () => {
        updateWsIndicator(false);
        setTimeout(initWebSocket, 5000);
    });

    ws.addEventListener('error', () => {
        updateWsIndicator(false);
    });
}

function handleWsMessage(msg) {
    switch (msg.type) {
        case 'tilt.detected':
            showNotification('Tilt signal detected. Consider taking a break.', 'warning');
            loadTrustMetrics();
            break;
        case 'vault.locked':
            showNotification('Vault locked.', 'success');
            loadVaults();
            break;
        case 'vault.unlocked':
            showNotification('Vault unlocked.', 'success');
            loadVaults();
            break;
        case 'trust.updated':
            loadTrustMetrics();
            break;
        case 'bonus.available':
            showNotification(`Bonus available: ${msg.data?.casinoName ?? 'Casino'}`, 'info');
            addBonusTabBadge();
            break;
        case 'identity.nft_ready':
            showNotification(msg.data?.message ?? 'Your NFT identity waitlist is ready.', 'success');
            loadUserProfile();
            break;
    }
}

function updateWsIndicator(connected) {
    const el = document.getElementById('ws-status');
    if (!el) return;
    el.textContent = 'LIVE: ' + (connected ? 'ON' : 'OFF');
    el.className = 'ws-indicator ' + (connected ? 'connected' : 'disconnected');
}

function addBonusTabBadge() {
    const link = document.querySelector('.nav-link[data-tab="bonuses"]');
    if (link && !link.querySelector('.nav-badge')) {
        const badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.textContent = '!';
        link.appendChild(badge);
    }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function showNotification(text, type = 'info') {
    const banner = document.getElementById('notification-banner');
    const textEl = document.getElementById('notification-text');
    if (!banner || !textEl) return;
    textEl.textContent = text;
    banner.className = `notification-banner notification-${type}`;
    banner.style.display = 'flex';
    setTimeout(() => { banner.style.display = 'none'; }, 5000);
}

document.getElementById('notification-close')?.addEventListener('click', () => {
    const banner = document.getElementById('notification-banner');
    if (banner) banner.style.display = 'none';
});

// ============================================================
// UTILITIES
// ============================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setBarAndVal(id, value) {
    const bar = document.getElementById(id);
    const val = document.getElementById(id + '-val');
    if (bar) bar.style.width = Math.min(100, value) + '%';
    if (val) val.textContent = value;
}

function formatCurrency(value) {
    const amount = Number(value ?? 0);
    const sign = amount > 0 ? '+' : '';
    return `${sign}$${amount.toFixed(2)}`;
}

function formatPercent(value) {
    const amount = Number(value ?? 0);
    const sign = amount > 0 ? '+' : '';
    return `${sign}${amount.toFixed(1)}%`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function timeAgo(timestamp) {
    const ms = Date.now() - new Date(timestamp).getTime();
    if (ms < 60000) return 'just now';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm ago';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h ago';
    return Math.floor(ms / 86400000) + 'd ago';
}

function timeUntil(timestamp) {
    const ms = new Date(timestamp).getTime() - Date.now();
    if (ms <= 0) return 'now';
    return formatDuration(ms);
}

function formatDuration(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
