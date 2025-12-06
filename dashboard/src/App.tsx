import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardEnhanced from './pages/DashboardEnhanced';
import Passengers from './pages/Passengers';
import Baggages from './pages/Baggages';
import Export from './pages/Export';
import BIRS from './pages/BIRS';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
