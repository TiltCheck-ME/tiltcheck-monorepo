/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Sidebar Navigation
 * Unified navigation system for all pages
 * Single hamburger menu on desktop and mobile
 */

class SidebarNavigation {
  constructor() {
    this.isOpen = false;
    this.hamburger = null;
    this.sidebar = null;
    this.overlay = null;
    this.init();
  }

  init() {
    this.createNavigation();
    this.setupEventListeners();
    this.markCurrentPage();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  createNavigation() {
    // Create hamburger button
    this.hamburger = document.createElement('button');
    this.hamburger.className = 'sidebar-hamburger';
    this.hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    this.hamburger.setAttribute('aria-expanded', 'false');
    this.hamburger.innerHTML = `
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    `;

    // Create sidebar
    this.sidebar = document.createElement('nav');
    this.sidebar.className = 'sidebar-nav';
    this.sidebar.setAttribute('aria-label', 'Main navigation');
    this.sidebar.innerHTML = `
      <div class="sidebar-header">
        <a href="/" class="sidebar-logo">
          <svg viewBox="0 0 200 200" width="32" height="32" aria-hidden="true">
            <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="4"/>
            <path d="M140 60 A60 60 0 1 1 140 140" fill="none" stroke="#00d4aa" stroke-width="16" stroke-linecap="round"/>
            <circle cx="140" cy="100" r="10" fill="#00a8ff"/>
          </svg>
          <span>TiltCheck</span>
        </a>
        <button class="sidebar-close" aria-label="Close navigation">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="sidebar-content">
        <div class="nav-section">
          <h3>Platform</h3>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/#tools">Tools</a></li>
            <li><a href="/control-room.html">Dashboard</a></li>
            <li><a href="/about.html">About</a></li>
          </ul>
        </div>

        <div class="nav-section">
          <h3>Features</h3>
          <ul>
            <li><a href="/casinos.html">Casino Trust</a></li>
            <li><a href="/degen-trust.html">Degen Trust</a></li>
            <li><a href="/extension.html">TiltGuard Extension</a></li>
            <li><a href="/tools/tiltcheck-core.html">TiltCheck Core</a></li>
            <li><a href="/tools/qualifyfirst.html">QualifyFirst</a></li>
            <li><a href="/tools/suslink.html">SusLink</a></li>
            <li><a href="/tools/daad.html">DA&D</a></li>
            <li><a href="/tools/triviadrops.html">TriviaDrops</a></li>
          </ul>
        </div>

        <div class="nav-section">
          <h3>Community</h3>
          <ul>
            <li><a href="https://discord.gg/s6NNfPHxMS" target="_blank" rel="noopener">Discord</a></li>
            <li><a href="https://github.com/jmenichole/tiltcheck-monorepo" target="_blank" rel="noopener">GitHub</a></li>
            <li><a href="https://x.com/Tilt_check" target="_blank" rel="noopener">X (Twitter)</a></li>
            <li><a href="/newsletter.html">Newsletter</a></li>
          </ul>
        </div>

        <div class="nav-section">
          <h3>Resources</h3>
          <ul>
            <li><a href="/help.html">Help & Support</a></li>
            <li><a href="/press-kit.html">Press Kit</a></li>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/site-map.html">Site Map</a></li>
            <li><a href="/faq.html">FAQ</a></li>
          </ul>
        </div>

        <div class="nav-section">
          <h3>Legal</h3>
          <ul>
            <li><a href="/privacy.html">Privacy Policy</a></li>
            <li><a href="/terms.html">Terms of Service</a></li>
            <li><a href="/legal-compliance.html">Legal & Compliance</a></li>
          </ul>
        </div>
      </div>

      <div class="sidebar-footer">
        <a href="/dashboard" class="btn-nav-primary">Dashboard</a>
        <a href="https://discord.gg/s6NNfPHxMS" class="btn-nav-secondary" target="_blank" rel="noopener">Join Discord</a>
      </div>
    `;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'sidebar-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    // Add to page
    document.body.appendChild(this.hamburger);
    document.body.appendChild(this.sidebar);
    document.body.appendChild(this.overlay);
  }

  setupEventListeners() {
    // Hamburger button
    this.hamburger.addEventListener('click', () => this.toggleSidebar());

    // Close button in sidebar
    const closeBtn = this.sidebar.querySelector('.sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSidebar());
    }

    // Overlay click
    this.overlay.addEventListener('click', () => this.closeSidebar());

    // Navigation links
    const links = this.sidebar.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        // Don't close if it's an external link
        if (!link.hasAttribute('target')) {
          this.closeSidebar();
        }
      });
    });

    // Keyboard escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeSidebar();
      }
    });
  }

  toggleSidebar() {
    if (this.isOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  openSidebar() {
    this.isOpen = true;
    this.hamburger.setAttribute('aria-expanded', 'true');
    this.sidebar.classList.add('open');
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  closeSidebar() {
    this.isOpen = false;
    this.hamburger.setAttribute('aria-expanded', 'false');
    this.sidebar.classList.remove('open');
    this.overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  markCurrentPage() {
    const currentPath = window.location.pathname;
    const links = this.sidebar.querySelectorAll('a');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (href === '/' && currentPath === '/index.html')) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('active');
      }
    });
  }

  handleResize() {
    // Close sidebar on larger screens to prevent visual issues
    if (window.innerWidth > 768 && this.isOpen) {
      this.closeSidebar();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SidebarNavigation();
  });
} else {
  new SidebarNavigation();
}
