// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

'use strict';

const state = {
    step: 1,
    riskLevel: 'degen',
    walletAddress: null,
    buddyId: null,
    threshold: 500,
    tosAccepted: false
};

const TOTAL_STEPS = 5;

window.addEventListener('DOMContentLoaded', () => {
    setupStep1();
    setupStep2();
    setupStep3();
    setupStep4();
    setupStep5();
});

function goToStep(n) {
    state.step = n;
    document.querySelectorAll('.onboard-step').forEach((el, idx) => {
        el.classList.toggle('active', idx + 1 === n);
    });
    const indicator = document.getElementById('step-indicator');
    const bar = document.getElementById('onboard-progress-bar');
    if (indicator) indicator.textContent = `Step ${n} of ${TOTAL_STEPS}`;
    if (bar) bar.style.width = Math.round((n / TOTAL_STEPS) * 100) + '%';
}

// ============================================================
// STEP 1: Risk Level
// ============================================================
function setupStep1() {
    document.querySelectorAll('.risk-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.risk-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.riskLevel = card.dataset.risk;
        });
    });
    document.getElementById('step1-next')?.addEventListener('click', () => goToStep(2));
}

// ============================================================
// STEP 2: Wallet
// ============================================================
function setupStep2() {
    document.getElementById('phantom-connect-btn')?.addEventListener('click', async () => {
        if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                state.walletAddress = resp.publicKey.toString();
                showWalletConnected(state.walletAddress);
            } catch (_) {
                showFormMsg('Wallet connection rejected.');
            }
        } else {
            window.open('https://phantom.app/', '_blank');
        }
    });

    document.getElementById('solflare-connect-btn')?.addEventListener('click', async () => {
        if (typeof window.solflare !== 'undefined' && window.solflare.isSolflare) {
            try {
                await window.solflare.connect();
                state.walletAddress = window.solflare.publicKey.toString();
                showWalletConnected(state.walletAddress);
            } catch (_) {
                showFormMsg('Wallet connection rejected.');
            }
        } else {
            window.open('https://solflare.com/', '_blank');
        }
    });

    document.getElementById('step2-skip')?.addEventListener('click', () => goToStep(3));
    document.getElementById('step2-next')?.addEventListener('click', () => goToStep(3));
}

function showWalletConnected(address) {
    const msg = document.getElementById('wallet-connected-msg');
    const addrEl = document.getElementById('onboard-wallet-addr');
    if (msg) msg.style.display = 'flex';
    if (addrEl) addrEl.textContent = address.slice(0, 6) + '...' + address.slice(-4);
}

// ============================================================
// STEP 3: Buddy
// ============================================================
function setupStep3() {
    document.getElementById('onboard-buddy-invite-btn')?.addEventListener('click', async () => {
        const input = document.getElementById('onboard-buddy-input');
        const buddyId = input?.value?.trim();
        if (!buddyId) return;
        state.buddyId = buddyId;
        const msg = document.getElementById('onboard-buddy-msg');
        if (msg) { msg.textContent = 'Buddy invite queued. Will be sent after setup.'; msg.style.display = 'block'; }
    });

    document.getElementById('step3-skip')?.addEventListener('click', () => goToStep(4));
    document.getElementById('step3-next')?.addEventListener('click', () => goToStep(4));
}

// ============================================================
// STEP 4: Threshold
// ============================================================
function setupStep4() {
    document.querySelectorAll('.threshold-examples .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.threshold-examples .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const input = document.getElementById('onboard-threshold-input');
            if (input) { input.value = chip.dataset.val; state.threshold = parseInt(chip.dataset.val, 10); }
        });
    });

    document.getElementById('onboard-threshold-input')?.addEventListener('input', e => {
        state.threshold = parseInt(e.target.value, 10) || 500;
    });

    document.getElementById('step4-back')?.addEventListener('click', () => goToStep(3));
    document.getElementById('step4-next')?.addEventListener('click', () => goToStep(5));
}

// ============================================================
// STEP 5: ToS + Finish
// ============================================================
function setupStep5() {
    const tosCheckbox = document.getElementById('tos-checkbox');
    const finishBtn = document.getElementById('step5-finish');

    tosCheckbox?.addEventListener('change', e => {
        state.tosAccepted = e.target.checked;
        if (finishBtn) finishBtn.disabled = !state.tosAccepted;
    });

    document.getElementById('step5-back')?.addEventListener('click', () => goToStep(4));

    finishBtn?.addEventListener('click', async () => {
        if (!state.tosAccepted) return;
        finishBtn.disabled = true;
        finishBtn.textContent = 'Saving...';

        try {
            const res = await fetch('/api/user/onboard', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tos_accepted: true,
                    primary_external_address: state.walletAddress || null,
                    risk_level: state.riskLevel,
                    redeem_threshold: state.threshold
                })
            });

            if (!res.ok) {
                const data = await res.json();
                showOnboardError(data.error ?? 'Setup failed. Try again.');
                finishBtn.disabled = false;
                finishBtn.textContent = 'Finish Setup';
                return;
            }

            if (state.buddyId) {
                await fetch('/api/user/buddies', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ buddyId: state.buddyId })
                }).catch(() => {});
            }

            window.location.href = '/dashboard';
        } catch (err) {
            showOnboardError('Network error. Please try again.');
            finishBtn.disabled = false;
            finishBtn.textContent = 'Finish Setup';
        }
    });
}

function showFormMsg(msg) {
    const el = document.getElementById('onboard-buddy-msg');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showOnboardError(msg) {
    const el = document.getElementById('onboard-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}
