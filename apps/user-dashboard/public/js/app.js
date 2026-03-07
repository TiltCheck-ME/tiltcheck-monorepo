/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
// User Dashboard Client-Side Logic

let currentUser = null;

// Check auth on load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            currentUser = await response.json();
            showDashboard();
        }
    } catch {
        // Not logged in
    }
});

function showDashboard() {
    document.getElementById('not-logged-in').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    // Set user info
    const avatarUrl = `https://cdn.discordapp.com/avatars/${currentUser.user.id}/${currentUser.user.avatar}.png`;
    document.getElementById('user-avatar').src = avatarUrl;
    document.getElementById('user-name').textContent = currentUser.user.username;
    
    loadProfile();
    loadWallets();
    loadTransactions();
    loadActivity();
    loadSettings();
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active states
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

async function loadProfile() {
    const response = await fetch('/api/profile');
    const profile = await response.json();
    
    // Update stats
    document.getElementById('total-earnings').textContent = `$${profile.qualifyfirst.earningsUSD.toFixed(2)}`;
    document.getElementById('tips-sent').textContent = profile.stats.tipsSent;
    document.getElementById('surveys-completed').textContent = profile.stats.surveysCompleted;
    document.getElementById('games-played').textContent = profile.stats.gamesPlayed;
    
    // QualifyFirst profile
    const qfHtml = Object.entries(profile.qualifyfirst.traits).map(([key, value]) => `
        <div class="profile-field">
            <span class="field-label">${key}:</span>
            <span class="field-value">${value}</span>
        </div>
    `).join('');
    
    document.getElementById('qf-profile').innerHTML = qfHtml;
    document.getElementById('qf-earnings').textContent = `$${profile.qualifyfirst.earningsUSD.toFixed(2)}`;
}

async function loadWallets() {
    const response = await fetch('/api/wallets');
    const { wallets } = await response.json();
    
    const html = wallets.map(wallet => `
        <div class="wallet-card ${wallet.isPrimary ? 'primary' : ''}">
            <div class="wallet-header">
                <span class="wallet-provider">${wallet.provider}</span>
                ${wallet.isPrimary ? '<span class="badge">Primary</span>' : ''}
            </div>
            <div class="wallet-address">${wallet.address.substring(0, 16)}...${wallet.address.slice(-8)}</div>
            ${!wallet.isPrimary ? `<button onclick="setPrimary('${wallet.id}')" class="btn-small">Set Primary</button>` : ''}
        </div>
    `).join('');
    
    document.getElementById('wallets-list').innerHTML = html || '<p>No wallets registered</p>';
}

async function loadTransactions() {
    const response = await fetch('/api/transactions');
    const { transactions } = await response.json();
    
    const html = transactions.map(tx => `
        <div class="transaction ${tx.direction}">
            <div class="tx-icon">${tx.direction === 'sent' ? '↑' : '↓'}</div>
            <div class="tx-details">
                <div class="tx-type">${tx.type}</div>
                <div class="tx-amount">${tx.amount} ${tx.token}</div>
                <div class="tx-party">${tx.direction === 'sent' ? 'To: ' + tx.to : 'From: ' + tx.from}</div>
                <div class="tx-time">${new Date(tx.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('transactions-list').innerHTML = html;
}

async function loadActivity() {
    const response = await fetch('/api/activity');
    const { activities } = await response.json();
    
    const html = activities.map(act => `
        <div class="activity-item">
            <span class="activity-icon">${getActivityIcon(act.type)}</span>
            <div class="activity-details">
                <div class="activity-description">${act.description}</div>
                <div class="activity-time">${new Date(act.timestamp).toLocaleString()}</div>
            </div>
            ${act.earned ? `<span class="activity-earned">+$${act.earned}</span>` : ''}
            ${act.points ? `<span class="activity-points">+${act.points} pts</span>` : ''}
        </div>
    `).join('');
    
    document.getElementById('activity-feed').innerHTML = html;
    document.getElementById('recent-activity').innerHTML = `<h3>Recent Activity</h3>${html}`;
}

async function loadSettings() {
    const response = await fetch('/api/preferences');
    const prefs = await response.json();
    
    document.getElementById('notify-tips').checked = prefs.notifications.tipReceived;
    document.getElementById('notify-surveys').checked = prefs.notifications.surveyMatch;
    document.getElementById('notify-games').checked = prefs.notifications.gameInvite;
    
    document.getElementById('privacy-profile').checked = prefs.privacy.showProfile;
    document.getElementById('privacy-wallets').checked = prefs.privacy.showWallets;
    document.getElementById('privacy-activity').checked = prefs.privacy.showActivity;
}

function getActivityIcon(type) {
    const icons = {
        'tip_sent': '💸',
        'tip_received': '💰',
        'survey_completed': '📋',
        'game_played': '🎮',
        'withdrawal': '🏦'
    };
    return icons[type] || '📌';
}

window.addWallet = async function() {
    const address = prompt('Enter wallet address:');
    if (!address) return;
    
    const provider = prompt('Provider (x402/phantom/solflare):');
    
    const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, provider })
    });
    
    if (response.ok) {
        alert('Wallet added successfully!');
        loadWallets();
    } else {
        alert('Failed to add wallet');
    }
}

window.setPrimary = async function(walletId) {
    const response = await fetch(`/api/wallets/${walletId}/primary`, {
        method: 'PATCH'
    });
    
    if (response.ok) {
        loadWallets();
    }
}

window.editProfile = function() {
    alert('Profile editor would open here');
}

window.requestWithdrawal = async function() {
    const amount = parseFloat(prompt('Enter withdrawal amount (min $5.00):'));
    
    if (amount < 5) {
        alert('Minimum withdrawal is $5.00');
        return;
    }
    
    const response = await fetch('/api/qualifyfirst/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    });
    
    const result = await response.json();
    alert(result.message || result.error);
}

window.saveSettings = async function() {
    const prefs = {
        notifications: {
            tipReceived: document.getElementById('notify-tips').checked,
            surveyMatch: document.getElementById('notify-surveys').checked,
            gameInvite: document.getElementById('notify-games').checked
        },
        privacy: {
            showProfile: document.getElementById('privacy-profile').checked,
            showWallets: document.getElementById('privacy-wallets').checked,
            showActivity: document.getElementById('privacy-activity').checked
        }
    };
    
    const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
    });
    
    if (response.ok) {
        alert('Settings saved!');
    }
}

// Real-time updates via SSE
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'activity') {
        loadActivity();
    }
};
