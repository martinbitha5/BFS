import { History, LogOut, Plane, Upload } from 'lucide-react';
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { airline, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: Upload, label: 'Upload BIRS' },
    { path: '/history', icon: History, label: 'Historique' },
  ];

  return (
    <div 
      className="flex h-screen relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Sidebar */}
      <div className="w-64 bg-black/30 backdrop-blur-md shadow-lg relative z-10 border-r border-white/20">
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center space-x-2">
            <Plane className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-lg font-bold text-white">Portail Compagnies</h1>
              <p className="text-xs text-white/70">BFS System</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/20 bg-white/10">
          <p className="text-sm font-medium text-white">{airline?.name}</p>
          <p className="text-xs text-white/70">{airline?.code}</p>
          <p className="text-xs text-white/70">{airline?.email}</p>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-white/20 bg-black/20">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-3 py-2 text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative z-10">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
