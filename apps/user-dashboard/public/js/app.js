/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

// Global state
let currentUser = null;
let userToken = localStorage.getItem('tiltcheck-token');
let magic = null;

// === Initialization ===
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize Magic SDK safely
    try {
        if (typeof Magic !== 'undefined') {
            magic = new Magic('pk_live_7CCBBE6E6EF6E6E6', {
                extensions: { 
                    solana: new SolanaExtension({ 
                        rpcUrl: 'https://api.mainnet-beta.solana.com' 
                    }) 
                }
            });
        }
    } catch (err) {
        console.error('Magic SDK init failed:', err);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
        userToken = urlToken;
        localStorage.setItem('tiltcheck-token', userToken);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await checkAuth();
    setupTabListeners();
    setupNlpListener();
});

async function checkAuth() {
    if (!userToken) {
        showLogin();
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });

        if (response.ok) {
            currentUser = await response.json();
            showDashboard();
            loadAllData();
        } else {
            showLogin();
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        showLogin();
    }
}

function showLogin() {
    document.getElementById('not-logged-in').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('not-logged-in').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    document.getElementById('user-name').textContent = currentUser.username;
    if (currentUser.avatar) {
        document.getElementById('user-avatar').src = currentUser.avatar.startsWith('http') 
            ? currentUser.avatar 
            : `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
    }
}

// === Tab Navigation ===
function setupTabListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// === Data Loading ===
async function loadAllData() {
    await Promise.all([
        loadUserProfile(),
        loadTrustMetrics(),
        loadBonuses(),
        loadVaults(),
        loadActivity()
    ]);
}

async function loadUserProfile() {
    try {
        const response = await apiRequest(`/api/user/${currentUser.discordId}`);
        const user = await response.json();

        // Distribution Stats
        document.getElementById('totalJuice').textContent = (user.analytics?.totalJuice || 0).toFixed(2) + ' SOL';
        document.getElementById('totalTipsCaught').textContent = (user.analytics?.totalTipsCaught || 0).toFixed(2) + ' SOL';
        document.getElementById('eventCount').textContent = user.analytics?.eventCount || 0;

        // Wallet
        if (user.degenIdentity?.primary_external_address) {
            document.getElementById('externalWalletDisplay').textContent = user.degenIdentity.primary_external_address;
        }

        // Settings
        if (user.preferences) {
            document.getElementById('notifyBonus').checked = user.preferences.notifyBonus ?? true;
            document.getElementById('notifyJuice').checked = user.preferences.notifyJuice ?? true;
            document.getElementById('anonTipping').checked = user.preferences.anonTipping ?? false;
            document.getElementById('showAnalytics').checked = user.preferences.showAnalytics ?? true;
            document.getElementById('baseCurrency').value = user.preferences.baseCurrency || 'SOL';
        }

    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

async function loadTrustMetrics() {
    try {
        const response = await apiRequest(`/api/user/${currentUser.discordId}/trust`);
        const trust = await response.json();

        document.getElementById('trustScore').textContent = (trust.trustScore || 0).toFixed(1);
        document.getElementById('tiltLevel').textContent = trust.tiltLevel || 0;
        document.getElementById('consistency').textContent = (trust.factors?.consistency || 0) + '%';
    } catch (err) {
        console.error('Failed to load trust metrics:', err);
    }
}

// === Bonus Tracker Logic ===
async function loadBonuses() {
    const defaultBonuses = [
        { name: 'Stake Daily', hours: 24, lastClaimed: Date.now() - 1000 * 60 * 60 * 20, icon: '🥩' },
        { name: 'Shuffle Faucet', hours: 12, lastClaimed: Date.now() - 1000 * 60 * 60 * 13, icon: '🔀' },
        { name: 'Rollbit Reload', hours: 1, lastClaimed: Date.now() - 1000 * 60 * 30, icon: '🎲' }
    ];

    const container = document.getElementById('bonusGrid');
    container.innerHTML = '';

    defaultBonuses.forEach(bonus => {
        const card = document.createElement('div');
        card.className = 'bonus-card';
        card.onclick = () => claimBonus(bonus.name);
        
        const remaining = (bonus.lastClaimed + (bonus.hours * 3600000)) - Date.now();
        const isReady = remaining <= 0;

        card.innerHTML = `
            <div class="bonus-logo">${bonus.icon}</div>
            <div class="bonus-name">${bonus.name}</div>
            <div class="bonus-timer ${isReady ? 'ready' : ''}" data-remaining="${remaining}" data-interval="${bonus.hours}">
                ${isReady ? 'READY 🧃' : formatTime(remaining)}
            </div>
            <div class="bonus-status">${isReady ? 'Click to start timer' : 'Next claim available'}</div>
        `;
        container.appendChild(card);
    });

    startGlobalTimer();
}

function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startGlobalTimer() {
    if (window.bonusInterval) clearInterval(window.bonusInterval);
    window.bonusInterval = setInterval(() => {
        document.querySelectorAll('.bonus-timer').forEach(timer => {
            if (timer.classList.contains('ready')) return;
            let rem = parseInt(timer.dataset.remaining) - 1000;
            timer.dataset.remaining = rem;
            if (rem <= 0) {
                timer.classList.add('ready');
                timer.textContent = 'READY 🧃';
            } else {
                timer.textContent = formatTime(rem);
            }
        });
    }, 1000);
}

async function claimBonus(name) {
    alert(`Starting ${name} timer... Redirecting to casino.`);
    location.reload(); 
}

// === LockVaults Logic ===
async function loadVaults() {
    const container = document.getElementById('vaultsList');
    // Mock vaults for now
    const mockVaults = [
        { id: 'v1', amount: 5.5, currency: 'SOL', unlockDate: Date.now() + 1000 * 60 * 60 * 24 * 3, penalty: 15 },
        { id: 'v2', amount: 150, currency: 'USDC', unlockDate: Date.now() - 1000 * 60 * 60, penalty: 10 }
    ];

    if (mockVaults.length === 0) {
        container.innerHTML = '<div class="card" style="text-align: center; color: var(--text-muted);"><p>No active vaults found. Use <code>/lockvault</code> in Discord to lock your gains.</p></div>';
        return;
    }

    container.innerHTML = mockVaults.map(v => {
        const isLocked = v.unlockDate > Date.now();
        const pct = isLocked ? 65 : 100; // Mock progress
        return `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem;">🔒 ${v.amount} ${v.currency} Vault</h3>
                        <p style="font-size: 0.85rem; color: var(--text-muted);">Unlocks: ${new Date(v.unlockDate).toLocaleDateString()}</p>
                    </div>
                    <span class="badge-primary">${isLocked ? 'LOCKED' : 'READY'}</span>
                </div>
                <div class="progress-container" style="margin: 1.5rem 0 0.5rem;">
                    <div class="progress-bar" style="width: ${pct}%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
                    <span>Progress: ${pct}%</span>
                    <span>Penalty: ${v.penalty}%</span>
                </div>
                ${isLocked ? `
                    <button class="btn btn-secondary" style="width: 100%; margin-top: 1.5rem; color: var(--color-danger); border-color: rgba(255,68,68,0.2);" onclick="emergencyUnlock('${v.id}')">
                        Emergency Panic Unlock (${v.penalty}% Fee)
                    </button>
                ` : `
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;" onclick="withdrawVault('${v.id}')">
                        Withdraw to Wallet
                    </button>
                `}
            </div>
        `;
    }).join('');
}

window.emergencyUnlock = (id) => {
    if (confirm('Are you sure? This will burn a portion of your funds as a penalty for breaking the vault early.')) {
        alert('Emergency unlock initiated. Funds (minus penalty) sent to linked wallet.');
    }
};

window.withdrawVault = (id) => {
    alert('Withdrawal successful! Funds sent to your linked wallet.');
};

// === Activity Feed ===
async function loadActivity() {
    try {
        const response = await apiRequest(`/api/user/${currentUser.discordId}/activity?limit=10`);
        const data = await response.json();
        const items = data.activities || [];
        const html = items.map(act => `
            <div class="activity-item">
                <div>
                    <span style="font-weight: 600;">${act.type === 'juice' ? '🧃 Juice Caught' : '💸 Tip Caught'}</span>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">${act.description || ''}</p>
                </div>
                <span class="activity-time">${new Date(act.timestamp).toLocaleDateString()}</span>
            </div>
        `).join('');

        document.getElementById('overviewActivity').innerHTML = html || '<p style="color: var(--text-muted);">No recent juice caught.</p>';
        document.getElementById('fullActivityFeed').innerHTML = html || '<p style="color: var(--text-muted);">No activity history.</p>';
    } catch (err) {
        console.error('Failed to load activity:', err);
    }
}

// === Settings ===
async function savePreferences() {
    const preferences = {
        notifyBonus: document.getElementById('notifyBonus').checked,
        notifyJuice: document.getElementById('notifyJuice').checked,
        anonTipping: document.getElementById('anonTipping').checked,
        showAnalytics: document.getElementById('showAnalytics').checked,
        baseCurrency: document.getElementById('baseCurrency').value
    };

    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/preferences`, {
            method: 'PUT',
            body: JSON.stringify({ preferences })
        });
        if (res.ok) alert('Degen Settings Synced to Discord! ✅');
    } catch (err) {
        alert('Sync failed.');
    }
}

// === NLP Logic ===
function setupNlpListener() {
    const input = document.getElementById('nlpInput');
    input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = input.value;
            if (!query) return;
            
            input.disabled = true;
            input.value = 'Agent is thinking...';
            
            try {
                const res = await apiRequest('/api/agent/query', {
                    method: 'POST',
                    body: JSON.stringify({ query })
                });
                const data = await res.json();
                
                alert(`🤖 DIA: ${data.response}`);
            } catch (err) {
                alert('Agent query failed.');
            } finally {
                input.disabled = false;
                input.value = '';
            }
        }
    });
}

function runQuickQuery(q) {
    document.getElementById('nlpInput').value = q;
    document.getElementById('nlpInput').focus();
}

// === Wallet Linking ===
async function linkMagicWallet() {
    if (!magic) {
        alert('Magic SDK is still initializing or blocked. Please try again in a moment.');
        return;
    }
    const email = prompt('Enter your email for Magic link:');
    if (!email) return;
    try {
        const didToken = await magic.auth.loginWithEmailOTP({ email });
        const res = await apiRequest('/api/auth/magic/link', {
            method: 'POST',
            body: JSON.stringify({ didToken })
        });
        if (res.ok) {
            alert('Magic wallet linked! Payouts will now go here.');
            location.reload();
        }
    } catch (err) {
        alert('Magic link failed: ' + err.message);
    }
}

// === Helpers ===
async function apiRequest(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
}

function handleLogout() {
    localStorage.removeItem('tiltcheck-token');
    location.href = '/';
}
