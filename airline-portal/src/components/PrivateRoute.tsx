import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingPlane from './LoadingPlane';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { airline, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingPlane text="Authentification en cours..." size="lg" />
      </div>
    );
  }

  return airline ? <>{children}</> : <Navigate to="/login" replace />;
}
