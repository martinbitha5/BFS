import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import BaggageDispute from './pages/BaggageDispute';
import Login from './pages/Login';

// Composant de protection des routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Vérifier que l'utilisateur est bien un baggage_dispute
  if (user.role !== 'baggage_dispute') {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Redirection basée sur l'authentification
function AuthRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'baggage_dispute') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Si ce n'est pas un baggage_dispute, rediriger vers login
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
          
          {/* Dashboard Litiges */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <BaggageDispute />
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
