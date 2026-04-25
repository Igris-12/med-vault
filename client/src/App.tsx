import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SideNav } from './components/shared/SideNav';
import { TopNav } from './components/shared/TopNav';
import { CardSkeleton } from './components/shared/Skeleton';

const Landing       = lazy(() => import('./pages/Landing'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Timeline      = lazy(() => import('./pages/Timeline'));
const Records       = lazy(() => import('./pages/Records'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));
const Chat          = lazy(() => import('./pages/Chat'));
const Upload        = lazy(() => import('./pages/Upload'));
// ── New feature pages ─────────────────────────────────────────────────────
const Alerts        = lazy(() => import('./pages/Alerts'));
const Locator       = lazy(() => import('./pages/Locator'));
// ── WA Reminder Module ────────────────────────────────────────────────────
const WALanding     = lazy(() => import('./pages/reminders/WALanding'));
const WADashboard   = lazy(() => import('./pages/reminders/WADashboard'));
const WASchedule    = lazy(() => import('./pages/reminders/WASchedule'));
const WAActivity    = lazy(() => import('./pages/reminders/WAActivity'));
const WASettings    = lazy(() => import('./pages/reminders/WASettings'));

function PageFallback() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isFullBleed = location.pathname.includes('/locator');

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--dd-bg)' }}>
      <SideNav />
      <TopNav />
      <main
        className={`flex-1 ${isFullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ marginLeft: 64, paddingTop: 56, background: 'var(--dd-bg)' }}
      >
        {isFullBleed ? (
          children
        ) : (
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--dd-bg)' }}>
        <span className="font-mono animate-pulse" style={{ color: 'var(--dd-accent)' }}>Loading MedVault…</span>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/reminders" element={<WALanding />} />
        <Route path="/app/*" element={
          <AppLayout>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="dashboard"           element={<Dashboard />} />
                <Route path="timeline"            element={<Timeline />} />
                <Route path="records"             element={<Records />} />
                <Route path="prescriptions"       element={<Prescriptions />} />
                <Route path="chat"                element={<Chat />} />
                <Route path="upload"              element={<Upload />} />
                <Route path="alerts"              element={<Alerts />} />
                <Route path="locator"             element={<Locator />} />
                <Route path="reminders/dashboard" element={<WADashboard />} />
                <Route path="reminders/schedule"  element={<WASchedule />} />
                <Route path="reminders/activity"  element={<WAActivity />} />
                <Route path="reminders/settings"  element={<WASettings />} />
                <Route path="reminders"           element={<Navigate to="reminders/dashboard" replace />} />
                <Route path="*"                   element={<Navigate to="dashboard" replace />} />
              </Routes>
            </Suspense>
          </AppLayout>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}