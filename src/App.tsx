import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
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

function PublicRoutes() {
  const location = useLocation();
  const isProductionDomain = ['grupocomunicarte.com.ar', 'www.grupocomunicarte.com.ar'].includes(window.location.hostname);

  // Keep all public routes on canonical production domains behind the standalone
  // Coming Soon page. Preview/QA hostnames retain the complete functional PMV.
  if (isProductionDomain) {
    return <ComingSoon />;
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/soportes" element={<PageTransition><Soportes /></PageTransition>} />
          <Route path="/nosotros" element={<PageTransition><Nosotros /></PageTransition>} />
          <Route path="/soluciones" element={<PageTransition><Soluciones /></PageTransition>} />
          <Route path="/inventario" element={<PageTransition><Inventario /></PageTransition>} />
          <Route path="/mediakits" element={<PageTransition><MediaKits /></PageTransition>} />
          <Route path="/contacto" element={<PageTransition><Contacto /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
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
          <Route path="*" element={<PublicRoutes />} />
        </Routes>
        </Suspense>
      </Router>
    </SelectionProvider>
  );
}
