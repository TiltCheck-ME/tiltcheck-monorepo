/**
 * Dashboard HTML Generators
 * 
 * Generates HTML for different dashboard types with real-time data integration.
 */

// Helper functions for CSS classes
function getTrustScoreClass(score: number): string {
  if (score >= 80) return 'trust-high';
  if (score >= 60) return 'trust-medium';
  return 'trust-low';
}

function getTiltLevelClass(level: number): string {
  if (level >= 70) return 'tilt-high';
  if (level >= 40) return 'tilt-medium';
  return 'tilt-low';
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-medium';
  return 'score-low';
}

function getTrustClass(score: number): string {
  return getTrustScoreClass(score);
}

function getTiltClass(level: number): string {
  return getTiltLevelClass(level);
}

function getTiltLevelDescription(level: number): string {
  if (level >= 70) return 'High tilt detected - Consider taking a break';
  if (level >= 40) return 'Moderate tilt - Stay aware of your emotions';
  return 'Low tilt - You\'re doing great!';
}

export function generateTrustDashboardHTML(discordId: string, userTrust: any, casinoData: any[]): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TiltCheck Trust Dashboard</title>
    <style>
        :root {
            --bg: #0f0f12;
            --surface: #151720;
            --surface-2: #1a1d26;
            --border: #23242a;
            --accent: #00d4aa;
            --accent-alt: #8a5cff;
            --danger: #ff5e9a;
            --text: #ffffff;
            --muted: #aab4bd;
            --radius: 12px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Inter, system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            margin-bottom: 24px;
        }

        .header h1 {
            color: var(--accent);
            margin-bottom: 8px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
        }

        .card h3 {
            color: var(--accent);
            margin-bottom: 16px;
        }

        .trust-score {
            font-size: 3rem;
            font-weight: bold;
            text-align: center;
            margin: 16px 0;
        }

        .trust-high { color: var(--accent); }
        .trust-medium { color: #ffa500; }
        .trust-low { color: var(--danger); }

        .casino-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .casino-item {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            border-bottom: 1px solid var(--border);
        }

        .casino-item:last-child {
            border-bottom: none;
        }

        .casino-score {
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
        }

        .score-high { background: rgba(0, 212, 170, 0.2); color: var(--accent); }
        .score-medium { background: rgba(255, 165, 0, 0.2); color: #ffa500; }
        .score-low { background: rgba(255, 94, 154, 0.2); color: var(--danger); }

        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .metric-value {
            font-weight: bold;
        }

        .refresh-btn {
            background: var(--accent);
            color: var(--bg);
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }

        .refresh-btn:hover {
            background: #00b893;
        }

        @media (max-width: 768px) {
            .container {
                padding: 12px;
            }
            
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Trust Dashboard</h1>
            <p>Real-time trust analytics for Discord user <strong>${discordId}</strong></p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
        </div>

        <div class="grid">
            <!-- User Trust Score -->
            <div class="card">
                <h3>Your Trust Score</h3>
                <div class="trust-score ${getTrustScoreClass(userTrust.trustScore)}">
                    ${userTrust.trustScore.toFixed(1)}
                </div>
                <div class="metric">
                    <span>Trust Level</span>
                    <span class="metric-value">${userTrust.trustLevel}</span>
                </div>
                <div class="metric">
                    <span>Last Updated</span>
                    <span class="metric-value">${new Date(userTrust.lastUpdated).toLocaleTimeString()}</span>
                </div>
                <hr style="margin: 16px 0; border: 1px solid var(--border);">
                <div>
                    <strong>Trust Factors:</strong>
                    <ul style="margin-top: 8px; padding-left: 20px;">
                        ${userTrust.explanation.map((factor: string) => `<li>${factor}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- Casino Trust Leaderboard -->
            <div class="card">
                <h3>Casino Trust Scores</h3>
                <div class="casino-list">
                    ${casinoData.slice(0, 10).map((casino, index) => `
                        <div class="casino-item">
                            <div>
                                <strong>#${index + 1}</strong>
                                <span style="margin-left: 8px;">${casino.casino}</span>
                            </div>
                            <div class="casino-score ${getScoreClass(casino.score)}">
                                ${casino.score.toFixed(1)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Trust Breakdown -->
            <div class="card">
                <h3>Trust Breakdown</h3>
                ${Object.entries(userTrust.breakdown).map(([key, value]) => `
                    <div class="metric">
                        <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        <span class="metric-value">${typeof value === 'number' ? value.toFixed(1) : value}</span>
                    </div>
                `).join('')}
            </div>

            <!-- Recent Activity -->
            <div class="card">
                <h3>Recent Trust Events</h3>
                <div id="trust-events">
                    <p style="color: var(--muted); text-align: center; padding: 20px;">
                        No recent trust events
                    </p>
                </div>
            </div>
        </div>
    </div>

    <script>
        function getTrustScoreClass(score) {
            if (score >= 80) return 'trust-high';
            if (score >= 60) return 'trust-medium';
            return 'trust-low';
        }

        function getScoreClass(score) {
            if (score >= 80) return 'score-high';
            if (score >= 60) return 'score-medium';
            return 'score-low';
        }

        // Real-time updates via Server-Sent Events
        const eventSource = new EventSource('/api/events');
        
        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'trust-update') {
                // Update trust display in real-time
                console.log('Trust update received:', data);
            }
        };

        eventSource.onerror = function(event) {
            console.warn('EventSource connection error:', event);
        };

        // Auto-refresh every 5 minutes
        setInterval(() => {
            location.reload();
        }, 300000);
    </script>
</body>
</html>
  `.trim();
}

export function generateTiltDashboardHTML(discordId: string, tiltData: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TiltCheck Tilt Monitor</title>
    <style>
        :root {
            --bg: #0f0f12;
            --surface: #151720;
            --surface-2: #1a1d26;
            --border: #23242a;
            --accent: #ff6b6b;
            --accent-alt: #4ecdc4;
            --warning: #ffa500;
            --text: #ffffff;
            --muted: #aab4bd;
            --radius: 12px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Inter, system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            margin-bottom: 24px;
        }

        .header h1 {
            color: var(--accent);
            margin-bottom: 8px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
        }

        .card h3 {
            color: var(--accent);
            margin-bottom: 16px;
        }

        .tilt-level {
            font-size: 3rem;
            font-weight: bold;
            text-align: center;
            margin: 16px 0;
        }

        .tilt-low { color: var(--accent-alt); }
        .tilt-medium { color: var(--warning); }
        .tilt-high { color: var(--accent); }

        .chart-container {
            height: 200px;
            margin: 16px 0;
            background: var(--surface-2);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            align-items: end;
            justify-content: space-between;
        }

        .chart-bar {
            width: 20px;
            background: var(--accent-alt);
            border-radius: 2px 2px 0 0;
            transition: height 0.3s ease;
        }

        .recommendations {
            list-style: none;
            padding: 0;
        }

        .recommendations li {
            background: var(--surface-2);
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 6px;
            border-left: 4px solid var(--accent-alt);
        }

        .risk-factors {
            list-style: none;
            padding: 0;
        }

        .risk-factors li {
            background: rgba(255, 107, 107, 0.1);
            color: var(--accent);
            padding: 8px 12px;
            margin-bottom: 6px;
            border-radius: 4px;
        }

        .cooldown-btn {
            background: var(--accent-alt);
            color: var(--bg);
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
            margin-top: 16px;
        }

        .cooldown-btn:hover {
            background: #45b7aa;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Tilt Monitor</h1>
            <p>Real-time tilt detection and prevention for Discord user <strong>${discordId}</strong></p>
        </div>

        <div class="grid">
            <!-- Current Tilt Level -->
            <div class="card">
                <h3>Current Tilt Level</h3>
                <div class="tilt-level ${getTiltLevelClass(tiltData.currentTiltLevel)}">
                    ${tiltData.currentTiltLevel}%
                </div>
                <p style="text-align: center; color: var(--muted);">
                    ${getTiltLevelDescription(tiltData.currentTiltLevel)}
                </p>
                <button class="cooldown-btn" onclick="startCooldown()">
                    ❄️ Start Cooldown
                </button>
            </div>

            <!-- Tilt History Chart -->
            <div class="card">
                <h3>24-Hour Tilt History</h3>
                <div class="chart-container" id="tilt-chart">
                    ${tiltData.tiltHistory.slice(-24).map((point: any, index: number) => `
                        <div class="chart-bar" style="height: ${point.tiltLevel}%;" title="Hour ${index + 1}: ${point.tiltLevel}%"></div>
                    `).join('')}
                </div>
                <p style="color: var(--muted); font-size: 0.9rem; text-align: center;">
                    Last 24 hours • Hover bars for details
                </p>
            </div>

            <!-- Risk Factors -->
            <div class="card">
                <h3>Current Risk Factors</h3>
                ${tiltData.riskFactors.length > 0 ? `
                    <ul class="risk-factors">
                        ${tiltData.riskFactors.map((factor: string) => `<li>⚠️ ${factor}</li>`).join('')}
                    </ul>
                ` : `
                    <p style="color: var(--muted); text-align: center; padding: 20px;">
                        🎯 No risk factors detected
                    </p>
                `}
            </div>

            <!-- Recommendations -->
            <div class="card">
                <h3>Recommendations</h3>
                <ul class="recommendations">
                    ${tiltData.recommendations.map((rec: string) => `<li>💡 ${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>

    <script>
        function getTiltLevelClass(level) {
            if (level >= 70) return 'tilt-high';
            if (level >= 40) return 'tilt-medium';
            return 'tilt-low';
        }

        function getTiltLevelDescription(level) {
            if (level >= 70) return 'High tilt detected - Consider taking a break';
            if (level >= 40) return 'Moderate tilt - Stay aware of your emotions';
            return 'Low tilt - You\'re doing great!';
        }

        function startCooldown() {
            alert('Cooldown feature coming soon! For now, consider taking a 15-minute break.');
        }

        // Auto-refresh every 2 minutes
        setInterval(() => {
            location.reload();
        }, 120000);
    </script>
</body>
</html>
  `.trim();
}

export function generateCooldownDashboardHTML(discordId: string, cooldownData: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TiltCheck Cooldown Management</title>
    <style>
        :root {
            --bg: #0f0f12;
            --surface: #151720;
            --surface-2: #1a1d26;
            --border: #23242a;
            --accent: #4a90e2;
            --accent-alt: #00d4aa;
            --warning: #ffa500;
            --text: #ffffff;
            --muted: #aab4bd;
            --radius: 12px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Inter, system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            margin-bottom: 24px;
        }

        .header h1 {
            color: var(--accent);
            margin-bottom: 8px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
        }

        .card h3 {
            color: var(--accent);
            margin-bottom: 16px;
        }

        .spending-bar {
            width: 100%;
            height: 20px;
            background: var(--surface-2);
            border-radius: 10px;
            overflow: hidden;
            margin: 8px 0;
        }

        .spending-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-alt), var(--accent));
            transition: width 0.3s ease;
        }

        .spending-text {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            color: var(--muted);
            margin-top: 4px;
        }

        .cooldown-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 16px;
        }

        .cooldown-btn {
            background: var(--accent);
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }

        .cooldown-btn:hover {
            background: #357abd;
        }

        .cooldown-btn.secondary {
            background: var(--surface-2);
            color: var(--text);
            border: 1px solid var(--border);
        }

        .cooldown-btn.secondary:hover {
            background: #242830;
        }

        .vault-item {
            background: var(--surface-2);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .vault-amount {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--accent-alt);
        }

        .vault-time {
            color: var(--muted);
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❄️ Cooldown Management</h1>
            <p>Manage voluntary restrictions and spending limits for Discord user <strong>${discordId}</strong></p>
        </div>

        <div class="grid">
            <!-- Spending Limits -->
            <div class="card">
                <h3>Spending Limits</h3>
                
                <!-- Daily -->
                <div style="margin-bottom: 20px;">
                    <strong>Daily: $${cooldownData.currentSpending.daily} / $${cooldownData.spendingLimits.daily}</strong>
                    <div class="spending-bar">
                        <div class="spending-fill" style="width: ${(cooldownData.currentSpending.daily / cooldownData.spendingLimits.daily) * 100}%"></div>
                    </div>
                    <div class="spending-text">
                        <span>${((cooldownData.currentSpending.daily / cooldownData.spendingLimits.daily) * 100).toFixed(1)}% used</span>
                        <span>Resets at midnight</span>
                    </div>
                </div>

                <!-- Weekly -->
                <div style="margin-bottom: 20px;">
                    <strong>Weekly: $${cooldownData.currentSpending.weekly} / $${cooldownData.spendingLimits.weekly}</strong>
                    <div class="spending-bar">
                        <div class="spending-fill" style="width: ${(cooldownData.currentSpending.weekly / cooldownData.spendingLimits.weekly) * 100}%"></div>
                    </div>
                    <div class="spending-text">
                        <span>${((cooldownData.currentSpending.weekly / cooldownData.spendingLimits.weekly) * 100).toFixed(1)}% used</span>
                        <span>Resets Sunday</span>
                    </div>
                </div>

                <!-- Monthly -->
                <div>
                    <strong>Monthly: $${cooldownData.currentSpending.monthly} / $${cooldownData.spendingLimits.monthly}</strong>
                    <div class="spending-bar">
                        <div class="spending-fill" style="width: ${(cooldownData.currentSpending.monthly / cooldownData.spendingLimits.monthly) * 100}%"></div>
                    </div>
                    <div class="spending-text">
                        <span>${((cooldownData.currentSpending.monthly / cooldownData.spendingLimits.monthly) * 100).toFixed(1)}% used</span>
                        <span>Resets monthly</span>
                    </div>
                </div>
            </div>

            <!-- Quick Cooldowns -->
            <div class="card">
                <h3>Quick Cooldown</h3>
                <p style="color: var(--muted); margin-bottom: 16px;">
                    Start a voluntary timeout to prevent impulsive decisions
                </p>
                
                <div class="cooldown-controls">
                    <button class="cooldown-btn" onclick="startCooldown(15)">15 Minutes</button>
                    <button class="cooldown-btn" onclick="startCooldown(30)">30 Minutes</button>
                    <button class="cooldown-btn" onclick="startCooldown(60)">1 Hour</button>
                    <button class="cooldown-btn" onclick="startCooldown(240)">4 Hours</button>
                    <button class="cooldown-btn secondary" onclick="startCooldown(1440)">24 Hours</button>
                    <button class="cooldown-btn secondary" onclick="customCooldown()">Custom</button>
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--surface-2); border-radius: 8px;">
                    <h4 style="color: var(--accent-alt); margin-bottom: 8px;">💡 Productive Break Suggestion</h4>
                    <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 12px;">
                        While on cooldown, earn money with surveys matched to your interests
                    </p>
                    <button class="cooldown-btn" onclick="goToQualifyFirst()" style="background: var(--accent-alt); width: 100%;">
                        🎯 Earn with QualifyFirst
                    </button>
                </div>
            </div>

            <!-- Active Cooldowns -->
            <div class="card">
                <h3>Active Cooldowns</h3>
                ${cooldownData.activeCooldowns.length > 0 ? `
                    ${cooldownData.activeCooldowns.map((cooldown: any) => `
                        <div class="vault-item">
                            <div>
                                <div><strong>${cooldown.type}</strong></div>
                                <div class="vault-time">Expires: ${new Date(cooldown.expiresAt).toLocaleString()}</div>
                            </div>
                            <button class="cooldown-btn secondary" onclick="cancelCooldown('${cooldown.id}')">Cancel</button>
                        </div>
                    `).join('')}
                ` : `
                    <p style="color: var(--muted); text-align: center; padding: 20px;">
                        ✅ No active cooldowns
                    </p>
                `}
            </div>

            <!-- Lock Vaults -->
            <div class="card">
                <h3>Lock Vaults</h3>
                <p style="color: var(--muted); margin-bottom: 16px;">
                    Time-locked savings that you can't access during tilt
                </p>
                
                ${cooldownData.lockedVaults.length > 0 ? `
                    ${cooldownData.lockedVaults.map((vault: any) => `
                        <div class="vault-item">
                            <div>
                                <div class="vault-amount">$${vault.amount}</div>
                                <div class="vault-time">Unlocks: ${new Date(vault.unlockTime).toLocaleString()}</div>
                            </div>
                            <div class="vault-time">
                                ${vault.canExtend ? '<button class="cooldown-btn secondary">Extend</button>' : 'Locked'}
                            </div>
                        </div>
                    `).join('')}
                ` : `
                    <p style="color: var(--muted); text-align: center; padding: 20px;">
                        💰 No locked vaults
                    </p>
                    <button class="cooldown-btn" onclick="createVault()" style="width: 100%;">
                        Create Lock Vault
                    </button>
                `}
            </div>
        </div>
    </div>

    <script>
        function startCooldown(minutes) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = hours > 0 ? \`\${hours}h \${mins}m\` : \`\${minutes}m\`;
            
            if (confirm(\`Start a \${timeStr} cooldown? You won't be able to tip or gamble during this time.\`)) {
                // Suggest QualifyFirst as productive alternative
                if (confirm('Cooldown started! Would you like to earn money with surveys while on break?')) {
                    goToQualifyFirst();
                } else {
                    alert('Cooldown active. Take care of yourself!');
                }
                // TODO: Integrate with actual cooldown system
            }
        }
        
        function goToQualifyFirst() {
            const discordId = new URLSearchParams(window.location.search).get('discord');
            if (discordId) {
                window.open(\`http://localhost:3004/qualify?discord=\${discordId}&source=cooldown\`, '_blank');
            } else {
                window.open('http://localhost:3004/qualify?source=cooldown', '_blank');
            }
        }

        function customCooldown() {
            const minutes = prompt('Enter cooldown duration in minutes:');
            if (minutes && !isNaN(minutes) && minutes > 0) {
                startCooldown(parseInt(minutes));
            }
        }

        function cancelCooldown(id) {
            if (confirm('Are you sure you want to cancel this cooldown?')) {
                alert('Cooldown cancelled! Feature integration coming soon.');
                // TODO: Integrate with cooldown system
            }
        }

        function createVault() {
            alert('Lock Vault creation coming soon! This will integrate with JustTheTip bot for SOL locking.');
            // TODO: Integrate with vault system
        }
    </script>
</body>
</html>
  `.trim();
}

export function generateMainDashboardHTML(discordId: string, userData: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TiltCheck Dashboard</title>
    <style>
        :root {
            --bg: #0f0f12;
            --surface: #151720;
            --surface-2: #1a1d26;
            --border: #23242a;
            --accent: #00d4aa;
            --accent-alt: #8a5cff;
            --danger: #ff5e9a;
            --warning: #ffa500;
            --text: #ffffff;
            --muted: #aab4bd;
            --radius: 12px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Inter, system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            margin-bottom: 24px;
            text-align: center;
        }

        .header h1 {
            color: var(--accent);
            margin-bottom: 8px;
            font-size: 2.5rem;
        }

        .nav-pills {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .nav-pill {
            background: var(--accent);
            color: var(--bg);
            padding: 12px 20px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
        }

        .nav-pill:hover {
            background: #00b893;
            transform: translateY(-2px);
        }

        .nav-pill.secondary {
            background: var(--surface-2);
            color: var(--text);
            border: 1px solid var(--border);
        }

        .nav-pill.secondary:hover {
            background: #242830;
        }

        .quick-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 8px 0;
        }

        .stat-label {
            color: var(--muted);
            font-size: 0.9rem;
        }

        .trust-high { color: var(--accent); }
        .trust-medium { color: var(--warning); }
        .trust-low { color: var(--danger); }

        .tilt-low { color: var(--accent); }
        .tilt-medium { color: var(--warning); }
        .tilt-high { color: var(--danger); }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .feature-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
        }

        .feature-card h3 {
            color: var(--accent);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .feature-card p {
            color: var(--muted);
            margin-bottom: 16px;
        }

        .feature-btn {
            background: var(--accent-alt);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
        }

        .feature-btn:hover {
            background: #7a52e6;
        }

        @media (max-width: 768px) {
            .container {
                padding: 12px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .nav-pills {
                flex-direction: column;
                align-items: center;
            }
            
            .quick-stats {
                grid-template-columns: 1fr;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 TiltCheck Dashboard</h1>
            <p>Welcome to your personalized TiltCheck ecosystem, <strong>${discordId}</strong></p>
            
            <div class="nav-pills">
                <a href="/dashboard/trust?discord=${discordId}" class="nav-pill">
                    🎯 Trust Analytics
                </a>
                <a href="/dashboard/tilt?discord=${discordId}" class="nav-pill">
                    📈 Tilt Monitor
                </a>
                <a href="/dashboard/cooldown?discord=${discordId}" class="nav-pill">
                    ❄️ Cooldowns
                </a>
                <a href="https://tiltcheck.com" class="nav-pill secondary">
                    🏠 Back to Site
                </a>
            </div>
        </div>

        <!-- Quick Stats Overview -->
        <div class="quick-stats">
            <div class="stat-card">
                <div class="stat-label">Trust Score</div>
                <div class="stat-value ${getTrustClass(userData.trust.trustScore)}">${userData.trust.trustScore.toFixed(1)}</div>
                <div class="stat-label">${userData.trust.trustLevel}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Current Tilt</div>
                <div class="stat-value ${getTiltClass(userData.tilt.currentTiltLevel)}">${userData.tilt.currentTiltLevel}%</div>
                <div class="stat-label">24h monitoring</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Daily Spending</div>
                <div class="stat-value">$${userData.cooldown.currentSpending.daily}</div>
                <div class="stat-label">/ $${userData.cooldown.spendingLimits.daily} limit</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Active Cooldowns</div>
                <div class="stat-value">${userData.cooldown.activeCooldowns.length}</div>
                <div class="stat-label">voluntary restrictions</div>
            </div>
        </div>

        <!-- Feature Cards -->
        <div class="features-grid">
            <div class="feature-card">
                <h3>🎯 Trust Analytics</h3>
                <p>View detailed trust scores, casino ratings, and community reputation metrics.</p>
                <button class="feature-btn" onclick="location.href='/dashboard/trust?discord=${discordId}'">
                    Open Trust Dashboard
                </button>
            </div>
            
            <div class="feature-card">
                <h3>📈 Tilt Monitoring</h3>
                <p>Real-time behavioral analysis and tilt detection with prevention recommendations.</p>
                <button class="feature-btn" onclick="location.href='/dashboard/tilt?discord=${discordId}'">
                    View Tilt Monitor
                </button>
            </div>
            
            <div class="feature-card">
                <h3>❄️ Cooldown Management</h3>
                <p>Set voluntary restrictions, manage spending limits, and create time-locked vaults.</p>
                <button class="feature-btn" onclick="location.href='/dashboard/cooldown?discord=${discordId}'">
                    Manage Cooldowns
                </button>
            </div>
            
            <div class="feature-card">
                <h3>💰 JustTheTip Integration</h3>
                <p>Connect with the Discord tipping bot for non-custodial SOL transactions.</p>
                <button class="feature-btn" onclick="openJustTheTip()">
                    Access JustTheTip
                </button>
            </div>
            
            <div class="feature-card">
                <h3>🎮 Discord Tools</h3>
                <p>Access TiltCheck bot features including link scanning, poker, and trivia drops.</p>
                <button class="feature-btn" onclick="openDiscord()">
                    Join Discord Server
                </button>
            </div>
            
            <div class="feature-card">
                <h3>🎯 QualifyFirst Surveys</h3>
                <p>Earn money with targeted surveys matched to your interests and demographics.</p>
                <button class="feature-btn" onclick="openQualifyFirst()">
                    Start Earning
                </button>
            </div>
            
            <div class="feature-card">
                <h3>📊 Analytics Export</h3>
                <p>Download your trust history, tilt patterns, and spending analytics as CSV.</p>
                <button class="feature-btn" onclick="exportData()">
                    Export My Data
                </button>
            </div>
        </div>
    </div>

    <script>
        function getTrustClass(score) {
            if (score >= 80) return 'trust-high';
            if (score >= 60) return 'trust-medium';
            return 'trust-low';
        }
        
        function getTiltClass(level) {
            if (level >= 70) return 'tilt-high';
            if (level >= 40) return 'tilt-medium';
            return 'tilt-low';
        }
        
        function openJustTheTip() {
            alert('JustTheTip Discord bot integration coming soon! Use /tip commands in Discord for now.');
        }
        
        function openQualifyFirst() {
            const discordId = new URLSearchParams(window.location.search).get('discord');
            if (discordId) {
                window.open(\`http://localhost:3004/qualify?discord=\${discordId}&source=dashboard\`, '_blank');
            } else {
                window.open('http://localhost:3004/qualify?source=dashboard', '_blank');
            }
        }
        
        function openDiscord() {
            window.open('https://discord.gg/tiltcheck', '_blank');
        }
        
        function exportData() {
            alert('Data export feature coming soon! You\'ll be able to download all your TiltCheck analytics.');
        }
    </script>
</body>
</html>
  `.trim();
}