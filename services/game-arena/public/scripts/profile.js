/**
 * Profile page functionality
 * 
 * Copyright (c) 2024 Degens Against Decency
 * Licensed under the MIT License
 * See LICENSE file in the project root for full license information.
 */

// Constants for display formatting
const SOL_DECIMAL_PLACES = 4;

class ProfileManager {
  constructor() {
    this.user = null;
    this.stats = null;
    this.init();
  }

  async init() {
    await this.loadUser();
    await this.loadStats();
    await this.loadRecentGames();
    await this.loadWalletStatus();
    await this.loadPendingTips();
    await this.loadTipHistory();
    this.setupEventListeners();
  }

  async loadUser() {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        this.user = await response.json();
        this.updateUserDisplay();
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      window.location.href = '/';
    }
  }

  async loadStats() {
    if (!this.user) return;
    
    try {
      const response = await fetch(`/api/stats/${this.user.id}`);
      if (response.ok) {
        this.stats = await response.json();
        this.updateStatsDisplay();
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Use default stats
      this.stats = {
        totalGames: 0,
        gamesWon: 0,
        totalPoints: 0,
        dadGames: 0,
        dadWins: 0,
        cardsPlayed: 0,
        funniestPicks: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: 100
      };
      this.updateStatsDisplay();
    }
  }

  async loadRecentGames() {
    if (!this.user) return;
    
    try {
      const response = await fetch(`/api/history/${this.user.id}?limit=5`);
      if (response.ok) {
        const data = await response.json();
        this.updateRecentGames(data.history || []);
      } else {
        this.updateRecentGames([]);
      }
    } catch (error) {
      console.error('Failed to load recent games:', error);
      this.updateRecentGames([]);
    }
  }

  updateUserDisplay() {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileUsername = document.getElementById('profile-username');
    const profileDiscriminator = document.getElementById('profile-discriminator');

    if (this.user) {
      const avatarUrl = this.user.avatar 
        ? `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(this.user.discriminator || '0') % 5}.png`;
      
      if (userAvatar) userAvatar.src = avatarUrl;
      if (profileAvatar) profileAvatar.src = avatarUrl;
      if (userName) userName.textContent = this.user.username;
      if (profileUsername) profileUsername.textContent = this.user.username;
      if (profileDiscriminator) {
        profileDiscriminator.textContent = this.user.discriminator ? `#${this.user.discriminator}` : '';
      }
    }
  }

  updateStatsDisplay() {
    if (!this.stats) return;

    // Main stats
    this.setElementText('stat-total-games', this.stats.totalGames || 0);
    this.setElementText('stat-games-won', this.stats.gamesWon || 0);
    
    const winRate = this.stats.totalGames > 0 
      ? Math.round((this.stats.gamesWon / this.stats.totalGames) * 100) 
      : 0;
    this.setElementText('stat-win-rate', `${winRate}%`);
    this.setElementText('stat-total-points', this.stats.totalPoints || 0);

    // DA&D specific stats
    this.setElementText('stat-dad-games', this.stats.dadGames || 0);
    this.setElementText('stat-dad-wins', this.stats.dadWins || 0);
    this.setElementText('stat-cards-played', this.stats.cardsPlayed || 0);
    this.setElementText('stat-funniest-picks', this.stats.funniestPicks || 0);

    // Level and XP
    const level = this.stats.level || 1;
    const xp = this.stats.xp || 0;
    const xpToNext = this.stats.xpToNextLevel || 100;
    
    this.setElementText('user-level', level);
    this.setElementText('xp-text', `${xp} / ${xpToNext} XP`);
    
    const xpProgress = document.getElementById('xp-progress');
    if (xpProgress) {
      xpProgress.style.width = `${(xp / xpToNext) * 100}%`;
    }

    // Update achievements based on stats
    this.updateAchievements();
  }

  updateAchievements() {
    const achievements = document.querySelectorAll('.achievement');
    
    achievements.forEach(achievement => {
      const title = achievement.querySelector('.achievement-title')?.textContent;
      
      switch (title) {
        case 'First Game':
          if (this.stats.totalGames >= 1) {
            achievement.classList.remove('locked');
            achievement.classList.add('unlocked');
            achievement.querySelector('.achievement-icon').textContent = '🎮';
          }
          break;
        case 'Card Shark':
          if (this.stats.gamesWon >= 10) {
            achievement.classList.remove('locked');
            achievement.classList.add('unlocked');
            achievement.querySelector('.achievement-icon').textContent = '🦈';
          }
          break;
        case 'Comedy Legend':
          if (this.stats.funniestPicks >= 50) {
            achievement.classList.remove('locked');
            achievement.classList.add('unlocked');
            achievement.querySelector('.achievement-icon').textContent = '😂';
          }
          break;
        case 'Degen Master':
          if (this.stats.level >= 10) {
            achievement.classList.remove('locked');
            achievement.classList.add('unlocked');
            achievement.querySelector('.achievement-icon').textContent = '👑';
          }
          break;
      }
    });
  }

  updateRecentGames(games) {
    const container = document.getElementById('recent-games-list');
    if (!container) return;

    if (games.length === 0) {
      container.innerHTML = `
        <div class="no-games">
          <p style="color: var(--text-muted); text-align: center; padding: 20px;">
            No recent games yet. <a href="/arena" style="color: var(--brand-green);">Start playing!</a>
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = games.map(game => `
      <div class="game-history-item">
        <div>
          <div class="game-type">${this.formatGameType(game.type)}</div>
          <div class="game-date">${this.formatDate(game.playedAt)}</div>
        </div>
        <div class="game-result ${game.won ? 'win' : 'loss'}">
          ${game.won ? 'Victory!' : 'Defeat'}
        </div>
      </div>
    `).join('');
  }

  formatGameType(type) {
    const types = {
      'degens-against-decency': 'Degens Against Decency',
      'dad': 'Degens Against Decency',
      '2-truths-and-a-lie': '2 Truths and a Lie',
      'poker': 'Poker'
    };
    return types[type] || type;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  async loadTipHistory() {
    if (!this.user) return;

    const listContainer = document.getElementById('tip-history-list');
    if (listContainer) {
      listContainer.innerHTML = '<div class="loading">Loading tip history...</div>';
    }

    try {
      const tipHistory = await this.fetchTipHistory();
      
      // Update tip stats
      const stats = this.calculateTipStats(tipHistory);
      this.setElementText('tip-total-sent', `${stats.totalSent.toFixed(SOL_DECIMAL_PLACES)} SOL`);
      this.setElementText('tip-total-received', `${stats.totalReceived.toFixed(SOL_DECIMAL_PLACES)} SOL`);
      this.setElementText('tip-count-sent', stats.countSent);
      this.setElementText('tip-count-received', stats.countReceived);

      // Display tip history
      if (!listContainer) return;

      if (tipHistory.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">No tip history yet. Start tipping with <a href="/tools/justthetip.html" style="color: #00d4aa;">JustTheTip</a>!</div>';
        return;
      }

      listContainer.innerHTML = tipHistory.map(tip => `
        <div class="game-history-item" style="padding: 16px; background: #0f1419; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${tip.type === 'sent' ? '#ff6b6b' : '#00d4aa'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; color: ${tip.type === 'sent' ? '#ff6b6b' : '#00d4aa'}; margin-bottom: 4px;">
                ${tip.type === 'sent' ? '↗️ Sent' : '↙️ Received'} ${tip.amount.toFixed(SOL_DECIMAL_PLACES)} SOL
              </div>
              <div style="font-size: 0.9rem; color: #888;">
                ${tip.type === 'sent' ? 'To: ' : 'From: '}${tip.otherUser}
              </div>
              ${tip.note ? `<div style="font-size: 0.85rem; color: #aaa; margin-top: 4px; font-style: italic;">"${tip.note}"</div>` : ''}
            </div>
            <div style="text-align: right; color: #888; font-size: 0.85rem;">
              ${this.formatDate(tip.timestamp)}
            </div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load tip history:', error);
      if (listContainer) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff6b6b;">Failed to load tip history. Please try again later.</div>';
      }
    }
  }

  async fetchTipHistory() {
    const response = await fetch('/api/tips');
    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated, return empty array
        return [];
      }
      throw new Error('Failed to fetch tip history');
    }
    const data = await response.json();
    return data.tips || [];
  }

  async loadPendingTips() {
    if (!this.user) return;

    const pendingContainer = document.getElementById('pending-tips-list');
    if (pendingContainer) {
      pendingContainer.innerHTML = '<div class="loading">Loading pending tips...</div>';
    }

    try {
      const response = await fetch('/api/tips/pending');
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error('Failed to fetch pending tips');
      }
      const data = await response.json();
      const pendingTips = data.pendingTips || [];

      this.updatePendingTipsDisplay(pendingTips);
    } catch (error) {
      console.error('Failed to load pending tips:', error);
      if (pendingContainer) {
        pendingContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Failed to load pending tips.</div>';
      }
    }
  }

  updatePendingTipsDisplay(pendingTips) {
    const pendingContainer = document.getElementById('pending-tips-list');
    const pendingSection = document.getElementById('pending-tips-section');
    
    if (!pendingContainer) return;

    if (pendingTips.length === 0) {
      if (pendingSection) {
        pendingSection.style.display = 'none';
      }
      return;
    }

    if (pendingSection) {
      pendingSection.style.display = 'block';
    }

    pendingContainer.innerHTML = pendingTips.map(tip => `
      <div class="game-history-item" style="padding: 16px; background: #1a1f26; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #f0ad4e;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600; color: #f0ad4e; margin-bottom: 4px;">
              ⏳ Pending: ${tip.amount.toFixed(SOL_DECIMAL_PLACES)} SOL
            </div>
            <div style="font-size: 0.9rem; color: #888;">
              From: ${tip.senderId}
            </div>
            <div style="font-size: 0.85rem; color: #aaa; margin-top: 4px;">
              Register your wallet to claim this tip
            </div>
          </div>
          <div style="text-align: right; color: #888; font-size: 0.85rem;">
            ${this.formatDate(tip.timestamp)}
          </div>
        </div>
      </div>
    `).join('');
  }

  async loadWalletStatus() {
    if (!this.user) return;

    try {
      const response = await fetch('/api/tips/wallet');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      
      this.updateWalletDisplay(data);
    } catch (error) {
      console.error('Failed to load wallet status:', error);
    }
  }

  updateWalletDisplay(walletData) {
    const walletStatus = document.getElementById('wallet-status');
    const connectBtn = document.getElementById('wallet-connect-btn');
    
    if (walletData.connected) {
      if (walletStatus) {
        walletStatus.textContent = `✅ Connected: ${this.truncateAddress(walletData.address)}`;
      }
      if (connectBtn) {
        connectBtn.textContent = 'Disconnect';
        connectBtn.classList.add('connected');
      }
    }
  }

  truncateAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  calculateTipStats(tips) {
    return tips.reduce((acc, tip) => {
      if (tip.type === 'sent') {
        acc.totalSent += tip.amount;
        acc.countSent++;
      } else {
        acc.totalReceived += tip.amount;
        acc.countReceived++;
      }
      return acc;
    }, { totalSent: 0, totalReceived: 0, countSent: 0, countReceived: 0 });
  }

  setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.location.href = '/auth/logout';
      });
    }

    // Integration buttons
    document.querySelectorAll('.integration-card button').forEach(btn => {
      btn.addEventListener('click', () => {
        alert('Integration feature coming soon!');
      });
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.profileManager = new ProfileManager();
});
