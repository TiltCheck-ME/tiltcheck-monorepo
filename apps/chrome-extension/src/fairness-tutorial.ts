/**
 * Fairness Tutorial - Interactive Provably Fair Onboarding
 * Step-by-step walkthrough explaining provably fair verification
 * Auto-triggers on first visit, re-accessible via "Learn" button
 */

interface TutorialStep {
  title: string;
  body: string;
  target: string | null; // CSS selector for spotlight element, null = centered
  action?: () => void;   // Optional action to run when step activates
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'What is Provably Fair?',
    body: 'Provably fair means you can mathematically verify that every casino bet result is genuine and wasn\'t manipulated. Casinos use cryptographic hash functions (HMAC-SHA256) to commit to results before you bet. TiltCheck helps you verify this automatically.',
    target: null,
  },
  {
    title: 'The Server Seed',
    body: 'Before each betting session, the casino generates a secret server seed and shows you only its hash (a fingerprint). After the session ends and you rotate seeds, they reveal the actual seed. If the hash matches, the results were fair.',
    target: '#fv-server',
  },
  {
    title: 'Your Client Seed & Nonce',
    body: 'Your client seed is your personal randomness contribution \u2014 you can change it anytime. The nonce is a counter that increments with each bet, ensuring every result is unique. TiltCheck auto-tracks your nonce.',
    target: '#fv-client',
  },
  {
    title: 'See It in Action',
    body: 'Let\'s verify a sample bet. We\'ve filled in example seeds and nonce. The result shows: a Dice number (0\u2013100), a Crash/Limbo multiplier, and the raw cryptographic hash. If you enter the same inputs, you\'ll always get the same result \u2014 that\'s the proof.',
    target: '#fv-results',
    action: () => {
      const server = document.getElementById('fv-server') as HTMLInputElement;
      const client = document.getElementById('fv-client') as HTMLInputElement;
      const nonce = document.getElementById('fv-nonce') as HTMLInputElement;
      if (server) server.value = 'example-server-seed';
      if (client) client.value = 'example-client-seed';
      if (nonce) nonce.value = '0';
      // Trigger verification through existing event system
      window.dispatchEvent(new CustomEvent('tg-calc-fairness', {
        detail: { serverSeed: 'example-server-seed', clientSeed: 'example-client-seed', nonce: '0' }
      }));
    },
  },
  {
    title: 'Track Every Bet',
    body: 'Every verification is saved in your history. After a seed rotation, paste your revealed server seed here and verify past bets one by one. If any result doesn\'t match, the casino may have cheated. You can re-open this tutorial anytime with the "Learn" button.',
    target: '#fv-tab-history',
  },
];

let currentStep = 0;
let overlayEl: HTMLElement | null = null;

function createOverlay(): HTMLElement {
  // Remove any existing overlay
  removeOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'pf-tutorial-overlay';
  overlay.innerHTML = `
    <div class="pf-tutorial-backdrop"></div>
    <div class="pf-tutorial-spotlight"></div>
    <div class="pf-tutorial-card">
      <div class="pf-tutorial-card-header">
        <span class="pf-tutorial-step-label"></span>
        <button class="pf-tutorial-skip">Skip</button>
      </div>
      <h3 class="pf-tutorial-title"></h3>
      <p class="pf-tutorial-body"></p>
      <div class="pf-tutorial-footer">
        <div class="pf-tutorial-dots"></div>
        <div class="pf-tutorial-nav">
          <button class="pf-tutorial-btn pf-tutorial-prev">Back</button>
          <button class="pf-tutorial-btn pf-tutorial-next">Next</button>
        </div>
      </div>
    </div>
  `;

  // Wire up navigation
  overlay.querySelector('.pf-tutorial-skip')!.addEventListener('click', endTutorial);
  overlay.querySelector('.pf-tutorial-prev')!.addEventListener('click', () => goToStep(currentStep - 1));
  overlay.querySelector('.pf-tutorial-next')!.addEventListener('click', () => {
    if (currentStep === TUTORIAL_STEPS.length - 1) {
      endTutorial();
    } else {
      goToStep(currentStep + 1);
    }
  });

  // Build dots
  const dotsContainer = overlay.querySelector('.pf-tutorial-dots')!;
  TUTORIAL_STEPS.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'pf-tutorial-dot';
    dot.addEventListener('click', () => goToStep(i));
    dotsContainer.appendChild(dot);
  });

  const sidebar = document.getElementById('tiltguard-sidebar');
  if (sidebar) {
    sidebar.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }

  overlayEl = overlay;
  return overlay;
}

function removeOverlay() {
  const existing = document.getElementById('pf-tutorial-overlay');
  if (existing) existing.remove();
  overlayEl = null;
}

function goToStep(index: number) {
  if (index < 0 || index >= TUTORIAL_STEPS.length) return;
  currentStep = index;
  const step = TUTORIAL_STEPS[currentStep];

  if (!overlayEl) return;

  // Update text
  overlayEl.querySelector('.pf-tutorial-step-label')!.textContent = `Step ${currentStep + 1} of ${TUTORIAL_STEPS.length}`;
  overlayEl.querySelector('.pf-tutorial-title')!.textContent = step.title;
  overlayEl.querySelector('.pf-tutorial-body')!.textContent = step.body;

  // Update dots
  overlayEl.querySelectorAll('.pf-tutorial-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentStep);
    dot.classList.toggle('completed', i < currentStep);
  });

  // Update nav buttons
  const prevBtn = overlayEl.querySelector('.pf-tutorial-prev') as HTMLButtonElement;
  const nextBtn = overlayEl.querySelector('.pf-tutorial-next') as HTMLButtonElement;
  prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
  nextBtn.textContent = currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next';

  // Position spotlight
  const spotlight = overlayEl.querySelector('.pf-tutorial-spotlight') as HTMLElement;
  const card = overlayEl.querySelector('.pf-tutorial-card') as HTMLElement;

  if (step.target) {
    const targetEl = document.getElementById(step.target.replace('#', ''));
    if (targetEl) {
      // Ensure verifier panel is open
      const panel = document.getElementById('tg-verifier-panel');
      if (panel) panel.style.display = 'block';

      // If targeting history tab, click it to show it
      if (step.target === '#fv-tab-history') {
        const historyTab = document.querySelector('[data-target="fv-tab-history"]') as HTMLElement;
        if (historyTab) historyTab.click();
      } else {
        // Make sure verify tab is active for other steps
        const verifyTab = document.querySelector('[data-target="fv-tab-verify"]') as HTMLElement;
        if (verifyTab && currentStep >= 1 && currentStep <= 3) verifyTab.click();
      }

      // Calculate position relative to the sidebar overlay
      const rect = targetEl.getBoundingClientRect();
      const sidebarEl = document.getElementById('tiltguard-sidebar');
      const sidebarRect = sidebarEl ? sidebarEl.getBoundingClientRect() : { left: 0, top: 0 };

      const relLeft = rect.left - sidebarRect.left;
      const relTop = rect.top - sidebarRect.top;

      const padding = 6;
      spotlight.style.display = 'block';
      spotlight.style.left = `${relLeft - padding}px`;
      spotlight.style.top = `${relTop - padding}px`;
      spotlight.style.width = `${rect.width + padding * 2}px`;
      spotlight.style.height = `${rect.height + padding * 2}px`;

      // Position card below spotlight
      const cardTop = relTop + rect.height + padding + 12;
      card.style.top = `${cardTop}px`;
      card.style.left = '16px';
      card.style.right = '16px';
      card.style.transform = 'none';

      // Scroll the target into view within the sidebar
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      spotlight.style.display = 'none';
      card.style.top = '50%';
      card.style.left = '16px';
      card.style.right = '16px';
      card.style.transform = 'translateY(-50%)';
    }
  } else {
    // No target — center the card
    spotlight.style.display = 'none';
    card.style.top = '50%';
    card.style.left = '16px';
    card.style.right = '16px';
    card.style.transform = 'translateY(-50%)';
  }

  // Run step action
  if (step.action) step.action();
}

function endTutorial() {
  removeOverlay();
  markTutorialComplete();
}

export function startFairnessTutorial(): void {
  // Ensure verifier panel is open
  const panel = document.getElementById('tg-verifier-panel');
  if (panel) panel.style.display = 'block';

  currentStep = 0;
  createOverlay();
  goToStep(0);
}

export function shouldShowTutorial(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tiltcheck_fairness_tutorial_done'], (result) => {
        resolve(!result.tiltcheck_fairness_tutorial_done);
      });
    } else {
      // Fallback to localStorage
      resolve(!localStorage.getItem('tiltcheck_fairness_tutorial_done'));
    }
  });
}

export function markTutorialComplete(): void {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ tiltcheck_fairness_tutorial_done: true });
  } else {
    localStorage.setItem('tiltcheck_fairness_tutorial_done', 'true');
  }
}
