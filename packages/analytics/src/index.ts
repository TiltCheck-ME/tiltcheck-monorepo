/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/analytics
 * Lightweight analytics wrapper for event tracking and user identification.
 */

export interface AnalyticsProvider {
  track(event: string, properties?: Record<string, any>): void;
  identify(userId: string, traits?: Record<string, any>): void;
}

export class AnalyticsManager {
  private providers: AnalyticsProvider[] = [];
  private userId?: string;

  /**
   * Add an analytics provider (e.g., Mixpanel, PostHog, or internal)
   */
  addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);

    // If we already have a user identified, identify them with the new provider
    if (this.userId) {
      provider.identify(this.userId);
    }
  }

  /**
   * Track a custom event across all providers
   */
  trackEvent(name: string, properties: Record<string, any> = {}): void {
    const timestamp = Date.now();
    const payload = {
      ...properties,
      _timestamp: timestamp,
      _userId: this.userId,
    };

    console.log(`[Analytics] Tracking event: ${name}`, payload);

    for (const provider of this.providers) {
      try {
        provider.track(name, payload);
      } catch (error) {
        console.error(`[Analytics] Provider failed to track event ${name}:`, error);
      }
    }
  }

  /**
   * Identify a user across all providers
   */
  identifyUser(userId: string, traits: Record<string, any> = {}): void {
    this.userId = userId;
    console.log(`[Analytics] Identifying user: ${userId}`, traits);

    for (const provider of this.providers) {
      try {
        provider.identify(userId, traits);
      } catch (error) {
        console.error(`[Analytics] Provider failed to identify user ${userId}:`, error);
      }
    }
  }

  /**
   * Clear current user identification
   */
  reset(): void {
    this.userId = undefined;
  }
}

// Export singleton instance
export const analytics = new AnalyticsManager();

export default analytics;
