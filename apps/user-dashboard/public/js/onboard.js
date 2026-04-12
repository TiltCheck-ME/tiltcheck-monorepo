// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

'use strict';

const state = {
    step: 1,
    riskLevel: 'degen',
    discordUsername: '',
    discordId: '',
    walletAddress: null,
    buddyId: null,
    threshold: 500,
    tosAccepted: false,
    voiceInterventionEnabled: true,
    notifications: {
        tips: true,
        trivia: true,
        promos: false
    },
    trustEngineOptIn: {
        message_contents: false,
        financial_data: false,
        session_telemetry: false,
        notify_nft_identity_ready: false
    }
};

const TOTAL_STEPS = 3;

window.addEventListener('DOMContentLoaded', () => {
    initialize().catch(() => {
        window.location.href = '/auth/discord?redirect=' + encodeURIComponent('/onboarding');
    });
});

async function initialize() {
    await Promise.all([loadCurrentUser(), loadExistingOnboarding()]);
    setupStep1();
    setupStep2();
    setupStep3();
    renderState();
}

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
// STEP 1: Legal + account
// ============================================================
function setupStep1() {
    const tosCheckbox = document.getElementById('tos-checkbox');
    const nextBtn = document.getElementById('step1-next');

    tosCheckbox?.addEventListener('change', e => {
        state.tosAccepted = e.target.checked;
        if (nextBtn) nextBtn.disabled = !state.tosAccepted;
    });

    document.getElementById('step1-next')?.addEventListener('click', () => {
        if (!state.tosAccepted) return;
        goToStep(2);
    });
}

// ============================================================
// STEP 2: Settings
// ============================================================
function setupStep2() {
    document.querySelectorAll('.risk-card').forEach(card => {
        card.addEventListener('click', () => {
            state.riskLevel = card.dataset.risk;
            renderRiskCards();
        });
    });

    document.querySelectorAll('[data-voice]').forEach(button => {
        button.addEventListener('click', () => {
            state.voiceInterventionEnabled = button.dataset.voice === 'on';
            renderVoiceChips();
        });
    });

    document.querySelectorAll('.threshold-examples .chip').forEach(chip => {
        if (!chip.dataset.val) return;
        chip.addEventListener('click', () => {
            const numericValue = parseInt(chip.dataset.val, 10);
            state.threshold = Number.isFinite(numericValue) ? numericValue : 500;
            renderThreshold();
        });
    });

    document.getElementById('onboard-threshold-input')?.addEventListener('input', e => {
        state.threshold = parseInt(e.target.value, 10) || 500;
        renderThreshold();
    });

    document.getElementById('notify-tips')?.addEventListener('change', e => {
        state.notifications.tips = e.target.checked;
    });
    document.getElementById('notify-trivia')?.addEventListener('change', e => {
        state.notifications.trivia = e.target.checked;
    });
    document.getElementById('notify-promos')?.addEventListener('change', e => {
        state.notifications.promos = e.target.checked;
    });

    document.getElementById('step2-back')?.addEventListener('click', () => goToStep(1));
    document.getElementById('step2-next')?.addEventListener('click', () => goToStep(3));
}

// ============================================================
// STEP 3: Optional integrations + finish
// ============================================================
function setupStep3() {
    const finishBtn = document.getElementById('step5-finish');
    const trustOptIns = [
        ['share-message-contents', 'message_contents'],
        ['share-financial-data', 'financial_data'],
        ['share-session-telemetry', 'session_telemetry'],
        ['notify-nft-identity-ready', 'notify_nft_identity_ready']
    ];

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

    document.getElementById('onboard-buddy-invite-btn')?.addEventListener('click', async () => {
        const input = document.getElementById('onboard-buddy-input');
        const buddyId = input?.value?.trim();
        if (!buddyId) return;
        state.buddyId = buddyId;
        showFormMsg('Buddy invite queued. Will be sent after setup.');
    });

    trustOptIns.forEach(([id, key]) => {
        document.getElementById(id)?.addEventListener('change', e => {
            state.trustEngineOptIn[key] = e.target.checked;
        });
    });

    document.getElementById('step3-back')?.addEventListener('click', () => goToStep(2));

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
                    voice_intervention_enabled: state.voiceInterventionEnabled,
                    redeem_threshold: state.threshold,
                    notifications: state.notifications,
                    trust_engine_opt_in: state.trustEngineOptIn
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

function showWalletConnected(address) {
    const msg = document.getElementById('wallet-connected-msg');
    const addrEl = document.getElementById('onboard-wallet-addr');
    if (msg) msg.style.display = 'flex';
    if (addrEl) addrEl.textContent = address.slice(0, 6) + '...' + address.slice(-4);
}

async function loadCurrentUser() {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Not authenticated');
    }

    const user = await response.json();
    state.discordUsername = user.username || user.discordUsername || 'Unknown';
    state.discordId = user.discordId || '';

    const accountLine = document.getElementById('onboard-account-line');
    if (accountLine) {
        accountLine.textContent = state.discordId
            ? `Signed in as ${state.discordUsername} (${state.discordId}).`
            : `Signed in as ${state.discordUsername}.`;
    }
}

async function loadExistingOnboarding() {
    const response = await fetch('/api/user/onboard', { credentials: 'include' });
    if (!response.ok) {
        return;
    }

    const data = await response.json();
    const onboarding = data.onboarding;
    if (!onboarding) {
        return;
    }

    state.riskLevel = onboarding.riskLevel || state.riskLevel;
    state.voiceInterventionEnabled = onboarding.voiceInterventionEnabled !== false;
    state.threshold = onboarding.redeemThreshold || state.threshold;
    state.notifications = {
        tips: onboarding.notifications?.tips !== false,
        trivia: onboarding.notifications?.trivia !== false,
        promos: onboarding.notifications?.promos === true
    };
    state.trustEngineOptIn = {
        ...state.trustEngineOptIn,
        ...onboarding.trustEngineOptIn
    };
}

function renderState() {
    renderRiskCards();
    renderVoiceChips();
    renderThreshold();
    renderNotificationSettings();
    renderConsentSettings();
    const tosCheckbox = document.getElementById('tos-checkbox');
    if (tosCheckbox) tosCheckbox.checked = state.tosAccepted;
    const nextBtn = document.getElementById('step1-next');
    if (nextBtn) nextBtn.disabled = !state.tosAccepted;
}

function renderRiskCards() {
    document.querySelectorAll('.risk-card').forEach(card => {
        card.classList.toggle('active', card.dataset.risk === state.riskLevel);
    });
}

function renderVoiceChips() {
    const voiceOn = document.getElementById('voice-on-chip');
    const voiceOff = document.getElementById('voice-off-chip');
    if (voiceOn) voiceOn.classList.toggle('active', state.voiceInterventionEnabled);
    if (voiceOff) voiceOff.classList.toggle('active', !state.voiceInterventionEnabled);
}

function renderThreshold() {
    const input = document.getElementById('onboard-threshold-input');
    if (input) input.value = String(state.threshold);
    document.querySelectorAll('.threshold-examples .chip').forEach(chip => {
        if (!chip.dataset.val) return;
        chip.classList.toggle('active', parseInt(chip.dataset.val, 10) === state.threshold);
    });
}

function renderNotificationSettings() {
    const notifyTips = document.getElementById('notify-tips');
    const notifyTrivia = document.getElementById('notify-trivia');
    const notifyPromos = document.getElementById('notify-promos');
    if (notifyTips) notifyTips.checked = state.notifications.tips;
    if (notifyTrivia) notifyTrivia.checked = state.notifications.trivia;
    if (notifyPromos) notifyPromos.checked = state.notifications.promos;
}

function renderConsentSettings() {
    Object.entries({
        'share-message-contents': state.trustEngineOptIn.message_contents,
        'share-financial-data': state.trustEngineOptIn.financial_data,
        'share-session-telemetry': state.trustEngineOptIn.session_telemetry,
        'notify-nft-identity-ready': state.trustEngineOptIn.notify_nft_identity_ready
    }).forEach(([id, enabled]) => {
        const input = document.getElementById(id);
        if (input) input.checked = enabled;
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
