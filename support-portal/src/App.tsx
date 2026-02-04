import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Airlines from './pages/Airlines';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Users from './pages/Users';

// Composant de protection des routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Vérifier que l'utilisateur est bien un support
  if (user.role !== 'support') {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Redirection basée sur l'authentification
function AuthRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'support') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Si ce n'est pas un support, rediriger vers login
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Page de connexion */}
          <Route path="/login" element={<Login />} />
          
          {/* Redirection par défaut */}
          <Route path="/" element={<AuthRedirect />} />
          
          {/* Dashboard Support */}
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
          
          {/* Gestion Utilisateurs */}
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Gestion Compagnies */}
          <Route
            path="/airlines"
            element={
              <ProtectedRoute>
                <Layout>
                  <Airlines />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
