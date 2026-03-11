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

// Initialize Magic SDK
const magic = new Magic('pk_live_7CCBBE6E6EF6E6E6', { // Replace with actual key in .env if possible
    extensions: { 
        solana: new SolanaExtension({ 
            rpcUrl: 'https://api.mainnet-beta.solana.com' 
        }) 
    }
});

// === Initialization ===
window.addEventListener('DOMContentLoaded', async () => {
    // Check for token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
        userToken = urlToken;
        localStorage.setItem('tiltcheck-token', userToken);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await checkAuth();
    setupTabListeners();
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
    
    // Set basic user info
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
            
            // Update UI
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
        loadWallets(),
        loadActivity()
    ]);
}

async function loadUserProfile() {
    try {
        const response = await apiRequest(`/api/user/${currentUser.discordId}`);
        const user = await response.json();

        // Stats
        document.getElementById('totalTips').textContent = user.totalTips || 0;
        document.getElementById('totalValue').textContent = (user.totalTipsValue || 0).toFixed(2);
        document.getElementById('casinosSeen').textContent = user.casinosSeen || 0;

        // Analytics Tab
        document.getElementById('wageredAmount').textContent = (user.analytics?.wagered || 0).toFixed(2) + ' SOL';
        document.getElementById('depositedAmount').textContent = (user.analytics?.deposited || 0).toFixed(2) + ' SOL';
        
        const pl = user.analytics?.profit || 0;
        const plElem = document.getElementById('profitLoss');
        plElem.textContent = (pl >= 0 ? '+' : '') + pl.toFixed(2) + ' SOL';
        plElem.style.color = pl >= 0 ? 'var(--color-primary)' : '#ff4444';

        // Wallets Display
        if (user.degenIdentity?.magic_address) {
            document.getElementById('magicWalletDisplay').textContent = user.degenIdentity.magic_address;
        }
        if (user.degenIdentity?.primary_external_address) {
            document.getElementById('externalWalletDisplay').textContent = user.degenIdentity.primary_external_address;
        }

        // NFT Status
        updateNftStatus(user.degenIdentity);

        // Settings
        if (user.preferences) {
            document.getElementById('emailNotifications').checked = user.preferences.emailNotifications;
            document.getElementById('tiltWarnings').checked = user.preferences.tiltWarnings;
            document.getElementById('trustUpdates').checked = user.preferences.trustUpdates;
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
        document.getElementById('community').textContent = (trust.factors?.community || 0) + '%';
    } catch (err) {
        console.error('Failed to load trust metrics:', err);
    }
}

async function loadWallets() {
    // Currently using DegenIdentity for wallets, but can expand to a list
    const container = document.getElementById('wallets-list');
    container.innerHTML = '';

    if (currentUser.degenIdentity?.primary_external_address) {
        container.innerHTML += createWalletCard('External (Phantom/Trust)', currentUser.degenIdentity.primary_external_address, true);
    }
    if (currentUser.degenIdentity?.magic_address) {
        container.innerHTML += createWalletCard('TiltCheck Managed (Magic)', currentUser.degenIdentity.magic_address, !currentUser.degenIdentity.primary_external_address);
    }

    if (!container.innerHTML) {
        container.innerHTML = '<p style="color: var(--text-muted);">No wallets linked yet.</p>';
    }
}

function createWalletCard(provider, address, isPrimary) {
    return `
        <div class="wallet-card">
            <div class="wallet-info">
                <span style="font-weight: bold; font-size: 0.9rem;">${provider} ${isPrimary ? '<span class="badge-primary">PRIMARY</span>' : ''}</span>
                <span class="wallet-address">${address}</span>
            </div>
            <button class="btn btn-secondary" style="font-size: 0.7rem; padding: 0.4rem 0.8rem;">Copy</button>
        </div>
    `;
}

async function loadActivity() {
    try {
        const response = await apiRequest(`/api/user/${currentUser.discordId}/activity?limit=10`);
        const data = await response.json();

        const items = data.activities || [];
        const html = items.map(act => `
            <div class="activity-item">
                <div>
                    <span style="font-weight: 600;">${formatActivityType(act.type)}</span>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">${act.description || ''}</p>
                </div>
                <span class="activity-time">${new Date(act.timestamp).toLocaleDateString()}</span>
            </div>
        `).join('');

        document.getElementById('overviewActivity').innerHTML = html || '<p>No recent activity</p>';
        document.getElementById('fullActivityFeed').innerHTML = html || '<p>No activity history</p>';
    } catch (err) {
        console.error('Failed to load activity:', err);
    }
}

function formatActivityType(type) {
    const map = { 'tip': '💸 Tip Sent', 'scan': '🔍 Link Scanned', 'play': '🎮 Game Played', 'mint': '🛡️ NFT Minted' };
    return map[type] || '📌 ' + type;
}

// === Wallet Linking ===
async function linkMagicWallet() {
    const email = prompt('Enter your email for Magic link:');
    if (!email) return;

    try {
        const didToken = await magic.auth.loginWithEmailOTP({ email });
        const res = await apiRequest('/api/auth/magic/link', {
            method: 'POST',
            body: JSON.stringify({ didToken })
        });
        
        if (res.ok) {
            alert('Magic wallet linked successfully!');
            location.reload();
        }
    } catch (err) {
        alert('Magic link failed: ' + err.message);
    }
}

async function linkExternalWallet() {
    if (!window.solana) {
        alert('Please install a Solana wallet extension (Phantom, Trust, or Solflare)');
        return;
    }

    try {
        const resp = await window.solana.connect();
        const address = resp.publicKey.toString();
        const message = `Link TiltCheck Identity to: ${address}`;
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await window.solana.signMessage(encodedMessage, "utf8");

        const res = await apiRequest('/api/auth/wallet/link', {
            method: 'POST',
            body: JSON.stringify({
                address,
                signature: btoa(String.fromCharCode(...signedMessage.signature)),
                message
            })
        });

        if (res.ok) {
            alert('External wallet linked!');
            location.reload();
        }
    } catch (err) {
        alert('Wallet linking failed: ' + err.message);
    }
}

// === Identity NFT ===
function updateNftStatus(identity) {
    const status = document.getElementById('nftStatus');
    const mintBtn = document.getElementById('mintNowBtn');
    const savingsSec = document.getElementById('savingsSection');

    if (identity?.tos_nft_paid) {
        status.textContent = '🛡️ Identity Verified (NFT Minted)';
        status.style.color = 'var(--color-primary)';
        mintBtn.style.display = 'none';
        savingsSec.style.display = 'none';
    } else {
        status.textContent = '❌ Identity Not Verified';
        status.style.color = '#ff4444';
        mintBtn.style.display = 'block';
        
        const savings = identity?.nft_savings_sol || 0;
        if (savings > 0) {
            savingsSec.style.display = 'block';
            const pct = Math.min(100, (savings / 0.05) * 100);
            document.getElementById('savingsProgress').style.width = pct + '%';
            document.getElementById('savingsAmount').textContent = `${savings.toFixed(4)} / 0.05 SOL`;
            if (savings >= 0.05) mintBtn.textContent = 'Claim Identity NFT (Savings Ready!)';
        }
    }
}

async function startMinting() {
    try {
        const res = await apiRequest('/api/nft/checkout', { method: 'POST' });
        const data = await res.json();

        const modal = document.getElementById('payment-modal');
        modal.style.display = 'flex';
        document.getElementById('solanaPayLink').textContent = data.url;

        // Start polling
        const interval = setInterval(async () => {
            const vRes = await apiRequest('/api/nft/verify', {
                method: 'POST',
                body: JSON.stringify({ reference: data.reference })
            });
            const vData = await vRes.json();
            if (vData.success) {
                clearInterval(interval);
                document.getElementById('paymentStatus').textContent = '✅ Payment Verified!';
                setTimeout(() => location.reload(), 2000);
            }
        }, 5000);
    } catch (err) {
        alert('Checkout failed: ' + err.message);
    }
}

// === Settings ===
async function savePreferences() {
    const preferences = {
        emailNotifications: document.getElementById('emailNotifications').checked,
        tiltWarnings: document.getElementById('tiltWarnings').checked,
        trustUpdates: document.getElementById('trustUpdates').checked,
        publicProfile: document.getElementById('publicProfile').checked,
        showAnalytics: document.getElementById('showAnalytics').checked
    };

    try {
        const res = await apiRequest(`/api/user/${currentUser.discordId}/preferences`, {
            method: 'PUT',
            body: JSON.stringify({ preferences })
        });

        if (res.ok) alert('Preferences updated!');
    } catch (err) {
        alert('Failed to save preferences');
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
