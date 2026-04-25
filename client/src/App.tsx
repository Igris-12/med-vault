import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SideNav } from './components/shared/SideNav';
import { CardSkeleton } from './components/shared/Skeleton';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Records = lazy(() => import('./pages/Records'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Locator = lazy(() => import('./pages/Locator'));
const Chat = lazy(() => import('./pages/Chat'));
const Upload = lazy(() => import('./pages/Upload'));
const Emergency = lazy(() => import('./pages/Emergency'));

/** Pages with padding + max-width container */
function PaddedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto p-6">
      {children}
    </div>
  );
}

/** Full-bleed layout (e.g. Locator map) — no padding, no max-width */
function BleedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function AppShell() {
  const location = useLocation();
  const isFullBleed = location.pathname.includes('/locator');

  return (
    <div className="flex h-screen bg-void overflow-hidden">
      <SideNav />
      <main className={`flex-1 ml-14 ${isFullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Suspense fallback={
          <div className="max-w-7xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        }>
          <Routes>
            {/* Full-bleed map page */}
            <Route path="locator" element={
              <BleedLayout><Locator /></BleedLayout>
            } />

            {/* Padded standard pages */}
            <Route path="dashboard" element={<PaddedLayout><Dashboard /></PaddedLayout>} />
            <Route path="timeline" element={<PaddedLayout><Timeline /></PaddedLayout>} />
            <Route path="records" element={<PaddedLayout><Records /></PaddedLayout>} />
            <Route path="prescriptions" element={<PaddedLayout><Prescriptions /></PaddedLayout>} />
            <Route path="alerts" element={<PaddedLayout><Alerts /></PaddedLayout>} />
            <Route path="chat" element={<PaddedLayout><Chat /></PaddedLayout>} />
            <Route path="upload" element={<PaddedLayout><Upload /></PaddedLayout>} />
            <Route path="emergency" element={<PaddedLayout><Emergency /></PaddedLayout>} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-void flex items-center justify-center">
        <span className="text-teal font-mono animate-pulse">Loading MedVault…</span>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
