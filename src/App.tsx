import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { PageTransition } from './components/layout/PageTransition';
import { SelectionProvider } from './context/SelectionContext';

// Public pages
const Home = lazy(() => import('./pages/Home'));
const ComingSoon = lazy(() => import('./pages/ComingSoon'));
const Inventario = lazy(() => import('./pages/Inventario'));
const MediaKits = lazy(() => import('./pages/MediaKits'));
const Soportes = lazy(() => import('./pages/Soportes'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const Soluciones = lazy(() => import('./pages/Soluciones'));
const Contacto = lazy(() => import('./pages/Contacto'));

// Auth & Dashboard
const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const DashboardSupportList = lazy(() => import('./pages/dashboard/DashboardSupportList'));
const DashboardSupportProductEditor = lazy(() => import('./pages/dashboard/DashboardSupportProductEditor'));
const DashboardSupportPreview = lazy(() => import('./pages/dashboard/DashboardSupportPreview'));
const DashboardSupportReservation = lazy(() => import('./pages/dashboard/DashboardSupportReservation'));
const DashboardMediaKitWorkflow = lazy(() => import('./pages/dashboard/DashboardMediaKitWorkflow'));
const DashboardMediaKitBuilder = lazy(() => import('./pages/dashboard/DashboardMediaKitBuilder'));

function PublicPage({ children }: { children: ReactNode }) {
  const isProductionDomain = ['grupocomunicarte.com.ar', 'www.grupocomunicarte.com.ar'].includes(window.location.hostname);

  // Keep public pages on canonical production domains behind Coming Soon.
  // Preview/QA hostnames render the functional PMV.
  if (isProductionDomain) {
    return <ComingSoon />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <SelectionProvider>
      <Router>
        <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
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
          <Route path="/" element={<PublicPage><PageTransition><Home /></PageTransition></PublicPage>} />
          <Route path="/soportes" element={<PublicPage><PageTransition><Soportes /></PageTransition></PublicPage>} />
          <Route path="/nosotros" element={<PublicPage><PageTransition><Nosotros /></PageTransition></PublicPage>} />
          <Route path="/soluciones" element={<PublicPage><PageTransition><Soluciones /></PageTransition></PublicPage>} />
          <Route path="/inventario" element={<PublicPage><PageTransition><Inventario /></PageTransition></PublicPage>} />
          <Route path="/mediakits" element={<PublicPage><PageTransition><MediaKits /></PageTransition></PublicPage>} />
          <Route path="/contacto" element={<PublicPage><PageTransition><Contacto /></PageTransition></PublicPage>} />
        </Routes>
        </Suspense>
      </Router>
    </SelectionProvider>
  );
}
