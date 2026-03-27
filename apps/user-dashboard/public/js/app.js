/* Copyright (c) 2026 TiltCheck. All rights reserved. */

// Global state
let currentUser = null;
let magic = null;

// Initial Token Resolution
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) {
    console.log('[Auth] Token found in URL, saving...');
    localStorage.setItem('tiltcheck-token', urlToken);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// === Initialization ===
window.addEventListener('DOMContentLoaded', async () => {
    console.log('[Init] App started.');
    
    // Initialize Magic SDK safely (if script is loaded)
    try {
        if (typeof Magic !== 'undefined') {
            magic = new Magic('pk_live_7CCBBE6E6EF6E6E6');
        }
    } catch (err) {
        console.warn('Magic SDK init failed - might be blocked by extension.');
    }

    await checkAuth();
    setupTabListeners();
    setupNlpListener();
});

// Helper for authorized requests
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('tiltcheck-token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    return fetch(url, { ...options, headers });
}

async function checkAuth() {
    console.log('[Auth] Validating session...');
    const token = localStorage.getItem('tiltcheck-token');
    
    if (!token) {
        console.log('[Auth] No token, showing login.');
        showLogin();
        return;
    }

    try {
        const response = await apiRequest('/api/auth/me');
        if (response.ok) {
            currentUser = await response.json();
            console.log('[Auth] Logged in:', currentUser.username);
            
            // Check for onboarding
            if (currentUser.degenIdentity && !currentUser.degenIdentity.tos_accepted) {
                console.log('[Auth] New user detected, redirecting to onboarding.');
                window.location.href = '/onboarding';
                return;
            }

            showDashboard();
            loadAllData();
        } else {
            console.warn('[Auth] Token invalid (401), clearing.');
            localStorage.removeItem('tiltcheck-token');
            showLogin();
        }
    } catch (error) {
        console.error('[Auth] Connection error:', error);
        // Show error UI but don't clear token on network failure
        document.body.innerHTML += `<div style="position:fixed;bottom:20px;right:20px;background:#ff4444;color:white;padding:1rem;border-radius:8px;z-index:1000">Connection Error. Retrying...</div>`;
        setTimeout(checkAuth, 5000);
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

// === Data Loading ===
async function loadAllData() {
    const overlay = document.getElementById('loadingOverlay');
    const content = document.getElementById('dashboardContent');
    
    if (overlay) overlay.style.display = 'block';
    if (content) content.style.display = 'none';

    try {
        await Promise.all([
            loadUserProfile(),
            loadTrustMetrics(),
            loadBonuses(),
            loadVaults(),
            loadActivity(),
            loadBuddies()
        ]);
        
        if (overlay) overlay.style.display = 'none';
        if (content) content.style.display = 'block';
    } catch (err) {
        console.error('[Data] Load failed:', err);
    }
}

async function loadUserProfile() {
    try {
        const response = await apiRequest(`/api/user/${currentUser.discordId}`);
        const user = await response.json();

        // Stats
        document.getElementById('trustScore').textContent = user.trustScore || '50';
        document.getElementById('redeemWins').textContent = user.analytics?.redeemWins || 0;
        document.getElementById('totalRedeemed').textContent = '$' + (user.analytics?.totalRedeemed || 0).toFixed(2);
        document.getElementById('totalJuice').textContent = (user.analytics?.totalJuice || 0).toFixed(2) + ' SOL';
        document.getElementById('totalTipsCaught').textContent = (user.analytics?.totalTipsCaught || 0).toFixed(2) + ' SOL';

        // Wallet Display
        if (user.degenIdentity?.primary_external_address) {
            document.getElementById('externalWalletDisplay').textContent = user.degenIdentity.primary_external_address;
        }
    } catch (err) { console.error(err); }
}

async function loadBuddies() {
    try {
        const response = await apiRequest(`/api/user/${currentUser.discordId}/buddies`);
        if (!response.ok) return;
        
        const data = await response.json();
        const buddyList = document.getElementById('buddyList');
        const buddyStatus = document.getElementById('buddyStatus');
        
        if (!buddyList || !buddyStatus) return;
        
        buddyList.innerHTML = '';
        const total = data.buddies.length + data.pending.length;
        
        if (total === 0) {
            buddyStatus.textContent = 'Accountability net is empty.';
            buddyList.innerHTML = '<div class="buddy-item">No buddies found. Invite 2 for optimal safety.</div>';
        } else {
            buddyStatus.textContent = `${data.buddies.length} active, ${data.pending.length} pending`;
            
            // Render active buddies
            data.buddies.forEach(buddy => {
                const item = document.createElement('div');
                item.className = 'buddy-item';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.innerHTML = `
                    <span>👤 <small>${buddy.buddy_id}</small></span>
                    <span class="badge badge-success" style="font-size: 0.6rem;">ACTIVE</span>
                `;
                buddyList.appendChild(item);
            });
            
            // Render pending requests
            data.pending.forEach(req => {
                const item = document.createElement('div');
                item.className = 'buddy-item pending';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.opacity = '0.7';
                item.innerHTML = `
                    <span>👤 <small>${req.buddy_id}</small></span>
                    <span class="badge" style="font-size: 0.6rem; background: #eba003;">PENDING</span>
                `;
                buddyList.appendChild(item);
            });
        }
        
        // Setup Invite Button
        const inviteBtn = document.getElementById('sendBuddyInviteBtn');
        const inviteInput = document.getElementById('buddyInviteInput');
        
        if (inviteBtn && !inviteBtn.dataset.listener) {
            inviteBtn.dataset.listener = 'true';
            inviteBtn.addEventListener('click', async () => {
                const buddyId = inviteInput.value.trim();
                if (!buddyId) return;
                
                inviteBtn.textContent = 'SENDING...';
                inviteBtn.disabled = true;
                
                try {
                    const res = await apiRequest(`/api/user/${currentUser.discordId}/buddies`, {
                        method: 'POST',
                        body: JSON.stringify({ buddyId })
                    });
                    
                    if (res.ok) {
                        inviteInput.value = '';
                        inviteBtn.textContent = 'SENT!';
                        setTimeout(() => {
                            inviteBtn.textContent = 'SEND INVITE';
                            inviteBtn.disabled = false;
                        }, 2000);
                        loadBuddies();
                    } else {
                        inviteBtn.textContent = 'FAILED';
                        inviteBtn.style.background = '#ff4444';
                        setTimeout(() => {
                            inviteBtn.textContent = 'SEND INVITE';
                            inviteBtn.disabled = false;
                            inviteBtn.style.background = '';
                        }, 2000);
                    }
                } catch (e) {
                    console.error(e);
                    inviteBtn.textContent = 'ERROR';
                }
            });
        }
    } catch (err) { console.error('[Buddy] Load failed:', err); }
}

// === Tab Navigation ===
function setupTabListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(`${tabName}-tab`);
            if (target) target.classList.add('active');
        });
    });
}

function handleLogout() {
    localStorage.removeItem('tiltcheck-token');
    window.location.href = '/';
}

// Mock placeholders to prevent errors if not implemented
async function loadTrustMetrics() {}
async function loadBonuses() {}
async function loadVaults() {}
async function loadActivity() {}
function setupNlpListener() {}
