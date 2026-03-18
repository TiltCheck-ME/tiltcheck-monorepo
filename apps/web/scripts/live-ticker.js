/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Live Event Ticker for the landing page.
 * Simulates real-time system signals to show the platform is alive.
 */
(function () {
  const tickerFeed = document.getElementById('live-ticker-feed');
  if (!tickerFeed) return;

  const events = [
    { time: '0.4s ago', text: 'Tilt detected on Stake.com — Cooldown nudge sent.', type: 'tilt' },
    { time: '1.2m ago', text: 'Phishing redirect blocked for User #812.', type: 'sec' },
    { time: '5s ago', text: 'Autovault triggered: +0.42 SOL secured for future-self.', type: 'vault' },
    { time: '15s ago', text: 'Casino Fairness Pulse: Stake.com behaving within 99.8% confidence.', type: 'trust' },
    { time: '3h ago', text: 'New scam domain blacklisted: hyperbet-bonus.net', type: 'sec' },
    { time: '2s ago', text: 'JustTheTip: 0.1 SOL peer-to-peer swap completed.', type: 'swap' },
    { time: '24s ago', text: 'Tilt Engine: Manual Wallet Lock engaged for 1 hour.', type: 'tilt' },
    { time: '10s ago', text: 'BonusCheck: Roobet daily reload nerf detected (-15%).', type: 'bonus' }
  ];

  let currentIndex = 0;

  function rotateTicker() {
    const event = events[currentIndex];
    
    // Create new event element
    const span = document.createElement('span');
    span.className = `ticker-event type-${event.type}`;
    span.innerHTML = `<span class="ticker-time">[${event.time}]</span> ${event.text}`;
    
    // Clear and Append with a quick fade
    tickerFeed.innerHTML = '';
    tickerFeed.appendChild(span);
    
    // Fade in animation
    span.style.opacity = '0';
    span.style.transform = 'translateY(10px)';
    span.style.transition = 'opacity 400ms ease, transform 400ms ease';
    
    requestAnimationFrame(() => {
      span.style.opacity = '1';
      span.style.transform = 'translateY(0)';
    });

    currentIndex = (currentIndex + 1) % events.length;
    
    // Schedule next rotation with slight randomness (3-5 seconds)
    const nextInterval = 3000 + Math.random() * 2000;
    setTimeout(rotateTicker, nextInterval);
  }

  // Start rotation after a short delay
  setTimeout(rotateTicker, 1000);
})();
