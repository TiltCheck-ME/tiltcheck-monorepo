// Control Room Client-Side Logic

let authenticated = false;
let eventSource = null;

// Check auth status on load
window.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/api/auth/status');
    const { authenticated: isAuth } = await response.json();
    
    if (isAuth) {
        showDashboard();
    }
    
    updateTime();
    setInterval(updateTime, 1000);
});

// Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    
    if (response.ok) {
        showDashboard();
    } else {
        document.getElementById('login-error').textContent = 'Invalid password';
    }
});

function showDashboard() {
    authenticated = true;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    loadSystemStatus();
    loadMetrics();
    loadDocs();
    startCommandFeed();
    setInterval(loadSystemStatus, 10000); // Refresh every 10s
}

window.logout = async function() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.reload();
}

function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
}

async function loadSystemStatus() {
    const response = await fetch('/api/system/status');
    const { services } = await response.json();
    
    const html = services.map(s => `
        <div class="service ${s.status}">
            <span class="service-name">${s.name}</span>
            <span class="status-badge ${s.status}">${s.status}</span>
            ${s.status === 'running' ? `
                <button onclick="restartService('${s.name}')" class="btn-small">Restart</button>
            ` : ''}
        </div>
    `).join('');
    
    document.getElementById('services-status').innerHTML = html;
}

async function loadMetrics() {
    const response = await fetch('/api/system/metrics');
    const { loadAverage, timestamp } = await response.json();
    
    document.getElementById('load-avg').textContent = loadAverage;
    const uptime = new Date(timestamp);
    document.getElementById('uptime').textContent = uptime.toLocaleString();
}

async function loadDocs() {
    const response = await fetch('/api/docs/list');
    const { documents } = await response.json();
    
    const html = documents.map(doc => `
        <div class="doc-item" onclick="viewDoc('${doc}')">
            📄 ${doc}
        </div>
    `).join('');
    
    document.getElementById('docs-list').innerHTML = html || 'No documents available';
}

window.viewDoc = async function(filename) {
    const response = await fetch(`/api/docs/${filename}`);
    const { content } = await response.json();
    
    alert(`${filename}\n\n${content.substring(0, 500)}...`);
}

function startCommandFeed() {
    eventSource = new EventSource('/api/feed/commands');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const feedElement = document.getElementById('command-feed');
        
        const entry = document.createElement('div');
        entry.className = 'feed-entry';
        entry.innerHTML = `
            <span class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
            <span class="command">${data.command}</span>
            <span class="user">${data.user}</span>
            <span class="module">${data.module}</span>
        `;
        
        feedElement.insertBefore(entry, feedElement.firstChild);
        
        // Keep only last 20 entries
        while (feedElement.children.length > 20) {
            feedElement.removeChild(feedElement.lastChild);
        }
    };
}

window.restartService = async function(service) {
    if (!confirm(`Restart ${service}?`)) return;
    
    const response = await fetch(`/api/process/restart/${service}`, { method: 'POST' });
    const result = await response.json();
    
    alert(result.message || result.error);
    loadSystemStatus();
}

async function killAll() {
    if (!confirm('Kill ALL services? This will stop everything!')) return;
    
    const response = await fetch('/api/process/kill-all', { method: 'POST' });
    const result = await response.json();
    
    alert(result.message);
    loadSystemStatus();
}

window.restartAll = async function() {
    if (!confirm('Restart ALL services?')) return;
    
    await killAll();
    setTimeout(() => {
        alert('Services killed. Manual restart required.');
    }, 2000);
}

window.clearCaches = function() {
    alert('Cache clear functionality would be implemented here');
}

window.exportState = function() {
    alert('System state export functionality would be implemented here');
}

window.viewLogs = function() {
    alert('Logs viewer would be implemented here');
}

window.emergencyStop = function() {
    if (!confirm('EMERGENCY STOP - Are you sure?')) return;
    killAll();
}

window.refreshStatus = function() {
    loadSystemStatus();
    loadMetrics();
}

// AI Terminal
document.getElementById('terminal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('terminal-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const terminal = document.getElementById('terminal-output');
    terminal.innerHTML += `<div class="input">$ ${message}</div>`;
    
    const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
    
    const { response: aiResponse } = await response.json();
    terminal.innerHTML += `<div class="output">${aiResponse}</div>`;
    terminal.scrollTop = terminal.scrollHeight;
    
    input.value = '';
});
