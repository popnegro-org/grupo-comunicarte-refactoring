import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Layout } from './components/layout/Layout';
import { PageTransition } from './components/layout/PageTransition';
import { SelectionProvider } from './context/SelectionContext';

// Public pages
import Home from './pages/Home';
import ComingSoon from './pages/ComingSoon';
import Inventario from './pages/Inventario';
import MediaKits from './pages/MediaKits';
import Soportes from './pages/Soportes';
import Nosotros from './pages/Nosotros';
import Soluciones from './pages/Soluciones';
import Contacto from './pages/Contacto';

// Auth & Dashboard
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import DashboardSupportList from './pages/dashboard/DashboardSupportList';
import DashboardSupportProductEditor from './pages/dashboard/DashboardSupportProductEditor';
import DashboardSupportPreview from './pages/dashboard/DashboardSupportPreview';
import DashboardSupportReservation from './pages/dashboard/DashboardSupportReservation';
import DashboardMediaKitWorkflow from './pages/dashboard/DashboardMediaKitWorkflow';
import DashboardMediaKitBuilder from './pages/dashboard/DashboardMediaKitBuilder';
import DashboardClients from './pages/dashboard/DashboardClients';

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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/clientes" element={<DashboardClients />} />
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
      </Router>
    </SelectionProvider>
  );
}

