/**
 * Game management and real-time gameplay
 * 
 * Copyright (c) 2024 Degens Against Decency
 * Licensed under the MIT License
 * See LICENSE file in the project root for full license information.
 */

class GameManager {
  constructor() {
    this.socket = null;
    this.user = null;
    this.gameId = null;
    this.gameState = null;
    this.gameRenderer = null;
    this.isSpectator = false;
    this.init();
  }

  async init() {
    // Get game ID from URL
    const pathParts = window.location.pathname.split('/');
    this.gameId = pathParts[pathParts.length - 1];
    
    // Check if spectator mode
    const urlParams = new URLSearchParams(window.location.search);
    this.isSpectator = urlParams.get('spectate') === 'true';

    await this.loadUser();
    this.setupSocket();
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

  setupSocket() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('Connected to server');
      if (this.isSpectator) {
        this.socket.emit('spectate-game', this.gameId);
      } else {
        this.socket.emit('join-game', this.gameId);
      }
    });

    this.socket.on('game-update', (gameState) => {
      this.gameState = gameState;
      this.updateGameDisplay();
    });

    this.socket.on('spectator-mode', (enabled) => {
      if (enabled) {
        this.showSpectatorBadge();
      }
    });

    this.socket.on('chat-message', (message) => {
      this.addChatMessage(message);
    });

    this.socket.on('error', (error) => {
      alert(`Error: ${error}`);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  showSpectatorBadge() {
    const gameInfo = document.querySelector('.game-info');
    if (gameInfo && !document.querySelector('.spectator-mode-badge')) {
      const badge = document.createElement('div');
      badge.className = 'spectator-mode-badge';
      badge.textContent = 'Spectator Mode';
      gameInfo.appendChild(badge);
    }
    
    // Disable game actions for spectators
    const gameActions = document.getElementById('game-actions');
    if (gameActions) {
      const note = document.createElement('p');
      note.style.color = 'var(--brand-teal)';
      note.style.textAlign = 'center';
      note.style.marginTop = '10px';
      note.textContent = '👁️ You are watching this game as a spectator';
      gameActions.appendChild(note);
    }
  }

  setupEventListeners() {
    // Leave game button
    const leaveBtn = document.getElementById('leave-game');
    leaveBtn.addEventListener('click', () => {
      this.socket.emit('leave-game');
      window.location.href = '/arena';
    });

    // Chat functionality
    const chatInput = document.getElementById('chat-input');
    const sendChat = document.getElementById('send-chat');

    const sendMessage = () => {
      const message = chatInput.value.trim();
      if (message) {
        this.socket.emit('chat-message', {
          gameId: this.gameId,
          message: message,
          sender: this.user.username
        });
        chatInput.value = '';
      }
    };

    sendChat.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // Modal close
    const modalClose = document.querySelector('.modal-close');
    const modal = document.getElementById('game-modal');
    
    modalClose.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }

  updateUserDisplay() {
    const playerName = document.getElementById('player-name');
    const playerAvatar = document.getElementById('player-avatar');

    if (playerName && this.user) {
      playerName.textContent = `${this.user.username}#${this.user.discriminator}`;
    }

    if (playerAvatar && this.user) {
      if (this.user.avatar) {
        playerAvatar.src = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=128`;
      } else {
        const defaultAvatarIndex = parseInt(this.user.discriminator) % 5;
        playerAvatar.src = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
      }
    }
  }

  updateGameDisplay() {
    if (!this.gameState) return;

    // Update game title and meta info
    const gameTitle = document.getElementById('game-title');
    const gameRound = document.getElementById('game-round');
    const gameStatus = document.getElementById('game-status');

    gameTitle.textContent = this.formatGameType(this.gameState.type);
    gameRound.textContent = `Round ${this.gameState.currentRound || 1}`;
    gameStatus.textContent = this.formatStatus(this.gameState.status);

    // Check if game just finished and show feedback survey
    if (this.gameState.status === 'finished' && this.user && !this.isSpectator) {
      // Show feedback survey after a short delay
      setTimeout(() => {
        if (window.feedbackSurvey) {
          window.feedbackSurvey.show(this.gameId, this.user.id);
        }
      }, 2000);
    }

    // Update players list
    this.updatePlayersList();

    // Update game-specific content based on game type
    this.initializeGameRenderer();
    this.gameRenderer.render(this.gameState);
  }

  initializeGameRenderer() {
    if (this.gameRenderer && this.gameRenderer.gameType === this.gameState.type) {
      return; // Already have the correct renderer
    }

    switch (this.gameState.type) {
      case 'degens-against-decency':
        this.gameRenderer = new DegensGameRenderer(this);
        break;
      case '2-truths-and-a-lie':
        this.gameRenderer = new TwoTruthsGameRenderer(this);
        break;
      case 'poker':
        this.gameRenderer = new PokerGameRenderer(this);
        break;
      default:
        console.error('Unknown game type:', this.gameState.type);
    }
  }

  updatePlayersList() {
    const playersList = document.getElementById('players-list');
    
    if (!this.gameState.players) {
      playersList.innerHTML = '<div class="loading">Loading players...</div>';
      return;
    }

    playersList.innerHTML = this.gameState.players.map(player => {
      const score = this.gameState.scores[player.id] || 0;
      const isCurrentPlayer = this.gameState.currentPlayer?.id === player.id;
      
      return `
        <div class="player-item ${isCurrentPlayer ? 'current-player' : ''}">
          <img src="https://cdn.discordapp.com/embed/avatars/${parseInt(player.id) % 5}.png" alt="${player.username}" />
          <div class="player-name">${player.username}</div>
          <div class="player-score">${score}</div>
        </div>
      `;
    }).join('');
  }

  formatGameType(type) {
    const types = {
      'degens-against-decency': 'Degens Against Decency',
      '2-truths-and-a-lie': '2 Truths and a Lie',
      'poker': 'Poker (5-Card Stud)'
    };
    return types[type] || type;
  }

  formatStatus(status) {
    const statuses = {
      'waiting': 'Waiting for Players',
      'playing': 'In Progress',
      'finished': 'Game Finished'
    };
    return statuses[status] || status;
  }

  addChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `
      <div class="sender">${message.sender}</div>
      <div class="text">${message.text}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  sendGameAction(action) {
    this.socket.emit('game-action', action);
  }
}

// Base game renderer
class BaseGameRenderer {
  constructor(gameManager, gameType) {
    this.gameManager = gameManager;
    this.gameType = gameType;
  }

  render(gameState) {
    // Override in subclasses
  }

  clearGameContent() {
    const gameContent = document.getElementById('game-content');
    const gameActions = document.getElementById('game-actions');
    gameContent.innerHTML = '';
    gameActions.innerHTML = '';
  }
}

// Degens Against Decency renderer
class DegensGameRenderer extends BaseGameRenderer {
  constructor(gameManager) {
    super(gameManager, 'degens-against-decency');
  }

  render(gameState) {
    this.clearGameContent();
    
    const gameContent = document.getElementById('game-content');
    const gameActions = document.getElementById('game-actions');

    if (gameState.status === 'waiting') {
      gameContent.innerHTML = `
        <div class="waiting-area">
          <h2>Waiting for Players</h2>
          <p>Need at least 3 players to start</p>
          <p>Current players: ${gameState.players.length}/${gameState.maxPlayers}</p>
        </div>
      `;
      
      if (gameState.creator.id === this.gameManager.user.id && gameState.players.length >= 2) {
        gameActions.innerHTML = `
          <button class="cta-button" onclick="gameManager.sendGameAction({type: 'start-game'})">
            Start Game
          </button>
        `;
      }
      return;
    }

    // Show current question
    if (gameState.currentQuestion) {
      gameContent.innerHTML = `
        <div class="degens-question">
          ${gameState.currentQuestion.text}
        </div>
      `;
    }

    // Show game phase
    const userId = this.gameManager.user.id;
    const isCardCzar = gameState.cardCzar?.id === userId;
    
    if (isCardCzar) {
      this.renderCardCzarView(gameState);
    } else {
      this.renderPlayerView(gameState);
    }
  }

  renderCardCzarView(gameState) {
    const gameContent = document.getElementById('game-content');
    const gameActions = document.getElementById('game-actions');

    if (gameState.submissions && gameState.submissions.length > 0) {
      const submissionsHtml = gameState.submissions.map((sub, index) => `
        <div class="submission-card" onclick="gameManager.sendGameAction({type: 'judge-submission', playerId: '${sub.playerId}'})">
          ${sub.card.text}
        </div>
      `).join('');

      gameContent.innerHTML += `
        <div class="submissions-area">
          <h3>Choose the winning answer:</h3>
          ${submissionsHtml}
        </div>
      `;
    } else {
      gameContent.innerHTML += `
        <div class="waiting-area">
          <h3>You are the Card Czar!</h3>
          <p>Waiting for other players to submit their answers...</p>
        </div>
      `;
    }
  }

  renderPlayerView(gameState) {
    const gameContent = document.getElementById('game-content');
    const userId = this.gameManager.user.id;
    
    // Check if player has submitted
    const hasSubmitted = gameState.submissions?.some(sub => sub.playerId === userId);
    
    if (hasSubmitted) {
      gameContent.innerHTML += `
        <div class="waiting-area">
          <h3>Answer Submitted!</h3>
          <p>Waiting for the Card Czar to choose the winner...</p>
        </div>
      `;
    } else if (gameState.playerHands && gameState.playerHands[userId]) {
      const hand = gameState.playerHands[userId];
      const handHtml = hand.map(card => `
        <div class="answer-card" onclick="gameManager.sendGameAction({type: 'submit-card', cardId: '${card.id}'})">
          ${card.text}
        </div>
      `).join('');

      gameContent.innerHTML += `
        <div class="player-hand-area">
          <h3>Choose your answer:</h3>
          <div class="player-hand">
            ${handHtml}
          </div>
        </div>
      `;
    }
  }
}

// 2 Truths and a Lie renderer
class TwoTruthsGameRenderer extends BaseGameRenderer {
  constructor(gameManager) {
    super(gameManager, '2-truths-and-a-lie');
  }

  render(gameState) {
    this.clearGameContent();
    
    const gameContent = document.getElementById('game-content');
    const gameActions = document.getElementById('game-actions');
    const userId = this.gameManager.user.id;

    if (gameState.status === 'waiting') {
      gameContent.innerHTML = `
        <div class="waiting-area">
          <h2>Waiting for Players</h2>
          <p>Need at least 3 players to start</p>
        </div>
      `;
      
      if (gameState.creator.id === userId && gameState.players.length >= 2) {
        gameActions.innerHTML = `
          <button class="cta-button" onclick="gameManager.sendGameAction({type: 'start-game'})">
            Start Game
          </button>
        `;
      }
      return;
    }

    // Show current prompt
    if (gameState.currentPrompt) {
      gameContent.innerHTML = `
        <div class="truths-lie-prompt">
          <h3>Current Topic:</h3>
          <p>${gameState.currentPrompt.prompt}</p>
        </div>
      `;
    }

    const isCurrentPlayer = gameState.currentPlayer?.id === userId;

    if (isCurrentPlayer) {
      this.renderCurrentPlayerView(gameState);
    } else {
      this.renderOtherPlayerView(gameState);
    }
  }

  renderCurrentPlayerView(gameState) {
    const gameContent = document.getElementById('game-content');
    const gameActions = document.getElementById('game-actions');

    if (gameState.statements.length === 0) {
      gameContent.innerHTML += `
        <div class="statements-input">
          <h3>Enter your 2 truths and 1 lie:</h3>
          <textarea id="statement-1" placeholder="Statement 1 (truth)"></textarea>
          <textarea id="statement-2" placeholder="Statement 2 (truth)"></textarea>
          <textarea id="statement-3" placeholder="Statement 3 (lie)"></textarea>
        </div>
      `;

      gameActions.innerHTML = `
        <button class="cta-button" onclick="this.submitStatements()">
          Submit Statements
        </button>
      `;
    } else {
      gameContent.innerHTML += `
        <div class="waiting-area">
          <h3>Waiting for others to guess...</h3>
          <div class="statements-area">
            ${gameState.statements.map((stmt, index) => `
              <div class="statement-item">
                <div class="statement-number">${index + 1}</div>
                <div>${stmt.text}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      if (gameState.allGuessed) {
        gameActions.innerHTML = `
          <button class="cta-button" onclick="gameManager.sendGameAction({type: 'reveal-results', lieIndex: 2})">
            Reveal Results
          </button>
        `;
      }
    }
  }

  renderOtherPlayerView(gameState) {
    const gameContent = document.getElementById('game-content');
    const gameActions = document.getElementById('game-actions');
    const userId = this.gameManager.user.id;

    if (gameState.statements.length === 0) {
      gameContent.innerHTML += `
        <div class="waiting-area">
          <h3>${gameState.currentPlayer?.username} is thinking...</h3>
          <p>Waiting for them to submit their statements</p>
        </div>
      `;
    } else {
      const hasGuessed = gameState.guesses?.some(guess => guess.playerId === userId);
      
      if (hasGuessed) {
        gameContent.innerHTML += `
          <div class="waiting-area">
            <h3>Guess Submitted!</h3>
            <p>Waiting for other players...</p>
          </div>
        `;
      } else {
        gameContent.innerHTML += `
          <div class="statements-area">
            <h3>Which one is the lie?</h3>
            ${gameState.statements.map((stmt, index) => `
              <div class="statement-item" onclick="gameManager.sendGameAction({type: 'make-guess', lieIndex: ${index}})">
                <div class="statement-number">${index + 1}</div>
                <div>${stmt.text}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
  }

  submitStatements() {
    const stmt1 = document.getElementById('statement-1').value.trim();
    const stmt2 = document.getElementById('statement-2').value.trim();
    const stmt3 = document.getElementById('statement-3').value.trim();

    if (stmt1 && stmt2 && stmt3) {
      gameManager.sendGameAction({
        type: 'submit-statements',
        statements: [stmt1, stmt2, stmt3]
      });
    } else {
      alert('Please fill in all three statements');
    }
  }
}

// Poker renderer
class PokerGameRenderer extends BaseGameRenderer {
  constructor(gameManager) {
    super(gameManager, 'poker');
  }

  render(gameState) {
    this.clearGameContent();
    
    const gameContent = document.getElementById('game-content');
    const gameActions = document.getElementById('game-actions');
    const userId = this.gameManager.user.id;

    if (gameState.status === 'waiting') {
      gameContent.innerHTML = `
        <div class="waiting-area">
          <h2>Waiting for Players</h2>
          <p>Need at least 3 players to start</p>
        </div>
      `;
      
      if (gameState.creator.id === userId && gameState.players.length >= 2) {
        gameActions.innerHTML = `
          <button class="cta-button" onclick="gameManager.sendGameAction({type: 'start-game'})">
            Start Game
          </button>
        `;
      }
      return;
    }

    // Show poker table
    gameContent.innerHTML = `
      <div class="poker-table">
        <div class="poker-pot">
          Pot: $${gameState.pot || 0}
        </div>
      </div>
    `;

    // Show player's hand
    if (gameState.playerHands && gameState.playerHands[userId]) {
      const hand = gameState.playerHands[userId];
      const handHtml = hand.map(card => `
        <div class="playing-card ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : ''}">
          ${card.rank}<br>${this.getSuitSymbol(card.suit)}
        </div>
      `).join('');

      gameContent.innerHTML += `
        <div class="player-cards">
          ${handHtml}
        </div>
      `;
    }

    // Show betting controls if it's player's turn
    if (gameState.currentPlayer?.id === userId) {
      const currentBet = gameState.currentBet || 0;
      const playerBet = gameState.playerBets?.[userId] || 0;
      const callAmount = currentBet - playerBet;

      gameActions.innerHTML = `
        <div class="betting-controls">
          <button class="secondary-button" onclick="gameManager.sendGameAction({type: 'fold'})">
            Fold
          </button>
          ${callAmount > 0 ? `
            <button class="cta-button" onclick="gameManager.sendGameAction({type: 'call'})">
              Call $${callAmount}
            </button>
          ` : `
            <button class="cta-button" onclick="gameManager.sendGameAction({type: 'check'})">
              Check
            </button>
          `}
          <button class="cta-button" onclick="gameManager.sendGameAction({type: 'raise', amount: ${Math.max(10, currentBet)}})">
            Raise $${Math.max(10, currentBet)}
          </button>
        </div>
      `;
    }
  }

  getSuitSymbol(suit) {
    const symbols = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit] || suit;
  }
}

// Initialize game manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.gameManager = new GameManager();
});