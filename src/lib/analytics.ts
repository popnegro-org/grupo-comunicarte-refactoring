const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID?.trim();
const canonicalHosts = new Set(['grupocomunicarte.com.ar', 'www.grupocomunicarte.com.ar']);

export function isCanonicalAnalyticsHost(hostname: string): boolean {
  return canonicalHosts.has(hostname.toLowerCase());
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initAnalytics() {
  if (initialized || !measurementId || !/^G-[A-Z0-9]+$/.test(measurementId)) return;
  // Vercel Preview and local QA share the configured VITE variable; never pollute production GA4 with test traffic.
  if (!isCanonicalAnalyticsHost(window.location.hostname)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer.push(args);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.googleAnalytics = 'ga4';
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
  });

  initialized = true;
}
