import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import About from './pages/About';
import BRSInternational from './pages/BRSInternational';
import Dashboard from './pages/Dashboard';
import Export from './pages/Export';
import Legal from './pages/Legal';
import Login from './pages/Login';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

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
          
          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard - Affiche les données de l'app mobile */}
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
          
          {/* BRS International */}
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
          
          {/* Export */}
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
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
