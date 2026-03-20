/**
 * TiltLive Frontend Controller
 * Handles real-time trivia synchronization via WebSockets
 */

(function () {
  let socket;
  let user = null;
  let currentGameId = null;
  let currentQuestionId = null;
  let hasAnswered = false;
  let isEliminated = false;

  // DOM Elements
  const elements = {
    survivorNum: document.getElementById('survivor-num'),
    prizeAmount: document.getElementById('prize-amount'),
    waitingScreen: document.getElementById('waiting-screen'),
    roundScreen: document.getElementById('round-screen'),
    resultScreen: document.getElementById('result-screen'),
    questionText: document.getElementById('question-text'),
    currentRoundText: document.getElementById('current-round'),
    timerText: document.getElementById('round-timer-text'),
    timerRing: document.getElementById('timer-ring-progress'),
    answersGrid: document.getElementById('answers-grid'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    statusOverlay: document.getElementById('status-overlay'),
    buyBackBtn: document.getElementById('buy-back-btn'),
    apeInBtn: document.getElementById('ape-in-btn'),
    joinBtn: document.getElementById('join-game-btn'),
    countdownTimer: document.getElementById('countdown-timer')
  };

  // --- Initialization ---
  async function init() {
    // Wait for auth to be ready
    // Check auth status
    user = window.tiltCheckAuth?.getUser();
    
    if (!user) {
      console.log('[TiltLive] No user found, showing login state');
      const joinBtn = document.getElementById('join-game-btn');
      if (joinBtn) {
        joinBtn.textContent = 'LOGIN WITH DISCORD TO PLAY';
        joinBtn.onclick = () => window.location.href = '/login.html';
      }
      addChatMessage('System', 'Please login with Discord to participate in the trivia bowl.');
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isLocal ? 'http://127.0.0.1:3010' : 'https://api.tiltcheck.me';

    console.log('[TiltLive] Connecting to:', socketUrl);
    socket = io(socketUrl, { 
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    setupSocketListeners();
    setupUIListeners();
  }

  // --- Socket Event Handlers ---
  function setupSocketListeners() {
    socket.on('connect', () => {
      console.log('[TiltLive] Socket Connected');
      addChatMessage('System', 'Connected to TiltLive Backbone.', 'system');
      
      // Auto-join if game is already active/scheduled
      socket.emit('join-game', { gameId: 'live-trivia' });
    });

    socket.on('game-update', (data) => {
      if (data.type === 'trivia-started') {
        startGame(data);
      } else if (data.type === 'trivia-completed') {
        endGame(data);
      } else if (data.type === 'buy-back-success') {
        handleBuyBackSuccess();
      }
      
      if (data.survivorCount !== undefined) {
        elements.survivorNum.innerText = data.survivorCount.toLocaleString();
      }
    });

    socket.on('trivia-round-start', (data) => {
      showRound(data);
    });

    socket.on('trivia-round-reveal', (data) => {
      showReveal(data);
    });

    socket.on('trivia-ape-in-result', (data) => {
      showHeatmap(data.distribution);
    });

    socket.on('chat-message', (data) => {
      addChatMessage(data.username, data.message);
    });

    socket.on('game-error', (msg) => {
      addChatMessage('Error', msg, 'system');
    });
  }

  // --- UI Logical Handlers ---
  function setupUIListeners() {
    elements.joinBtn.addEventListener('click', () => {
      socket.emit('join-game', { gameId: 'live-trivia' });
      elements.joinBtn.disabled = true;
      elements.joinBtn.innerText = 'WAITING FOR START...';
    });

    elements.answersGrid.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (hasAnswered || isEliminated) return;
        
        const index = btn.dataset.index;
        const answerText = btn.querySelector('.ans-text').innerText;
        
        socket.emit('submit-trivia-answer', { 
          questionId: currentQuestionId, 
          answer: answerText 
        });

        // Visual feedback
        hasAnswered = true;
        btn.classList.add('selected');
        elements.answersGrid.querySelectorAll('.answer-btn').forEach(b => b.classList.add('disabled'));
      });
    });

    elements.apeInBtn.addEventListener('click', () => {
      socket.emit('request-ape-in', { gameId: 'live-trivia', questionId: currentQuestionId });
    });

    elements.buyBackBtn.addEventListener('click', () => {
      socket.emit('buy-back', { gameId: 'live-trivia' });
    });

    elements.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const msg = elements.chatInput.value.trim();
        if (msg) {
          socket.emit('chat-message', msg);
          elements.chatInput.value = '';
        }
      }
    });
  }

  // --- State Transitions ---

  function startGame(data) {
    switchScreen('round-screen');
    elements.prizeAmount.innerText = `${data.prizePool} SOL`;
    addChatMessage('TiltLive', 'The game has officially begun. Stay sharp.', 'system');
    elements.chatInput.disabled = false;
  }

  function showRound(data) {
    currentGameId = data.gameId;
    currentQuestionId = data.questionId;
    hasAnswered = false;
    
    switchScreen('round-screen');
    elements.currentRoundText.innerText = `ROUND ${data.round}/${data.totalRounds}`;
    elements.questionText.innerText = data.question;
    
    // Reset buttons
    const btns = elements.answersGrid.querySelectorAll('.answer-btn');
    data.choices.forEach((choice, i) => {
      const btn = btns[i];
      btn.querySelector('.ans-text').innerText = choice;
      btn.classList.remove('selected', 'disabled', 'correct', 'incorrect');
      btn.querySelector('.heatmap-bar').style.width = '0%';
    });

    startTimer(data.durationMs || 15000);
  }

  function showReveal(data) {
    stopTimer();
    const btns = elements.answersGrid.querySelectorAll('.answer-btn');
    
    btns.forEach(btn => {
      const text = btn.querySelector('.ans-text').innerText;
      if (text === data.correctAnswer) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('selected')) {
        btn.classList.add('incorrect');
      }
      btn.classList.add('disabled');
    });

    // Handle elimination
    if (data.eliminatedUsers && user && data.eliminatedUsers.includes(user.id)) {
      isEliminated = true;
      showEliminationModal();
    }

    addChatMessage('TiltLive', `Round over. ${data.survivorCount} players still standing.`, 'system');
  }

  function handleBuyBackSuccess() {
    isEliminated = false;
    elements.statusOverlay.style.display = 'none';
    addChatMessage('System', 'RE-ENTERED. You are back in the game!', 'system');
  }

  function showHeatmap(distribution) {
    const btns = elements.answersGrid.querySelectorAll('.answer-btn');
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    
    btns.forEach(btn => {
      const text = btn.querySelector('.ans-text').innerText;
      const count = distribution[text] || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      btn.querySelector('.heatmap-bar').style.width = `${pct}%`;
    });
  }

  // --- Utilities ---

  function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  function showEliminationModal() {
    elements.statusOverlay.style.display = 'flex';
  }

  let timerInterval;
  function startTimer(duration) {
    let timeLeft = duration / 1000;
    elements.timerText.innerText = Math.ceil(timeLeft);
    
    const totalDash = 220;
    elements.timerRing.style.strokeDashoffset = 0;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timeLeft = 0;
      }
      elements.timerText.innerText = Math.ceil(timeLeft);
      const offset = totalDash - (timeLeft / (duration / 1000) * totalDash);
      elements.timerRing.style.strokeDashoffset = offset;
    }, 100);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function addChatMessage(username, message, type = '') {
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerHTML = `<strong>${username}:</strong> ${message}`;
    elements.chatMessages.appendChild(div);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  function endGame(data) {
    switchScreen('waiting-screen');
    const winners = data.winners.map(w => w.username).join(', ');
    addChatMessage('System', `Game Over. Winners: ${winners || 'None'}`, 'system');
    elements.joinBtn.disabled = false;
    elements.joinBtn.innerText = 'SECURE SEAT (0.01 SOL)';
  }

  // Initialize
  window.addEventListener('DOMContentLoaded', init);
})();
