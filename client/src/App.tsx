import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SideNav } from './components/shared/SideNav';
import { CardSkeleton } from './components/shared/Skeleton';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Records = lazy(() => import('./pages/Records'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));
const Chat = lazy(() => import('./pages/Chat'));
const Upload = lazy(() => import('./pages/Upload'));
const Emergency = lazy(() => import('./pages/Emergency'));

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-void">
      <SideNav />
      <main className="flex-1 ml-14 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void flex items-center justify-center"><span className="text-teal font-mono animate-pulse">Loading MedVault…</span></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/app/*"
          element={
            <AppLayout>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="timeline" element={<Timeline />} />
                  <Route path="records" element={<Records />} />
                  <Route path="prescriptions" element={<Prescriptions />} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="upload" element={<Upload />} />
                  <Route path="emergency" element={<Emergency />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </Suspense>
            </AppLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
