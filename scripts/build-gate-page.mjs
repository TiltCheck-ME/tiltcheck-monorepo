/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */

export function getGatePageBody(staffOnlyHtml) {
  return `
  <div class="timecheck-container">
    <header class="timecheck-hero">
      <span class="brand-eyebrow" style="margin-bottom:0.75rem;">Session Launcher</span>
      <h1>TimeCheck</h1>
      <p>Pick your limits before you step on the gas. When your timer rings, walk with your bag.</p>
    </header>

    <div class="timecheck-card" id="timecheck-setup-card">
      <h2>1. Pick where you're playing</h2>
      <div class="chip-group" id="casino-chips">
        <button type="button" class="chip-btn active" data-url="https://stake.us" data-name="Stake.us">Stake.us</button>
        <button type="button" class="chip-btn" data-url="https://stake.com" data-name="Stake.com">Stake.com</button>
        <button type="button" class="chip-btn" data-url="https://crowncoinscasino.com" data-name="Crown Coins">Crown Coins</button>
        <button type="button" class="chip-btn" data-url="https://mcluck.com" data-name="McLuck">McLuck</button>
        <button type="button" class="chip-btn" data-url="https://pulsz.com" data-name="Pulsz">Pulsz</button>
        <button type="button" class="chip-btn" data-url="https://chumbacasino.com" data-name="Chumba">Chumba</button>
        <button type="button" class="chip-btn" data-url="https://roobet.com" data-name="Roobet">Roobet</button>
        <button type="button" class="chip-btn" data-url="#" data-name="Other">Other / App</button>
      </div>

      <h2>2. Set your session timer</h2>
      <div class="chip-group" id="time-chips">
        <button type="button" class="chip-btn" data-mins="15">15 mins</button>
        <button type="button" class="chip-btn active" data-mins="30">30 mins</button>
        <button type="button" class="chip-btn" data-mins="45">45 mins</button>
        <button type="button" class="chip-btn" data-mins="60">60 mins</button>
      </div>

      <h2>3. Set your stop-loss limit (optional)</h2>
      <div class="chip-group" id="stop-loss-chips">
        <button type="button" class="chip-btn" data-loss="20">$20</button>
        <button type="button" class="chip-btn active" data-loss="50">$50</button>
        <button type="button" class="chip-btn" data-loss="100">$100</button>
        <button type="button" class="chip-btn" data-loss="0">No limit</button>
      </div>

      <button type="button" class="timecheck-launch-btn" id="btn-launch-session">
        Launch Session with Timer
      </button>

      <button type="button" class="cooldown-quick-btn" id="btn-emergency-lock">
        Need a Break? Touch Grass for 24 Hours
      </button>
    </div>

    <!-- Active Timer Card (Hidden until launched) -->
    <div class="timecheck-card" id="timecheck-active-card" style="display:none; text-align:center;">
      <span class="brand-eyebrow" style="color:#38bdf8; border-color:rgba(56,189,248,0.3); background:rgba(56,189,248,0.1);">Session In Progress</span>
      <h2 id="active-casino-name" style="font-size:1.5rem; margin:0.5rem 0 1rem; color:#fff;">Playing on Stake.us</h2>
      
      <div style="font-family:var(--font-display); font-size:4rem; font-weight:900; color:#17c3b2; letter-spacing:-0.03em; margin:1rem 0;" id="timer-countdown">
        30:00
      </div>

      <p id="active-commitment-text" style="color:#94a3b8; font-size:0.9rem; margin-bottom:1.5rem;">
        Stop-loss reminder: $50. Walk when you hit it.
      </p>

      <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
        <button type="button" class="chip-btn" id="btn-reopen-casino" style="background:rgba(23,195,178,0.15); border-color:#17c3b2; color:#fff; font-weight:700;">
          Reopen Casino Tab
        </button>
        <button type="button" class="chip-btn" id="btn-end-session" style="background:rgba(239,68,68,0.15); border-color:#f87171; color:#fca5a5;">
          End Session & Walk
        </button>
      </div>
    </div>

    ${staffOnlyHtml || ''}
  </div>

  <script>
  (function() {
    var selectedCasinoUrl = 'https://stake.us';
    var selectedCasinoName = 'Stake.us';
    var selectedMinutes = 30;
    var selectedStopLoss = 50;
    var timerInterval = null;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    }

    var setupCard = document.getElementById('timecheck-setup-card');
    var activeCard = document.getElementById('timecheck-active-card');
    var countdownEl = document.getElementById('timer-countdown');
    var casinoNameEl = document.getElementById('active-casino-name');
    var commitTextEl = document.getElementById('active-commitment-text');

    document.querySelectorAll('#casino-chips .chip-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#casino-chips .chip-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedCasinoUrl = btn.dataset.url;
        selectedCasinoName = btn.dataset.name;
      });
    });

    document.querySelectorAll('#time-chips .chip-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#time-chips .chip-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedMinutes = Number(btn.dataset.mins);
      });
    });

    document.querySelectorAll('#stop-loss-chips .chip-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#stop-loss-chips .chip-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedStopLoss = Number(btn.dataset.loss);
      });
    });

    function playSoundAlert() {
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        var ctx = new AudioCtx();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch (e) {}
    }

    function checkActiveSession() {
      try {
        var raw = localStorage.getItem('tc_active_session');
        if (!raw) return;
        var session = JSON.parse(raw);
        if (session.endTime > Date.now()) {
          startSessionDisplay(session);
        } else {
          localStorage.removeItem('tc_active_session');
        }
      } catch (e) {}
    }

    function startSessionDisplay(session) {
      setupCard.style.display = 'none';
      activeCard.style.display = 'block';
      casinoNameEl.textContent = 'Playing on ' + session.casinoName;
      commitTextEl.textContent = session.stopLoss > 0
        ? 'Stop-loss limit: $' + session.stopLoss + '. Stick to it and walk.'
        : 'Session in progress. Stay sharp.';

      clearInterval(timerInterval);
      function updateTimer() {
        var remainingMs = session.endTime - Date.now();
        if (remainingMs <= 0) {
          clearInterval(timerInterval);
          countdownEl.textContent = '00:00';
          countdownEl.style.color = '#ef4444';
          commitTextEl.textContent = 'Time is up! Walk with your bag or give it all back.';
          playSoundAlert();
          localStorage.removeItem('tc_active_session');
          return;
        }
        var totalSec = Math.floor(remainingMs / 1000);
        var m = Math.floor(totalSec / 60);
        var s = totalSec % 60;
        countdownEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      }
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
    }

    document.getElementById('btn-launch-session').addEventListener('click', function() {
      var endTime = Date.now() + selectedMinutes * 60 * 1000;
      var session = {
        casinoName: selectedCasinoName,
        casinoUrl: selectedCasinoUrl,
        stopLoss: selectedStopLoss,
        endTime: endTime
      };
      localStorage.setItem('tc_active_session', JSON.stringify(session));
      startSessionDisplay(session);

      if (selectedCasinoUrl && selectedCasinoUrl !== '#') {
        window.open(selectedCasinoUrl, '_blank');
      }
    });

    document.getElementById('btn-reopen-casino').addEventListener('click', function() {
      try {
        var session = JSON.parse(localStorage.getItem('tc_active_session') || '{}');
        if (session.casinoUrl && session.casinoUrl !== '#') {
          window.open(session.casinoUrl, '_blank');
        }
      } catch (e) {}
    });

    document.getElementById('btn-end-session').addEventListener('click', function() {
      if (confirm('End this session and reset your timer?')) {
        clearInterval(timerInterval);
        localStorage.removeItem('tc_active_session');
        activeCard.style.display = 'none';
        setupCard.style.display = 'block';
      }
    });

    document.getElementById('btn-emergency-lock').addEventListener('click', function() {
      if (confirm('Activate 24-hour Touch Grass cooldown? This locks cashier buttons across supported rooms.')) {
        var lockEnd = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('tiltcheck_cooldown_active_until', String(lockEnd));
        alert('Touch Grass active. Cashier buttons are locked until ' + new Date(lockEnd).toLocaleTimeString());
        window.location.href = '/cooldown/';
      }
    });

    checkActiveSession();
  })();
  </script>
  `;
}
