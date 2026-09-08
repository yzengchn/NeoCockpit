import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider, Spin, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  initBaiduTongji,
  initGoogleAnalytics,
  trackBaiduTongjiPageView,
  trackGoogleAnalyticsPageView,
} from '@/utils/analytics';
import { lazyWithRetry } from '@/utils/lazyImport';
import { applySeo, getRouteSeo } from '@/utils/seo';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { LandingPage } from './pages/LandingPage';
import { CreatorPage } from './pages/CreatorPage';
import { InspirationPage } from './pages/InspirationPage';
import { ThemesPage } from './pages/ThemesPage';
import { MyThemesPage } from './pages/MyThemesPage';
import '@/styles/global.css';

const InspirationDetailPage = lazyWithRetry(() => import('./pages/InspirationDetailPage').then((module) => ({ default: module.InspirationDetailPage })));
const ThemePackageDetailPage = lazyWithRetry(() => import('./pages/ThemePackageDetailPage').then((module) => ({ default: module.ThemePackageDetailPage })));
const CommunityPage = lazyWithRetry(() => import('./pages/CommunityPage').then((module) => ({ default: module.CommunityPage })));
const TaskDetailPage = lazyWithRetry(() => import('./pages/TaskDetailPage').then((module) => ({ default: module.TaskDetailPage })));
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'));
const StickerEditorPage = lazyWithRetry(() => import('./pages/StickerEditorPage').then((module) => ({ default: module.StickerEditorPage })));

const RouteFallback: React.FC = () => (
  <div className="route-fallback">
    <Spin size="large" />
  </div>
);

class RouteErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="route-fallback route-fallback--error">
          <div className="route-fallback__title">页面资源暂时不可用</div>
          <div className="route-fallback__desc">请刷新页面后重试，或返回主页继续浏览。</div>
          <button className="route-fallback__button" type="button" onClick={() => window.location.assign('/')}>
            返回主页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RouteBoundary: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  return (
    <RouteErrorBoundary key={location.pathname}>
      {children}
    </RouteErrorBoundary>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 10_000,
      gcTime: 5 * 60_000,
    },
  },
});

const AnalyticsRouteTracker: React.FC = () => {
  const location = useLocation();
  const skipInitialPageView = React.useRef(true);

  React.useEffect(() => {
    initBaiduTongji();
    initGoogleAnalytics();
  }, []);

  React.useEffect(() => {
    if (skipInitialPageView.current) {
      skipInitialPageView.current = false;
      return;
    }

    const pagePath = `${location.pathname}${location.search}${location.hash}`;
    trackBaiduTongjiPageView(pagePath);
    trackGoogleAnalyticsPageView(pagePath);
  }, [location.hash, location.pathname, location.search]);

  return null;
};

const SeoRouteUpdater: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    applySeo(getRouteSeo(location.pathname), location.pathname);
  }, [location.pathname]);

  return null;
};

/** Reset scroll position to top on route changes (BrowserRouter keeps the
 *  previous scroll offset by default). Honors in-page hash anchors. */
const ScrollToTop: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return null;
};

const AppRoutes: React.FC = () => {
  const { authReady } = useUser();

  if (!authReady) {
    return (
      <div className="route-fallback">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <RouteBoundary>
      <React.Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/creator" element={<CreatorPage />} />
          <Route path="/inspiration" element={<InspirationPage />} />
          <Route path="/inspiration/:taskId" element={<InspirationDetailPage />} />
          <Route path="/themes" element={<ThemesPage />} />
          <Route path="/themes/mine" element={<MyThemesPage />} />
          <Route path="/themes/:packageId" element={<ThemePackageDetailPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/tasks/:taskId/sticker-editor" element={<StickerEditorPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </React.Suspense>
    </RouteBoundary>
  );
};

const App: React.FC = () => {
   return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6f94ff',
          borderRadius: 10,
          fontFamily: 'var(--font-sans)',
          fontWeightStrong: 500,
          colorBgContainer: '#08101b',
          colorBgElevated: '#0c1524',
          colorBgLayout: '#02050b',
          colorBorder: 'rgba(143,183,255,0.14)',
          colorText: '#edf4ff',
          colorTextSecondary: 'rgba(203,216,235,0.72)',
        },
        components: {
          Card: { colorBgContainer: '#08101b' },
          Table: { colorBgContainer: '#08101b' },
          Input: { colorBgContainer: '#091321' },
          Select: { colorBgContainer: '#091321' },
          Modal: { contentBg: '#0c1524', headerBg: '#0c1524' },
        },
      }}
    >
      <AntdApp component={false}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <UserProvider>
              <SeoRouteUpdater />
              <AnalyticsRouteTracker />
              <ScrollToTop />
              <div className="app-shell">
                {/* grid background */}
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundImage:
                    'linear-gradient(rgba(143,183,255,0.026) 1px, transparent 1px),' +
                    'linear-gradient(90deg, rgba(143,183,255,0.018) 1px, transparent 1px)',
                  backgroundSize: '56px 56px',
                  pointerEvents: 'none',
                  zIndex: 0,
                }} />

                {/* top-center radial glow */}
                <div style={{
                  position: 'fixed',
                  top: -320,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 1000,
                  height: 600,
                  background: 'radial-gradient(ellipse, rgba(111,148,255,0.11) 0%, rgba(48,72,142,0.055) 42%, transparent 70%)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }} />

                {/* bottom-right accent glow */}
                <div style={{
                  position: 'fixed',
                  bottom: -200,
                  right: -100,
                  width: 500,
                  height: 500,
                  background: 'radial-gradient(ellipse, rgba(111,148,255,0.065) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                  <AppRoutes />
                </div>
              </div>
            </UserProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
