import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import About from './pages/About';
import Baggages from './pages/Baggages';
import BIRS from './pages/BIRS';
import DashboardEnhanced from './pages/DashboardEnhanced';
import DebugParser from './pages/DebugParser';
import Export from './pages/Export';
import FlightManagement from './pages/FlightManagement';
import Legal from './pages/Legal';
import Login from './pages/Login';
import Passengers from './pages/Passengers';
import Privacy from './pages/Privacy';
import RawScans from './pages/RawScans';
import Register from './pages/Register';
import Terms from './pages/Terms';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardEnhanced />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/baggages"
            element={
              <ProtectedRoute>
                <Layout>
                  <Baggages />
                </Layout>
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/birs"
            element={
              <ProtectedRoute>
                <Layout>
                  <BIRS />
                </Layout>
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/raw-scans"
            element={
              <ProtectedRoute>
                <Layout>
                  <RawScans />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug-parser"
            element={
              <ProtectedRoute>
                <Layout>
                  <DebugParser />
                </Layout>
              </ProtectedRoute>
            }
          />
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
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
