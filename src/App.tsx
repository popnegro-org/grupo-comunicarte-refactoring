import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SelectionProvider } from './context/SelectionContext';

// Keep the public landing page in the initial bundle; load private workflows on demand.
import ComingSoon from './pages/ComingSoon';

const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const DashboardSupportList = lazy(() => import('./pages/dashboard/DashboardSupportList'));
const DashboardSupportProductEditor = lazy(() => import('./pages/dashboard/DashboardSupportProductEditor'));
const DashboardSupportPreview = lazy(() => import('./pages/dashboard/DashboardSupportPreview'));
const DashboardSupportReservation = lazy(() => import('./pages/dashboard/DashboardSupportReservation'));
const DashboardMediaKitWorkflow = lazy(() => import('./pages/dashboard/DashboardMediaKitWorkflow'));
const DashboardMediaKitBuilder = lazy(() => import('./pages/dashboard/DashboardMediaKitBuilder'));

function PublicRoutes() {
  // This branch is the Coming Soon redesign candidate: render the same page on
  // Preview and canonical production domains so reviewers see the actual target.
  return <ComingSoon />;
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-sm text-slate-600" role="status" aria-live="polite">
      Cargando…
    </div>
  );
}

export default function App() {
  return (
    <SelectionProvider>
      <Router>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/soportes" element={<DashboardSupportList />} />
            <Route path="/dashboard/soportes/new" element={<DashboardSupportProductEditor mode="create" />} />
            <Route path="/dashboard/soportes/:canonicalId/edit" element={<DashboardSupportProductEditor mode="edit" />} />
            <Route path="/dashboard/soportes/:canonicalId/preview" element={<DashboardSupportPreview />} />
            <Route path="/dashboard/soportes/:canonicalId/reservation" element={<DashboardSupportReservation />} />
            {/* Single commercial inbox: solicitudes is canonical; mediakits redirects */}
            <Route path="/dashboard/solicitudes" element={<DashboardMediaKitWorkflow />} />
            <Route path="/dashboard/mediakits/nuevo" element={<DashboardMediaKitBuilder />} />
            <Route path="/dashboard/mediakits" element={<Navigate to="/dashboard/solicitudes" replace />} />
            <Route path="*" element={<PublicRoutes />} />
          </Routes>
        </Suspense>
      </Router>
    </SelectionProvider>
  );
}
