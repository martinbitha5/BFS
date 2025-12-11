import { Barcode, Download, LayoutDashboard, LogOut, Package, Plane, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
    { path: '/flights', label: 'Gestion des Vols', icon: Plane },
    { path: '/baggages', label: 'Bagages', icon: Package },
    { path: '/passengers', label: 'Passagers', icon: Users },
    { path: '/birs', label: 'BIRS International', icon: Package },
    { path: '/raw-scans', label: 'Scans Bruts', icon: Barcode },
    { path: '/export', label: 'Export', icon: Download },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar à gauche (style Ubuntu) */}
      <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-xl">
        {/* Header Sidebar */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3 mb-3">
            <Logo width={70} height={35} className="hover:scale-105 transition-transform duration-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              OPS Dashboard
            </h1>
            {user && (
              <p className="text-xs text-gray-400 font-medium mt-1">
                Aéroport {user.airport_code}
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info et déconnexion */}
        {user && (
          <div className="p-4 border-t border-gray-700">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </button>
          </div>
        )}
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-6 px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
