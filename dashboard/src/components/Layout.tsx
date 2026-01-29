import { LayoutDashboard, LogOut, Luggage, Menu, Package, Plane, Shield, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from './Footer';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation selon le rôle
  const getNavItems = (): NavItem[] => {
    if (user?.role === 'support') {
      // Support : accès au panneau support uniquement
      return [
        { path: '/support', label: 'Panneau Support', icon: Shield },
      ];
    }
    
    if (user?.role === 'baggage_dispute') {
      // Litige Bagages : accès à sa page dédiée
      return [
        { path: '/baggage-dispute', label: 'Litiges Bagages', icon: Luggage },
      ];
    }
    
    // Supervisor : accès sans bagages (les bagages sont visibles via les passagers)
    return [
      { path: '/dashboard', label: "Dashboard", icon: LayoutDashboard },
      { path: '/flights', label: 'Gestion Vols', icon: Plane },
      { path: '/passengers', label: 'Passagers', icon: Users },
      { path: '/brs', label: 'BRS International', icon: Package },
    ];
  };

  const navItems = getNavItems();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div 
      className="flex h-screen relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative
        w-64 h-screen
        bg-black/30 backdrop-blur-md text-white
        shadow-xl z-30 border-r border-white/20
        transform transition-transform duration-300 ease-in-out
        overflow-y-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col min-h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center space-x-3 mb-3">
              <Logo width={70} height={35} />
            </div>
            <h1 className="text-lg font-bold text-white">OPS Dashboard</h1>
            {user && (
              <p className="text-xs text-white/70 mt-1">
                Aéroport {user.airport_code}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="py-4 flex-1">
            <div className="space-y-1 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User */}
          {user && (
            <div className="p-4 border-t border-white/20">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-white/50 truncate mb-3">{user.email}</p>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-black/50 backdrop-blur text-white rounded-lg border border-white/20"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        <div className="flex-1 container mx-auto py-6 px-4 sm:px-6 mt-16 md:mt-0">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
