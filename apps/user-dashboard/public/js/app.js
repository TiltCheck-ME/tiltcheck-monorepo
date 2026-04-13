// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13

'use strict';

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let ws = null;
let vaultState = { locked: false, unlockAt: null, amount: 0 };
let profileState = {
    degenIdentity: null,
    nftIdentity: null
};
let selectedVaultDuration = 14400000; // 4h default
let vaultCountdownTimer = null;
let onboardingSettings = {
    riskLevel: 'moderate',
    cooldownEnabled: true,
    voiceInterventionEnabled: true,
    threshold: 500,
    notifications: {
        tips: true,
        trivia: true,
        promos: false
    },
    trustEngineOptIn: {
        message_contents: false,
        financial_data: false,
        session_telemetry: false,
        notify_nft_identity_ready: false
    },
    primaryExternalAddress: null
};
let profitGuardSaveTimer = null;

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
    setupIdentityPanel();
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
        loadOnboardingSettings(),
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
        profileState.degenIdentity = user.degenIdentity || null;
        profileState.nftIdentity = user.nftIdentity || null;

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
            onboardingSettings.primaryExternalAddress = addr;
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

        renderSurveyIdentityPanel();
    } catch (err) { console.error('[Profile]', err); }
}

async function loadOnboardingSettings() {
    try {
        const res = await apiRequest('/api/user/onboard');
        if (!res.ok) return;

        const data = await res.json();
        const onboarding = data.onboarding ?? {};

        onboardingSettings = {
            ...onboardingSettings,
            riskLevel: onboarding.riskLevel || onboardingSettings.riskLevel,
            cooldownEnabled: onboarding.cooldownEnabled !== false,
            voiceInterventionEnabled: onboarding.voiceInterventionEnabled !== false,
            threshold: normalizeProfitGuardThreshold(onboarding.redeemThreshold),
            notifications: {
                tips: onboarding.notifications?.tips !== false,
                trivia: onboarding.notifications?.trivia !== false,
                promos: onboarding.notifications?.promos === true
            },
            trustEngineOptIn: {
                ...onboardingSettings.trustEngineOptIn,
                ...(onboarding.trustEngineOptIn || {})
            }
        };

        renderProfitGuardSettings();
        renderSurveyIdentityPanel();
    } catch (err) { console.error('[Onboarding]', err); }
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
        const context = data.context ?? {};
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];

        setText('securedAmount', formatCurrency(stats.securedAmount ?? 0));
        setText('securedWins', stats.securedWins ?? 0);
        setText('redeemWindowCount', stats.redeemWindowCount ?? 0);
        setText('rtpDrift', formatPercent(stats.rtpDrift ?? 0));

        const chart = document.getElementById('plChart');
        if (chart) {
            if (sessions.length === 0) {
                chart.classList.remove('chart-stack');
                chart.innerHTML = '<div class="chart-placeholder">No session data yet. Install the Chrome extension to track sessions.</div>';
            } else {
                chart.classList.add('chart-stack');
                chart.innerHTML = renderSessionChart(sessions, context);
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
                breakdown.innerHTML = renderCasinoBreakdown(Array.from(byCasino.entries()));
            }
        }
    } catch (err) { console.error('[Sessions]', err); }
}

function getSessionOutcomeType(pl) {
    if (pl > 0) return 'up_session';
    if (pl < 0) return 'down_session';
    return 'flat_session';
}

function getSessionOutcomeLabel(outcome) {
    switch (outcome) {
        case 'secured_win':
            return 'SECURED WIN';
        case 'redeem_window':
            return 'REDEEM WINDOW';
        case 'up_session':
            return 'UP SESSION';
        case 'down_session':
            return 'DOWN SESSION';
        default:
            return 'FLAT SESSION';
    }
}

function buildSessionOutcomeText(session, pl, redeemThreshold) {
    if (session.outcome === 'secured_win') {
        return `${formatCurrency(pl)} · ${formatCurrency(Number(session.secured_amount ?? 0))} hit the vault`;
    }

    if (session.outcome === 'redeem_window') {
        if (Number(redeemThreshold ?? 0) > 0) {
            return `${formatCurrency(pl)} · crossed your ${formatCurrency(redeemThreshold)} redeem line`;
        }
        return `${formatCurrency(pl)} · green enough to secure`;
    }

    if (session.outcome === 'up_session') {
        return `${formatCurrency(pl)} · still unclaimed`;
    }

    if (session.outcome === 'down_session') {
        return `${formatCurrency(pl)} · rinse alert`;
    }

    return `${formatCurrency(pl)} · dead flat`;
}

function renderSessionChart(sessions, context = {}) {
    const recentSessions = sessions.slice(0, 7).reverse();
    const peak = Math.max(...recentSessions.map(session => Math.abs(Number(session.net_pl ?? 0))), 1);
    const positiveCount = recentSessions.filter(session => Number(session.net_pl ?? 0) > 0).length;
    const totalNet = recentSessions.reduce((sum, session) => sum + Number(session.net_pl ?? 0), 0);
    const redeemWindowCount = recentSessions.filter(session => session.outcome === 'redeem_window').length;

    return `
        <div class="chart-stack">
            <div class="chart-summary-row">
                <div class="chart-summary-pill">
                    <span class="chart-summary-label">Last ${recentSessions.length} sessions</span>
                    <span class="chart-summary-value">${positiveCount} green / ${recentSessions.length - positiveCount} red</span>
                </div>
                <div class="chart-summary-pill">
                    <span class="chart-summary-label">Net swing</span>
                    <span class="chart-summary-value">${formatCurrency(totalNet)}</span>
                </div>
                <div class="chart-summary-pill">
                    <span class="chart-summary-label">Redeem pressure</span>
                    <span class="chart-summary-value">${redeemWindowCount} window${redeemWindowCount === 1 ? '' : 's'}</span>
                </div>
            </div>
            <div class="chart-shell">
                <div class="chart-panel">
                    <div class="chart-panel-title">Session P/L bars</div>
                    <div class="chart-bars chart-bars-tall">
                        ${recentSessions.map((session, index) => {
                            const pl = Number(session.net_pl ?? 0);
                            const height = Math.max(10, Math.round((Math.abs(pl) / peak) * 100));
                            const completedAt = session.completed_at || session.created_at || Date.now();
                            const label = new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            const state = pl > 0 ? 'positive' : (pl < 0 ? 'negative' : 'neutral');
                            return `
                                <div class="chart-col" title="${escapeHtml(`${label} · ${formatCurrency(pl)}`)}">
                                    <span class="chart-y-label">${formatCurrency(pl)}</span>
                                    <div class="chart-bar-wrap">
                                        <div class="chart-bar chart-bar-soft ${state}" style="height:${height}%"></div>
                                    </div>
                                    <span class="chart-x-label">S${index + 1}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="chart-panel">
                    <div class="chart-panel-title">Session readout</div>
                    <div class="session-feed">
                        ${recentSessions.map((session, index) => {
                            const pl = Number(session.net_pl ?? 0);
                            const completedAt = session.completed_at || session.created_at || Date.now();
                            const casino = session.casino_name || session.casino || `Session ${index + 1}`;
                            const outcome = session.outcome || getSessionOutcomeType(pl);
                            const outcomeLabel = session.outcome_label || getSessionOutcomeLabel(outcome);
                            const outcomeText = buildSessionOutcomeText(session, pl, context.redeemThreshold);
                            return `
                                <div class="activity-item activity-item-${escapeHtml(outcome)}">
                                    <span class="activity-type activity-type-${escapeHtml(outcome)}">${escapeHtml(outcomeLabel)}</span>
                                    <span class="activity-desc">${escapeHtml(casino)} · ${escapeHtml(outcomeText)}</span>
                                    <span class="activity-time">${timeAgo(completedAt)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCasinoBreakdown(entries) {
    const ranked = entries
        .sort(([, a], [, b]) => Math.abs(Number(b.net ?? 0)) - Math.abs(Number(a.net ?? 0)))
        .slice(0, 6);
    const peak = Math.max(...ranked.map(([, summary]) => Math.abs(Number(summary.net ?? 0))), 1);

    return `
        <div class="mini-bar-list">
            ${ranked.map(([casino, summary]) => {
                const net = Number(summary.net ?? 0);
                const width = Math.max(8, Math.round((Math.abs(net) / peak) * 100));
                const state = net >= 0 ? 'positive' : 'negative';
                return `
                    <div class="mini-bar-item">
                        <span class="mini-bar-label">${escapeHtml(casino)}</span>
                        <div class="mini-bar-track">
                            <div class="mini-bar-fill ${state}" style="width:${width}%"></div>
                        </div>
                        <span class="mini-bar-value">${summary.count}x · ${formatCurrency(net)}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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
        const readyNow = active.filter(isBonusReady).length;
        const nerfContainer = document.getElementById('bonus-nerf-alerts');

        setText('bonusReadyNow', readyNow);
        setText('bonusActiveTracked', active.length);
        setText('bonusClaimsLogged', history.length);
        setText('bonusNerfCount', nerfs.length);

        if (nerfs.length > 0) {
            if (nerfContainer) {
                nerfContainer.style.display = 'block';
                nerfContainer.innerHTML = nerfs.map(n => `
                    <div class="nerf-alert">
                        <strong>${escapeHtml(n.casino)}</strong> bonus nerfed: ${escapeHtml(n.description)}
                    </div>
                `).join('');
            }
        } else if (nerfContainer) {
            nerfContainer.style.display = 'none';
            nerfContainer.innerHTML = '';
        }

        const bonusChart = document.getElementById('bonusHistoryChart');
        if (bonusChart) {
            bonusChart.classList.add('chart-stack');
            bonusChart.innerHTML = renderBonusHistoryChart(active, history, nerfs);
        }

        if (active.length === 0) {
            grid.innerHTML = '<div class="activity-empty">No bonuses tracked.</div>';
        } else {
            grid.innerHTML = active.map(bonus => {
                const isReady = isBonusReady(bonus);
                const claimCount = getBonusClaimCount(bonus);
                const nextClaimAt = getBonusNextClaimAt(bonus);
                return `
                <div class="bonus-card ${isReady ? 'ready' : ''}">
                    <div class="bonus-casino">${escapeHtml(getBonusCasinoName(bonus))}</div>
                    <div class="bonus-desc">${escapeHtml(getBonusDescription(bonus))}</div>
                    <div class="bonus-cooldown ${isReady ? 'ready' : ''}">${isReady ? 'READY TO CLAIM' : 'Resets in ' + timeUntil(nextClaimAt)}</div>
                    <div class="bonus-claim-row">
                        <span>Claims tracked</span>
                        <strong>${claimCount}</strong>
                    </div>
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
                    <span class="activity-type">${escapeHtml(getBonusCasinoName(h))}</span>
                    <span class="activity-desc">${escapeHtml(getBonusDescription(h))}</span>
                    <span class="activity-time">${timeAgo(getBonusClaimedAt(h) || getBonusCreatedAt(h) || Date.now())}</span>
                </div>
            `).join('');
        } else if (historyEl) {
            historyEl.innerHTML = '<div class="activity-empty">No history.</div>';
        }
    } catch (err) { console.error('[Bonuses]', err); }
}

function renderBonusHistoryChart(active, history, nerfs) {
    const recentHistory = history
        .map((entry, index) => ({
            label: getBonusCasinoName(entry) || `Claim ${index + 1}`,
            claimedAt: getBonusClaimedAt(entry) || getBonusCreatedAt(entry),
            createdAt: getBonusCreatedAt(entry)
        }))
        .filter(entry => entry.claimedAt || entry.createdAt)
        .sort((a, b) => new Date(a.claimedAt || a.createdAt).getTime() - new Date(b.claimedAt || b.createdAt).getTime())
        .slice(-7);

    if (recentHistory.length === 0) {
        return `
            <div class="chart-stack">
                <div class="chart-summary-row">
                    <div class="chart-summary-pill">
                        <span class="chart-summary-label">Tracked casinos</span>
                        <span class="chart-summary-value">${active.length}</span>
                    </div>
                    <div class="chart-summary-pill">
                        <span class="chart-summary-label">Recent nerfs</span>
                        <span class="chart-summary-value">${nerfs.length}</span>
                    </div>
                </div>
                <div class="chart-placeholder">No claim history yet. Once claims start landing, this panel shows cadence and cooldown pressure.</div>
            </div>
        `;
    }

    const bars = buildBonusClaimDaySeries(recentHistory);
    const peak = Math.max(...bars.map(item => item.count), 1);
    const lastClaim = recentHistory[recentHistory.length - 1];

    return `
        <div class="chart-stack">
            <div class="chart-summary-row">
                <div class="chart-summary-pill">
                    <span class="chart-summary-label">Tracked casinos</span>
                    <span class="chart-summary-value">${active.length}</span>
                </div>
                <div class="chart-summary-pill">
                    <span class="chart-summary-label">Claims in view</span>
                    <span class="chart-summary-value">${recentHistory.length}</span>
                </div>
                <div class="chart-summary-pill">
                    <span class="chart-summary-label">Last claim</span>
                    <span class="chart-summary-value">${timeAgo(lastClaim.claimedAt || lastClaim.createdAt)}</span>
                </div>
                <div class="chart-summary-pill">
                    <span class="chart-summary-label">Recent nerfs</span>
                    <span class="chart-summary-value">${nerfs.length}</span>
                </div>
            </div>
            <div class="chart-shell single-column">
                <div class="chart-panel">
                    <div class="chart-panel-title">Claim cadence</div>
                    <div class="chart-bars chart-bars-tall">
                        ${bars.map((item) => `
                            <div class="chart-col" title="${escapeHtml(`${item.label}: ${item.count} claim${item.count === 1 ? '' : 's'}`)}">
                                <span class="chart-y-label">${item.count}</span>
                                <div class="chart-bar-wrap">
                                    <div class="chart-bar chart-bar-soft positive" style="height:${Math.max(10, Math.round((item.count / peak) * 100))}%"></div>
                                </div>
                                <span class="chart-x-label">${escapeHtml(item.shortLabel)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="chart-note">
                        <strong>${escapeHtml(lastClaim.label)}</strong> is the latest logged claim. This panel tracks claim cadence, not payout size, so it stays stable across mixed casino payloads.
                    </p>
                </div>
            </div>
        </div>
    `;
}

function buildBonusClaimDaySeries(historyEntries) {
    const bucketMap = new Map();

    historyEntries.forEach(entry => {
        const date = new Date(entry.claimedAt || entry.createdAt);
        const key = date.toISOString().slice(0, 10);
        const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const shortLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).replace(' ', '/');
        const current = bucketMap.get(key) || { key, label, shortLabel, count: 0 };
        current.count += 1;
        bucketMap.set(key, current);
    });

    return Array.from(bucketMap.values()).slice(-7);
}

function getBonusCasinoName(bonus) {
    return bonus?.casinoName || bonus?.casino_name || bonus?.casino || 'Casino';
}

function getBonusDescription(bonus) {
    return bonus?.description || bonus?.bonus_name || bonus?.name || 'Bonus tracked';
}

function getBonusClaimedAt(bonus) {
    return bonus?.claimedAt || bonus?.claimed_at || bonus?.last_claimed_at || null;
}

function getBonusCreatedAt(bonus) {
    return bonus?.createdAt || bonus?.created_at || bonus?.updated_at || null;
}

function isBonusReady(bonus) {
    const nextClaimAt = getBonusNextClaimAt(bonus);
    return !nextClaimAt || new Date(nextClaimAt) <= new Date();
}

function getBonusClaimCount(bonus) {
    const numericValue = Number(
        bonus?.claimCount ??
        bonus?.claim_count ??
        bonus?.claims_count ??
        bonus?.times_claimed ??
        0
    );
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function getBonusNextClaimAt(bonus) {
    return bonus?.nextClaimAt || bonus?.next_claim_at || bonus?.cooldown_ends_at || null;
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
    const profitGuardToggle = document.getElementById('profit-guard-toggle');
    const profitGuardThreshold = document.getElementById('profit-guard-threshold');

    profitGuardToggle?.addEventListener('change', e => {
        onboardingSettings.cooldownEnabled = e.target.checked;
        renderProfitGuardSettings();
        setProfitGuardStatus('Saving...');
        queueProfitGuardSave();
    });

    profitGuardThreshold?.addEventListener('input', e => {
        onboardingSettings.threshold = normalizeProfitGuardThreshold(e.target.value);
        renderProfitGuardSettings();
        setProfitGuardStatus('Saving...');
        queueProfitGuardSave();
    });

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

function renderProfitGuardSettings() {
    const toggle = document.getElementById('profit-guard-toggle');
    const thresholdInput = document.getElementById('profit-guard-threshold');

    if (toggle) toggle.checked = onboardingSettings.cooldownEnabled;
    if (thresholdInput) {
        thresholdInput.value = String(normalizeProfitGuardThreshold(onboardingSettings.threshold));
        thresholdInput.disabled = !onboardingSettings.cooldownEnabled;
    }
}

function queueProfitGuardSave() {
    if (profitGuardSaveTimer) clearTimeout(profitGuardSaveTimer);
    profitGuardSaveTimer = setTimeout(saveProfitGuardSettings, 400);
}

async function saveProfitGuardSettings() {
    try {
        const res = await apiRequest('/api/user/onboard', {
            method: 'POST',
            body: JSON.stringify({
                tos_accepted: true,
                primary_external_address: onboardingSettings.primaryExternalAddress,
                risk_level: onboardingSettings.riskLevel,
                cooldown_enabled: onboardingSettings.cooldownEnabled,
                voice_intervention_enabled: onboardingSettings.voiceInterventionEnabled,
                redeem_threshold: normalizeProfitGuardThreshold(onboardingSettings.threshold),
                notifications: onboardingSettings.notifications,
                trust_engine_opt_in: onboardingSettings.trustEngineOptIn
            })
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setProfitGuardStatus(data.error || 'Save failed.', true);
            return;
        }

        onboardingSettings.threshold = normalizeProfitGuardThreshold(onboardingSettings.threshold);
        renderProfitGuardSettings();
        setProfitGuardStatus('Saved.');
    } catch (err) {
        console.error('[Profit Guard]', err);
        setProfitGuardStatus('Save failed.', true);
    }
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
                    profileState.nftIdentity = data.nftIdentity;
                    setText('nftIdentityStatus', data.nftIdentity.status);
                    setText('nftIdentitySub', data.nftIdentity.detail);
                }
                if (form) form.style.display = 'none';
                onboardingSettings.primaryExternalAddress = address;
                renderSurveyIdentityPanel();
                showNotification('Wallet linked.', 'success');
                loadUserProfile();
            }
        } catch (err) { showNotification('Error linking wallet.', 'error'); }
    });
}

function setupIdentityPanel() {
    const fieldMap = [
        ['identity-optin-notify', 'notify_nft_identity_ready'],
        ['identity-optin-session', 'session_telemetry'],
        ['identity-optin-financial', 'financial_data'],
        ['identity-optin-messages', 'message_contents']
    ];

    fieldMap.forEach(([elementId, settingKey]) => {
        document.getElementById(elementId)?.addEventListener('change', e => {
            onboardingSettings.trustEngineOptIn[settingKey] = e.target.checked;
            renderSurveyIdentityPanel();
            setIdentitySettingsStatus('Changes pending.');
        });
    });

    document.getElementById('save-identity-settings-btn')?.addEventListener('click', saveIdentitySettings);
}

function renderSurveyIdentityPanel() {
    const statusLabel = document.getElementById('surveyReadinessLabel');
    const scoreEl = document.getElementById('surveyReadinessScore');
    const subEl = document.getElementById('surveyReadinessSub');
    const checklistEl = document.getElementById('surveyReadinessChecklist');

    const notifyCheckbox = document.getElementById('identity-optin-notify');
    const sessionCheckbox = document.getElementById('identity-optin-session');
    const financialCheckbox = document.getElementById('identity-optin-financial');
    const messageCheckbox = document.getElementById('identity-optin-messages');

    const identity = profileState.degenIdentity || {};
    const nftIdentity = profileState.nftIdentity || {};
    const walletLinked = Boolean(onboardingSettings.primaryExternalAddress || identity.primary_external_address || identity.magic_address);
    const tosAccepted = identity.tos_accepted === true || nftIdentity.tosAccepted === true;
    const controls = onboardingSettings.trustEngineOptIn || {};
    const readyCount = [
        tosAccepted,
        walletLinked,
        controls.session_telemetry === true,
        controls.financial_data === true,
        controls.message_contents === true
    ].filter(Boolean).length;

    const readiness = getSurveyReadinessSummary({
        readyCount,
        tosAccepted,
        walletLinked,
        sessionTelemetry: controls.session_telemetry === true,
        financialData: controls.financial_data === true,
        messageContents: controls.message_contents === true
    });

    if (notifyCheckbox) notifyCheckbox.checked = controls.notify_nft_identity_ready === true;
    if (sessionCheckbox) sessionCheckbox.checked = controls.session_telemetry === true;
    if (financialCheckbox) financialCheckbox.checked = controls.financial_data === true;
    if (messageCheckbox) messageCheckbox.checked = controls.message_contents === true;

    if (statusLabel) {
        statusLabel.textContent = readiness.label;
        statusLabel.className = `identity-status-pill ${readiness.tone}`;
    }
    if (scoreEl) scoreEl.textContent = `${readyCount}/5 lanes ready`;
    if (subEl) {
        subEl.textContent = nftIdentity.detail
            || readiness.detail;
    }

    if (checklistEl) {
        checklistEl.innerHTML = buildIdentityChecklist([
            {
                title: 'Terms accepted',
                description: tosAccepted
                    ? 'The profile has a real owner attached. No ghost identity junk.'
                    : 'Accept the terms first so the identity and survey profile belong to a real owner.',
                ready: tosAccepted
            },
            {
                title: 'Wallet linked',
                description: walletLinked
                    ? 'Wallet attached. Survey payouts and identity notices can point to a real address without custody.'
                    : 'Link an external wallet so payout and identity flows have somewhere legit to land.',
                ready: walletLinked
            },
            {
                title: 'Session telemetry lane',
                description: controls.session_telemetry === true
                    ? 'Gameplay/session history can be used to avoid dumb survey matches.'
                    : 'Turn this on if you want survey matching to use session behavior instead of guessing.',
                ready: controls.session_telemetry === true
            },
            {
                title: 'Financial lane',
                description: controls.financial_data === true
                    ? 'Deposit/loss context can help filter out low-fit offers.'
                    : 'Turn this on if you want higher-signal survey routing based on bankroll behavior.',
                ready: controls.financial_data === true
            },
            {
                title: 'Message context lane',
                description: controls.message_contents === true
                    ? 'Message/context signals are on for tighter routing.'
                    : 'Optional, but this gives the survey profile sharper context than raw numbers alone.',
                ready: controls.message_contents === true
            }
        ]);
    }
}

function getSurveyReadinessSummary({ readyCount, tosAccepted, walletLinked, sessionTelemetry, financialData, messageContents }) {
    if (!tosAccepted || !walletLinked) {
        return {
            label: 'Blocked',
            tone: 'blocked',
            detail: 'Terms and wallet linkage are the minimum. Without both, survey routing stays bench-side.'
        };
    }

    if (sessionTelemetry && financialData && messageContents) {
        return {
            label: 'Match Ready',
            tone: 'ready',
            detail: 'The profile is loaded with the core lanes needed for high-signal survey routing and first-wave identity notice.'
        };
    }

    if (readyCount >= 3) {
        return {
            label: 'Partial Signal',
            tone: 'partial',
            detail: 'You are close. Flip the remaining data lanes if you want stronger survey fit and fewer trash offers.'
        };
    }

    return {
        label: 'Thin Profile',
        tone: 'blocked',
        detail: 'The profile exists, but the matching lanes are still thin. Turn on more opt-ins if you want real routing value.'
    };
}

function buildIdentityChecklist(items) {
    return items.map(item => `
        <div class="identity-check-item ${item.ready ? 'ready' : 'blocked'}">
            <span class="identity-check-icon">${item.ready ? 'OK' : '!'}</span>
            <div class="identity-check-copy">
                <span class="identity-check-title">${escapeHtml(item.title)}</span>
                <span class="identity-check-desc">${escapeHtml(item.description)}</span>
            </div>
        </div>
    `).join('');
}

async function saveIdentitySettings() {
    const button = document.getElementById('save-identity-settings-btn');
    if (button) {
        button.disabled = true;
        button.textContent = 'Saving...';
    }
    setIdentitySettingsStatus('Saving...');

    try {
        const res = await apiRequest('/api/user/onboard', {
            method: 'POST',
            body: JSON.stringify({
                tos_accepted: true,
                primary_external_address: onboardingSettings.primaryExternalAddress,
                risk_level: onboardingSettings.riskLevel,
                cooldown_enabled: onboardingSettings.cooldownEnabled,
                voice_intervention_enabled: onboardingSettings.voiceInterventionEnabled,
                redeem_threshold: normalizeProfitGuardThreshold(onboardingSettings.threshold),
                notifications: onboardingSettings.notifications,
                trust_engine_opt_in: onboardingSettings.trustEngineOptIn
            })
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setIdentitySettingsStatus(data.error || 'Save failed.', true);
            return;
        }

        const data = await res.json().catch(() => ({}));
        if (data?.identity) profileState.degenIdentity = data.identity;
        if (data?.nftIdentity) {
            profileState.nftIdentity = data.nftIdentity;
            setText('nftIdentityStatus', data.nftIdentity.status);
            setText('nftIdentitySub', data.nftIdentity.detail);
        }

        renderSurveyIdentityPanel();
        setIdentitySettingsStatus('Saved.');
        showNotification('Identity settings saved.', 'success');
        loadUserProfile();
    } catch (err) {
        console.error('[Identity Settings]', err);
        setIdentitySettingsStatus('Save failed.', true);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Save Identity Settings';
        }
    }
}

function setIdentitySettingsStatus(message, isError = false) {
    const el = document.getElementById('identitySettingsStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? '#ff6b6b' : '';
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

function normalizeProfitGuardThreshold(value) {
    const amount = Number.parseInt(value, 10);
    return Number.isFinite(amount) && amount > 0 ? amount : 500;
}

function setProfitGuardStatus(message, isError = false) {
    const el = document.getElementById('profitGuardStatus');
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? 'var(--color-danger)' : '';
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
