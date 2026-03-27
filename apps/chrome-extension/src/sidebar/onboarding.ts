/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SidebarUI } from './types.js';

interface OnboardingStep {
  targetId: string;
  title: string;
  body: string;
  onBefore?: () => void;
}

export class OnboardingManager {
  private ui: SidebarUI;
  private currentStep = 0;
  private steps: OnboardingStep[] = [
    {
      targetId: 'site-mapper-btn',
      title: 'SITE AUDIT SETUP',
      body: 'Configure the tool on any house entry point to monitor for potential manipulation signals.'
    },
    {
      targetId: 'fairness-verifier-btn',
      title: 'VERIFICATION ENGINE',
      body: 'Verify real-time spin data against official RTPs. Log any discrepancies immediately.'
    },
    {
      targetId: 'vault-btn',
      title: 'PROFIT LOCKER',
      body: 'Force-lock the bag before paper hands take over. Stop the 3 AM recovery-farming before it starts.'
    },
    {
      targetId: 'buddy-mirror-btn',
      title: 'SQUAD MIRROR',
      body: 'Connect a trusted peer to monitor your floor and help prevent impulsive entries.'
    }
  ];

  constructor(ui: SidebarUI) {
    this.ui = ui;
  }

  public async startIntro(): Promise<void> {
    const hasCompleted = await this.checkOnboardingStatus();
    if (hasCompleted) return;

    this.currentStep = 0;
    this.showStep();
  }

  private async checkOnboardingStatus(): Promise<boolean> {
    const prefs = await this.ui.getStorage(['onboardingCompleted']);
    return !!prefs.onboardingCompleted;
  }

  public showStep(): void {
    const step = this.steps[this.currentStep];
    if (!step) {
      this.finish();
      return;
    }

    const target = document.getElementById(step.targetId);
    if (!target) {
      this.next();
      return;
    }

    // Highlight target and show overlay
    this.renderOverlay(step, target);
  }

  private renderOverlay(step: OnboardingStep, target: HTMLElement): void {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    overlay.classList.add('active');
    
    const rect = target.getBoundingClientRect();
    const tooltip = overlay.querySelector('.onboarding-tooltip') as HTMLElement;
    if (tooltip) {
      tooltip.style.top = `${rect.bottom + 10}px`;
      tooltip.style.left = `${Math.max(10, rect.left - 50)}px`;
      
      const title = tooltip.querySelector('.tooltip-title');
      const body = tooltip.querySelector('.tooltip-body');
      const progress = tooltip.querySelector('.tooltip-progress');
      
      if (title) title.textContent = step.title;
      if (body) body.textContent = step.body;
      if (progress) progress.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
    }

    // Add spotlight effect
    overlay.style.setProperty('--spot-x', `${rect.left + rect.width / 2}px`);
    overlay.style.setProperty('--spot-y', `${rect.top + rect.height / 2}px`);
    overlay.style.setProperty('--spot-r', `${Math.max(rect.width, rect.height) / 1.5 + 5}px`);
  }

  public next(): void {
    this.currentStep++;
    this.showStep();
  }

  public prev(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep();
    }
  }

  public async finish(): Promise<void> {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.remove('active');
    
    await this.ui.setStorage({ onboardingCompleted: true });
    this.ui.addFeedMessage('Tutorial completed! You are now a <strong>Reality Check Pro</strong>.');
  }
}
