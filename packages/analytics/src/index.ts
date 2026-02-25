/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Internal Analytics
 * 
 * Self-hosted analytics with:
 * - Page views and sessions
 * - Click heatmaps
 * - User journeys
 * - Event tracking
 * - Beta feedback collection
 * 
 * Privacy-focused: No third-party data sharing
 */

export interface AnalyticsEvent {
  id: string;
  type: 'pageview' | 'click' | 'scroll' | 'form' | 'error' | 'custom' | 'feedback';
  timestamp: number;
  sessionId: string;
  userId?: string;
  page: string;
  data: Record<string, unknown>;
}

export interface ClickEvent extends AnalyticsEvent {
  type: 'click';
  data: {
    x: number;
    y: number;
    element: string;
    elementId?: string;
    elementClass?: string;
    text?: string;
    viewportWidth: number;
    viewportHeight: number;
  };
}

export interface PageViewEvent extends AnalyticsEvent {
  type: 'pageview';
  data: {
    referrer: string;
    title: string;
    path: string;
    query: string;
    duration?: number;
  };
}

export interface ScrollEvent extends AnalyticsEvent {
  type: 'scroll';
  data: {
    depth: number; // 0-100 percentage
    maxDepth: number;
    direction: 'up' | 'down';
  };
}

export interface FeedbackEvent extends AnalyticsEvent {
  type: 'feedback';
  data: {
    rating?: number; // 1-5
    category: 'bug' | 'feature' | 'usability' | 'general';
    message: string;
    screenshot?: string; // base64
    userAgent: string;
    context?: Record<string, unknown>;
  };
}

export interface Session {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  pageViews: number;
  events: number;
  pages: string[];
  userAgent: string;
  screenSize: { width: number; height: number };
  referrer: string;
  isBeta: boolean;
}

export interface HeatmapData {
  page: string;
  clicks: Array<{
    x: number;
    y: number;
    count: number;
    element?: string;
  }>;
  scrollDepth: {
    '25': number;
    '50': number;
    '75': number;
    '100': number;
  };
  totalViews: number;
  avgDuration: number;
}

export interface AnalyticsConfig {
  endpoint: string;
  siteId: string;
  enableHeatmaps: boolean;
  enableScrollTracking: boolean;
  enableFeedbackWidget: boolean;
  sampleRate: number; // 0-1, percentage of sessions to track
  excludePaths: string[];
  sessionTimeout: number; // ms
}

// In-memory storage for server-side analytics
const sessions = new Map<string, Session>();
const events: AnalyticsEvent[] = [];
const heatmaps = new Map<string, HeatmapData>();

/**
 * Analytics Server
 * Handles incoming analytics events and aggregates data
 */
export class AnalyticsServer {
  private config: AnalyticsConfig;
  private maxEvents = 100000; // Max events to keep in memory
  private _flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      endpoint: config.endpoint || '/api/analytics',
      siteId: config.siteId || 'tiltcheck',
      enableHeatmaps: config.enableHeatmaps ?? true,
      enableScrollTracking: config.enableScrollTracking ?? true,
      enableFeedbackWidget: config.enableFeedbackWidget ?? true,
      sampleRate: config.sampleRate ?? 1.0,
      excludePaths: config.excludePaths || ['/api/', '/health'],
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes
    };
  }

  /**
   * Record an analytics event
   */
  recordEvent(event: AnalyticsEvent): void {
    // Check sample rate
    if (Math.random() > this.config.sampleRate) return;

    // Check excluded paths
    if (this.config.excludePaths.some(path => event.page.startsWith(path))) return;

    events.push(event);

    // Update session
    this.updateSession(event);

    // Update heatmap data for click events
    if (event.type === 'click' && this.config.enableHeatmaps) {
      this.updateHeatmap(event as ClickEvent);
    }

    // Trim events if necessary
    if (events.length > this.maxEvents) {
      events.splice(0, events.length - this.maxEvents);
    }
  }

  /**
   * Update or create session
   */
  private updateSession(event: AnalyticsEvent): void {
    let session = sessions.get(event.sessionId);

    if (!session) {
      session = {
        id: event.sessionId,
        userId: event.userId,
        startTime: event.timestamp,
        pageViews: 0,
        events: 0,
        pages: [],
        userAgent: '',
        screenSize: { width: 0, height: 0 },
        referrer: '',
        isBeta: false,
      };
      sessions.set(event.sessionId, session);
    }

    session.events++;
    session.endTime = event.timestamp;

    if (event.type === 'pageview') {
      session.pageViews++;
      const pvData = (event as PageViewEvent).data;
      if (!session.pages.includes(pvData.path)) {
        session.pages.push(pvData.path);
      }
      if (!session.referrer) {
        session.referrer = pvData.referrer;
      }
    }
  }

  /**
   * Update heatmap data
   */
  private updateHeatmap(event: ClickEvent): void {
    const page = event.page;
    let heatmap = heatmaps.get(page);

    if (!heatmap) {
      heatmap = {
        page,
        clicks: [],
        scrollDepth: { '25': 0, '50': 0, '75': 0, '100': 0 },
        totalViews: 0,
        avgDuration: 0,
      };
      heatmaps.set(page, heatmap);
    }

    // Normalize click position to percentage
    const normalizedX = Math.round((event.data.x / event.data.viewportWidth) * 100);
    const normalizedY = Math.round((event.data.y / event.data.viewportHeight) * 100);

    // Find existing click cluster or create new one
    const existingClick = heatmap.clicks.find(c => 
      Math.abs(c.x - normalizedX) < 2 && Math.abs(c.y - normalizedY) < 2
    );

    if (existingClick) {
      existingClick.count++;
    } else {
      heatmap.clicks.push({
        x: normalizedX,
        y: normalizedY,
        count: 1,
        element: event.data.element,
      });
    }
  }

  /**
   * Get heatmap data for a page
   */
  getHeatmap(page: string): HeatmapData | undefined {
    return heatmaps.get(page);
  }

  /**
   * Get all heatmaps
   */
  getAllHeatmaps(): HeatmapData[] {
    return Array.from(heatmaps.values());
  }

  /**
   * Get session data
   */
  getSession(sessionId: string): Session | undefined {
    return sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    const now = Date.now();
    return Array.from(sessions.values()).filter(
      s => !s.endTime || (now - s.endTime) < this.config.sessionTimeout
    );
  }

  /**
   * Get analytics summary
   */
  getSummary(timeRange: { start: number; end: number } = { 
    start: Date.now() - 24 * 60 * 60 * 1000, 
    end: Date.now() 
  }): {
    totalPageViews: number;
    uniqueSessions: number;
    uniqueUsers: number;
    avgSessionDuration: number;
    topPages: Array<{ page: string; views: number }>;
    topReferrers: Array<{ referrer: string; count: number }>;
    eventsByType: Record<string, number>;
    feedbackCount: number;
    betaUsers: number;
  } {
    const relevantEvents = events.filter(
      e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );

    const pageViews = relevantEvents.filter(e => e.type === 'pageview');
    const sessionIds = new Set(relevantEvents.map(e => e.sessionId));
    const userIds = new Set(relevantEvents.filter(e => e.userId).map(e => e.userId));

    // Top pages
    const pageCounts: Record<string, number> = {};
    pageViews.forEach(pv => {
      const path = (pv as PageViewEvent).data.path;
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    // Top referrers
    const referrerCounts: Record<string, number> = {};
    pageViews.forEach(pv => {
      const ref = (pv as PageViewEvent).data.referrer;
      if (ref && ref !== '') {
        referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
      }
    });
    const topReferrers = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }));

    // Events by type
    const eventsByType: Record<string, number> = {};
    relevantEvents.forEach(e => {
      eventsByType[e.type] = (eventsByType[e.type] || 0) + 1;
    });

    // Calculate average session duration
    const sessionsInRange = Array.from(sessions.values()).filter(
      s => s.startTime >= timeRange.start && s.startTime <= timeRange.end
    );
    const totalDuration = sessionsInRange.reduce((sum, s) => {
      return sum + ((s.endTime || Date.now()) - s.startTime);
    }, 0);
    const avgSessionDuration = sessionsInRange.length > 0 
      ? totalDuration / sessionsInRange.length 
      : 0;

    return {
      totalPageViews: pageViews.length,
      uniqueSessions: sessionIds.size,
      uniqueUsers: userIds.size,
      avgSessionDuration: Math.round(avgSessionDuration / 1000), // in seconds
      topPages,
      topReferrers,
      eventsByType,
      feedbackCount: relevantEvents.filter(e => e.type === 'feedback').length,
      betaUsers: sessionsInRange.filter(s => s.isBeta).length,
    };
  }

  /**
   * Get feedback entries
   */
  getFeedback(limit = 50): FeedbackEvent[] {
    return events
      .filter(e => e.type === 'feedback')
      .slice(-limit) as FeedbackEvent[];
  }

  /**
   * Export data for backup
   */
  exportData(): {
    sessions: Session[];
    events: AnalyticsEvent[];
    heatmaps: HeatmapData[];
  } {
    return {
      sessions: Array.from(sessions.values()),
      events: events.slice(-10000), // Last 10k events
      heatmaps: Array.from(heatmaps.values()),
    };
  }

  /**
   * Clear old data
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;

    // Remove old events
    const oldLength = events.length;
    events.splice(0, events.findIndex(e => e.timestamp >= cutoff));
    console.log(`[Analytics] Cleaned up ${oldLength - events.length} old events`);

    // Remove old sessions
    for (const [id, session] of sessions) {
      if ((session.endTime || session.startTime) < cutoff) {
        sessions.delete(id);
      }
    }
  }
}

// Export singleton instance
export const analyticsServer = new AnalyticsServer();

export default analyticsServer;
