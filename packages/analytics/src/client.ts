/**
 * TiltCheck Analytics Client
 * 
 * Lightweight client-side analytics tracker
 * Includes heatmap tracking, scroll depth, and feedback widget
 */

export interface TrackerConfig {
  endpoint: string;
  siteId: string;
  enableHeatmaps: boolean;
  enableScrollTracking: boolean;
  enableFeedbackWidget: boolean;
  debug: boolean;
}

const DEFAULT_CONFIG: TrackerConfig = {
  endpoint: '/api/analytics',
  siteId: 'tiltcheck',
  enableHeatmaps: true,
  enableScrollTracking: true,
  enableFeedbackWidget: true,
  debug: false,
};

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  // Use crypto.getRandomValues for secure random string
  const array = new Uint8Array(12);
  window.crypto.getRandomValues(array);
  // Convert to hex string
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return `sess_${Date.now()}_${hex}`;
}

/**
 * Get or create session ID from storage
 */
function getSessionId(): string {
  const stored = sessionStorage.getItem('tiltcheck_session_id');
  if (stored) return stored;
  
  const newId = generateSessionId();
  sessionStorage.setItem('tiltcheck_session_id', newId);
  return newId;
}

/**
 * Get user ID if available
 */
function getUserId(): string | undefined {
  return localStorage.getItem('tiltcheck_user_id') || undefined;
}

/**
 * Analytics Tracker Class
 */
export class AnalyticsTracker {
  private config: TrackerConfig;
  private sessionId: string;
  private userId?: string;
  private eventQueue: any[] = [];
  private flushTimeout: number | null = null;
  private maxScrollDepth = 0;
  private pageStartTime = Date.now();

  constructor(config: Partial<TrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = getSessionId();
    this.userId = getUserId();
    
    this.init();
  }

  private init(): void {
    // Track initial page view
    this.trackPageView();

    // Set up event listeners
    if (this.config.enableHeatmaps) {
      this.setupClickTracking();
    }

    if (this.config.enableScrollTracking) {
      this.setupScrollTracking();
    }

    if (this.config.enableFeedbackWidget) {
      this.injectFeedbackWidget();
    }

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('pageview', {
        duration: Date.now() - this.pageStartTime,
        maxScrollDepth: this.maxScrollDepth,
      });
      this.flush(true);
    });

    // Handle SPA navigation
    window.addEventListener('popstate', () => {
      this.trackPageView();
    });

    // Flush events periodically
    setInterval(() => this.flush(), 10000);

    if (this.config.debug) {
      console.log('[TiltCheck Analytics] Initialized', this.config);
    }
  }

  /**
   * Track a page view
   */
  trackPageView(): void {
    this.pageStartTime = Date.now();
    this.maxScrollDepth = 0;

    this.trackEvent('pageview', {
      referrer: document.referrer,
      title: document.title,
      path: window.location.pathname,
      query: window.location.search,
    });
  }

  /**
   * Track a custom event
   */
  trackEvent(type: string, data: Record<string, unknown> = {}): void {
    // Generate secure random event ID using crypto API
    const array = new Uint8Array(6);
    window.crypto.getRandomValues(array);
    const randomHex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const event = {
      id: `evt_${Date.now()}_${randomHex}`,
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      page: window.location.pathname,
      data,
    };

    this.eventQueue.push(event);

    if (this.config.debug) {
      console.log('[TiltCheck Analytics] Event:', event);
    }

    // Auto-flush if queue is large
    if (this.eventQueue.length >= 10) {
      this.flush();
    }
  }

  /**
   * Set up click tracking for heatmaps
   */
  private setupClickTracking(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      this.trackEvent('click', {
        x: e.clientX,
        y: e.clientY,
        element: target.tagName.toLowerCase(),
        elementId: target.id || undefined,
        elementClass: target.className || undefined,
        text: target.textContent?.substring(0, 50) || undefined,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    });
  }

  /**
   * Set up scroll depth tracking
   */
  private setupScrollTracking(): void {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const depth = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

          if (depth > this.maxScrollDepth) {
            const oldDepth = this.maxScrollDepth;
            this.maxScrollDepth = depth;

            // Track milestone depths
            if (this.crossedMilestone(oldDepth, depth, 25) ||
                this.crossedMilestone(oldDepth, depth, 50) ||
                this.crossedMilestone(oldDepth, depth, 75) ||
                this.crossedMilestone(oldDepth, depth, 100)) {
              this.trackEvent('scroll', {
                depth,
                maxDepth: this.maxScrollDepth,
                direction: 'down',
              });
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    });
  }

  private crossedMilestone(oldDepth: number, newDepth: number, milestone: number): boolean {
    return oldDepth < milestone && newDepth >= milestone;
  }

  /**
   * Inject feedback widget
   */
  private injectFeedbackWidget(): void {
    const widget = document.createElement('div');
    widget.id = 'tiltcheck-feedback-widget';
    widget.innerHTML = `
      <style>
        #tiltcheck-feedback-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #tiltcheck-feedback-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transition: all 0.2s;
        }
        #tiltcheck-feedback-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
        }
        #tiltcheck-feedback-form {
          display: none;
          position: absolute;
          bottom: 60px;
          right: 0;
          width: 320px;
          background: #1a1a2e;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        #tiltcheck-feedback-form.open {
          display: block;
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #tiltcheck-feedback-form h4 {
          margin: 0 0 15px 0;
          color: white;
          font-size: 16px;
        }
        #tiltcheck-feedback-form select,
        #tiltcheck-feedback-form textarea {
          width: 100%;
          padding: 10px;
          margin-bottom: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: white;
          font-size: 14px;
          resize: vertical;
        }
        #tiltcheck-feedback-form textarea {
          min-height: 80px;
        }
        .feedback-rating {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .feedback-rating button {
          width: 40px;
          height: 40px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.15s;
        }
        .feedback-rating button:hover,
        .feedback-rating button.selected {
          background: #6366f1;
          border-color: #6366f1;
        }
        #tiltcheck-feedback-form .submit-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        #tiltcheck-feedback-form .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .feedback-success {
          text-align: center;
          color: #10b981;
          padding: 20px;
        }
      </style>
      <button id="tiltcheck-feedback-btn">💬 Beta Feedback</button>
      <div id="tiltcheck-feedback-form">
        <h4>Share Your Feedback</h4>
        <div class="feedback-rating" id="rating-btns">
          <button data-rating="1">😢</button>
          <button data-rating="2">😕</button>
          <button data-rating="3">😐</button>
          <button data-rating="4">🙂</button>
          <button data-rating="5">😍</button>
        </div>
        <select id="feedback-category">
          <option value="general">General Feedback</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="usability">Usability Issue</option>
        </select>
        <textarea id="feedback-message" placeholder="Tell us what you think..."></textarea>
        <button class="submit-btn" id="submit-feedback">Submit Feedback</button>
      </div>
    `;

    document.body.appendChild(widget);

    // Toggle form
    const btn = document.getElementById('tiltcheck-feedback-btn');
    const form = document.getElementById('tiltcheck-feedback-form');
    let selectedRating = 0;

    btn?.addEventListener('click', () => {
      form?.classList.toggle('open');
    });

    // Rating selection
    const ratingBtns = document.querySelectorAll('#rating-btns button');
    ratingBtns.forEach(ratingBtn => {
      ratingBtn.addEventListener('click', () => {
        ratingBtns.forEach(b => b.classList.remove('selected'));
        ratingBtn.classList.add('selected');
        selectedRating = parseInt(ratingBtn.getAttribute('data-rating') || '0');
      });
    });

    // Submit feedback
    document.getElementById('submit-feedback')?.addEventListener('click', () => {
      const category = (document.getElementById('feedback-category') as HTMLSelectElement).value;
      const message = (document.getElementById('feedback-message') as HTMLTextAreaElement).value;

      if (!message.trim()) {
        alert('Please enter your feedback');
        return;
      }

      this.submitFeedback({
        rating: selectedRating || undefined,
        category: category as 'bug' | 'feature' | 'usability' | 'general',
        message,
      });

      // Show success
      if (form) {
        form.innerHTML = '<div class="feedback-success">✅ Thanks for your feedback!</div>';
        setTimeout(() => {
          form.classList.remove('open');
          // Reset form (would need to recreate it)
        }, 2000);
      }
    });
  }

  /**
   * Submit feedback
   */
  submitFeedback(feedback: {
    rating?: number;
    category: 'bug' | 'feature' | 'usability' | 'general';
    message: string;
    screenshot?: string;
  }): void {
    this.trackEvent('feedback', {
      ...feedback,
      userAgent: navigator.userAgent,
      context: {
        page: window.location.href,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      },
    });

    this.flush(true);
  }

  /**
   * Identify user (for beta users)
   */
  identify(userId: string, traits: Record<string, unknown> = {}): void {
    this.userId = userId;
    localStorage.setItem('tiltcheck_user_id', userId);
    
    this.trackEvent('identify', {
      userId,
      traits,
      isBeta: true,
    });
  }

  /**
   * Flush event queue to server
   */
  async flush(sync = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (sync && navigator.sendBeacon) {
        navigator.sendBeacon(
          this.config.endpoint,
          JSON.stringify({ events: eventsToSend, siteId: this.config.siteId })
        );
      } else {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: eventsToSend, siteId: this.config.siteId }),
          keepalive: sync,
        });
      }

      if (this.config.debug) {
        console.log(`[TiltCheck Analytics] Flushed ${eventsToSend.length} events`);
      }
    } catch (error) {
      // Put events back in queue on failure
      this.eventQueue.unshift(...eventsToSend);
      if (this.config.debug) {
        console.error('[TiltCheck Analytics] Flush failed:', error);
      }
    }
  }
}

// Auto-initialize if in browser
let tracker: AnalyticsTracker | null = null;

export function initAnalytics(config?: Partial<TrackerConfig>): AnalyticsTracker {
  if (!tracker) {
    tracker = new AnalyticsTracker(config);
  }
  return tracker;
}

export function getTracker(): AnalyticsTracker | null {
  return tracker;
}

// Export for direct use
export default AnalyticsTracker;
