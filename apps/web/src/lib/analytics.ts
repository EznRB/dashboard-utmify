import { reportMessage } from './sentry';

// Analytics configuration
const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics';
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID;

// Event types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: number;
}

export interface UserProperties {
  userId: string;
  email?: string;
  plan?: string;
  signupDate?: string;
  lastActive?: string;
  [key: string]: any;
}

// Analytics class
class Analytics {
  private isInitialized = false;
  private userId: string | null = null;
  private userProperties: UserProperties | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private async init() {
    try {
      // Initialize Google Analytics
      if (GA_MEASUREMENT_ID) {
        await this.initGoogleAnalytics();
      }

      // Initialize Mixpanel
      if (MIXPANEL_TOKEN) {
        await this.initMixpanel();
      }

      // Initialize Hotjar
      if (HOTJAR_ID) {
        await this.initHotjar();
      }

      // Set up online/offline detection
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushEventQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      this.isInitialized = true;
      this.flushEventQueue();
    } catch (error) {
      console.error('Analytics initialization failed:', error);
      reportMessage('Analytics initialization failed', 'error');
    }
  }

  private async initGoogleAnalytics() {
    // Load Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }

  private async initMixpanel() {
    // Load Mixpanel
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
    document.head.appendChild(script);

    script.onload = () => {
      if (window.mixpanel) {
        window.mixpanel.init(MIXPANEL_TOKEN!, {
          debug: process.env.NODE_ENV === 'development',
          track_pageview: true,
          persistence: 'localStorage',
        });
      }
    };
  }

  private async initHotjar() {
    // Load Hotjar
    const script = document.createElement('script');
    script.innerHTML = `
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${HOTJAR_ID},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    `;
    document.head.appendChild(script);
  }

  // Set user identity
  identify(userId: string, properties?: UserProperties) {
    this.userId = userId;
    this.userProperties = { userId, ...properties };

    // Google Analytics
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID!, {
        user_id: userId,
        custom_map: properties,
      });
    }

    // Mixpanel
    if (window.mixpanel) {
      window.mixpanel.identify(userId);
      if (properties) {
        window.mixpanel.people.set(properties);
      }
    }

    // Hotjar
    if (window.hj) {
      window.hj('identify', userId, properties);
    }
  }

  // Track events
  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      },
      userId: this.userId || undefined,
      timestamp: Date.now(),
    };

    if (!this.isInitialized || !this.isOnline) {
      this.eventQueue.push(event);
      return;
    }

    this.sendEvent(event);
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      // Google Analytics
      if (window.gtag) {
        window.gtag('event', event.name, {
          event_category: event.properties?.category || 'engagement',
          event_label: event.properties?.label,
          value: event.properties?.value,
          user_id: this.userId,
          ...event.properties,
        });
      }

      // Mixpanel
      if (window.mixpanel) {
        window.mixpanel.track(event.name, event.properties);
      }

      // Custom analytics endpoint
      await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
      // Re-queue the event for retry
      this.eventQueue.push(event);
    }
  }

  private async flushEventQueue() {
    if (!this.isInitialized || !this.isOnline || this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      await this.sendEvent(event);
    }
  }

  // Page view tracking
  pageView(path?: string) {
    const page = path || window.location.pathname;
    
    this.track('page_view', {
      page,
      title: document.title,
    });
  }

  // UTM tracking specific events
  trackUTMCreated(utmData: Record<string, any>) {
    this.track('utm_created', {
      category: 'utm_management',
      utm_source: utmData.source,
      utm_medium: utmData.medium,
      utm_campaign: utmData.campaign,
      utm_term: utmData.term,
      utm_content: utmData.content,
    });
  }

  trackUTMClicked(utmData: Record<string, any>) {
    this.track('utm_clicked', {
      category: 'utm_engagement',
      utm_id: utmData.id,
      utm_source: utmData.source,
      utm_medium: utmData.medium,
      utm_campaign: utmData.campaign,
    });
  }

  trackIntegrationConnected(integration: string) {
    this.track('integration_connected', {
      category: 'integrations',
      integration_name: integration,
    });
  }

  trackCampaignCreated(campaignData: Record<string, any>) {
    this.track('campaign_created', {
      category: 'campaign_management',
      campaign_type: campaignData.type,
      platform: campaignData.platform,
    });
  }

  trackSubscriptionChanged(plan: string, action: 'upgrade' | 'downgrade' | 'cancel') {
    this.track('subscription_changed', {
      category: 'subscription',
      plan,
      action,
    });
  }

  // Error tracking
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error_occurred', {
      category: 'errors',
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, unit: string = 'ms') {
    this.track('performance_metric', {
      category: 'performance',
      metric_name: metric,
      metric_value: value,
      metric_unit: unit,
    });
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, action: string, properties?: Record<string, any>) {
    this.track('feature_used', {
      category: 'feature_usage',
      feature_name: feature,
      action,
      ...properties,
    });
  }
}

// Create singleton instance
const analytics = new Analytics();

export default analytics;

// Convenience functions
export const identify = (userId: string, properties?: UserProperties) => {
  analytics.identify(userId, properties);
};

export const track = (eventName: string, properties?: Record<string, any>) => {
  analytics.track(eventName, properties);
};

export const pageView = (path?: string) => {
  analytics.pageView(path);
};

// Declare global types
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    mixpanel: any;
    hj: (...args: any[]) => void;
  }
}