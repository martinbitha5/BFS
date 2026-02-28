import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import About from './pages/About';
import Arrivals from './pages/Arrivals';
import BaggageManagement from './pages/BaggageManagement';
import BRSInternational from './pages/BRSInternational';
import Dashboard from './pages/Dashboard';
import DataDeletionRequest from './pages/DataDeletionRequest';
import Deliveries from './pages/Deliveries';
import Departures from './pages/Departures';
import Export from './pages/Export';
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
          
          {/* Dashboard Principal (Supervisor) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
          
          {/* Vols en Départ (Supervisor) */}
          <Route
            path="/departures"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <Departures />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
          
          {/* Vols en Arrivée (Supervisor) */}
          <Route
            path="/arrivals"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <Arrivals />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
          
          {/* Livraisons de Bagages (Supervisor) */}
          <Route
            path="/deliveries"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <Deliveries />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
          
          {/* BRS International (Supervisor) */}
          <Route
            path="/brs"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <BRSInternational />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
          
          {/* Export (Supervisor) */}
          <Route
            path="/export"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <Export />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
          
          {/* Passagers (Supervisor) */}
          <Route
            path="/passengers"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <Passengers />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
          
          {/* Gestion des Bagages (Supervisor) */}
          <Route
            path="/baggage-management"
            element={
              <ProtectedRoute>
                <RealtimeProvider>
                  <Layout>
                    <BaggageManagement />
                  </Layout>
                </RealtimeProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
