import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SelectionProvider } from './context/SelectionContext';

// Public pages
import ComingSoon from './pages/ComingSoon';

// Auth & Dashboard
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import DashboardSupportList from './pages/dashboard/DashboardSupportList';
import DashboardSupportProductEditor from './pages/dashboard/DashboardSupportProductEditor';
import DashboardSupportPreview from './pages/dashboard/DashboardSupportPreview';
import DashboardSupportReservation from './pages/dashboard/DashboardSupportReservation';
import DashboardMediaKitWorkflow from './pages/dashboard/DashboardMediaKitWorkflow';
import DashboardMediaKitBuilder from './pages/dashboard/DashboardMediaKitBuilder';

function PublicRoutes() {
  // This branch is the Coming Soon redesign candidate: render the same page on
  // Preview and canonical production domains so reviewers see the actual target.
  return <ComingSoon />;
}

export default function App() {
  return (
    <SelectionProvider>
      <Router>
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
      </Router>
    </SelectionProvider>
  );
}
