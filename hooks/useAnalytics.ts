import { useCallback } from 'react';

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

export function useAnalytics() {
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
      });
    }
  }, []);

  const trackPageView = useCallback((pagePath: string, pageTitle?: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: pagePath,
        page_title: pageTitle,
      });
    }
  }, []);

  const trackRewrite = useCallback((messageLength: number, region?: string) => {
    trackEvent({
      action: 'rewrite_message',
      category: 'engagement',
      label: region || 'unknown',
      value: messageLength,
    });
  }, [trackEvent]);

  const trackError = useCallback((errorType: string, errorMessage: string) => {
    trackEvent({
      action: 'error_occurred',
      category: 'error',
      label: errorType,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackRewrite,
    trackError,
  };
}
