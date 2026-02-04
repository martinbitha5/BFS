import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import About from './pages/About';
import BRSInternational from './pages/BRSInternational';
import Dashboard from './pages/Dashboard';
import DataDeletionRequest from './pages/DataDeletionRequest';
import Export from './pages/Export';
import FlightManagement from './pages/FlightManagement';
import Legal from './pages/Legal';
import Login from './pages/Login';
import Passengers from './pages/Passengers';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

// Composant pour rediriger selon le role
function RoleBasedRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Les rôles support et baggage_dispute doivent utiliser leurs propres portails
  if (user.role === 'support' || user.role === 'baggage_dispute') {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Pages publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/deletion-request" element={<DataDeletionRequest />} />
          
          {/* Redirection par défaut selon le rôle */}
          <Route path="/" element={<RoleBasedRedirect />} />
          
          {/* Dashboard - Affiche les données de l'app mobile (Supervisor) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* BRS International (Supervisor) */}
          <Route
            path="/brs"
            element={
              <ProtectedRoute>
                <Layout>
                  <BRSInternational />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Export (Supervisor) */}
          <Route
            path="/export"
            element={
              <ProtectedRoute>
                <Layout>
                  <Export />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Gestion des Vols (Supervisor) */}
          <Route
            path="/flights"
            element={
              <ProtectedRoute>
                <Layout>
                  <FlightManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Passagers (Supervisor) */}
          <Route
            path="/passengers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Passengers />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
