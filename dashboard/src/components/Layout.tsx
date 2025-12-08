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
    { path: '/baggages', label: 'Bagages', icon: Plane },
    { path: '/passengers', label: 'Passagers', icon: Users },
    { path: '/birs', label: 'BIRS International', icon: Package },
    { path: '/raw-scans', label: 'Scans Bruts', icon: Barcode },
    { path: '/export', label: 'Export', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center space-x-3">
                {/* Logo ATS/CSI */}
                <Logo width={90} height={45} className="hover:scale-105 transition-transform duration-200" />
                
                {/* Separateur vertical */}
                <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
                
                {/* Info Dashboard */}
                <div>
                  <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    OPS
                  </h1>
                  {user && (
                    <p className="text-xs text-gray-600 font-medium">
                      {user.airport_code}
                    </p>
                  )}
                </div>
              </div>
              <div className="ml-10 flex space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-right">
                  <p className="font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
