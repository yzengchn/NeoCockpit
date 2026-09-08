import { canUseDOM } from '@/utils/browser';

type BaiduTongjiCommand = [string, ...Array<string | number | boolean | undefined>];
type GoogleAnalyticsCommand = [string, ...Array<string | number | boolean | Record<string, unknown> | undefined>];

declare global {
  interface Window {
    _hmt?: BaiduTongjiCommand[];
    dataLayer?: GoogleAnalyticsCommand[];
    gtag?: (...args: GoogleAnalyticsCommand) => void;
  }
}

let baiduInitialized = false;
let googleInitialized = false;
let lastBaiduTrackedPath = '';
let lastGoogleTrackedPath = '';

const getBaiduTongjiId = () => {
  return (import.meta.env.VITE_BAIDU_TONGJI_ID || '').trim();
};

const getGoogleAnalyticsId = () => {
  return (import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '').trim();
};

const normalizePagePath = (path: string) => {
  const normalizedPath = path.trim() || '/';
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
};

export const initBaiduTongji = () => {
  const baiduTongjiId = getBaiduTongjiId();
  if (!canUseDOM() || !baiduTongjiId || baiduInitialized || import.meta.env.DEV) {
    return;
  }

  baiduInitialized = true;
  window._hmt = window._hmt || [];

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-baidu-tongji-id="${baiduTongjiId}"]`,
  );

  if (existingScript) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://hm.baidu.com/hm.js?${encodeURIComponent(baiduTongjiId)}`;
  script.dataset.baiduTongjiId = baiduTongjiId;

  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
};

export const trackBaiduTongjiPageView = (path: string) => {
  if (!canUseDOM() || !getBaiduTongjiId() || import.meta.env.DEV) {
    return;
  }

  const pagePath = normalizePagePath(path);
  if (pagePath === lastBaiduTrackedPath) {
    return;
  }

  lastBaiduTrackedPath = pagePath;
  window._hmt = window._hmt || [];
  window._hmt.push(['_trackPageview', pagePath]);
};

export const initGoogleAnalytics = () => {
  const googleAnalyticsId = getGoogleAnalyticsId();
  if (!canUseDOM() || !googleAnalyticsId || googleInitialized || import.meta.env.DEV) {
    return;
  }

  googleInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: GoogleAnalyticsCommand) => {
    window.dataLayer?.push(args);
  });

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-google-analytics-id="${googleAnalyticsId}"]`,
  );

  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`;
    script.dataset.googleAnalyticsId = googleAnalyticsId;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date().toISOString());
  window.gtag('config', googleAnalyticsId);
};

export const trackGoogleAnalyticsPageView = (path: string) => {
  const googleAnalyticsId = getGoogleAnalyticsId();
  if (!canUseDOM() || !googleAnalyticsId || import.meta.env.DEV) {
    return;
  }

  const pagePath = normalizePagePath(path);
  if (pagePath === lastGoogleTrackedPath) {
    return;
  }

  lastGoogleTrackedPath = pagePath;
  window.gtag?.('config', googleAnalyticsId, {
    page_path: pagePath,
  });
};
