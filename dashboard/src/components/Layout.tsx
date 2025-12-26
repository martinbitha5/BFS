import { Activity, AlertTriangle, BarChart3, Barcode, ChevronDown, ChevronRight, Download, LayoutDashboard, LogOut, Menu, Package, Plane, RefreshCw, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from './Footer';
import GlobalSearch from './GlobalSearch';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path?: string;
  label: string;
  icon: any;
  children?: NavItem[];
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['brs']);

  // Mettre à jour les menus ouverts quand l'utilisateur change
  useEffect(() => {
    setExpandedMenus(prev => {
      const hasApprovals = prev.includes('approbations');
      if (user && user.role === 'support' && !hasApprovals) {
        return [...prev, 'approbations'];
      } else if ((!user || user.role !== 'support') && hasApprovals) {
        return prev.filter(m => m !== 'approbations');
      }
      return prev;
    });
  }, [user]);

  // Menu de base pour tous les utilisateurs
  const baseNavItems: NavItem[] = [
    { path: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
    { path: '/flights', label: 'Gestion des Vols', icon: Plane },
    { path: '/baggages', label: 'Bagages', icon: Package },
    { path: '/passengers', label: 'Passagers', icon: Users },
    {
      label: 'BRS International',
      icon: BarChart3,
      children: [
        { path: '/brs-dashboard', label: 'Dashboard', icon: BarChart3 },
        { path: '/birs', label: 'Rapports', icon: Package },
        { path: '/brs-workflow', label: 'Workflow', icon: RefreshCw },
        { path: '/brs-unmatched', label: 'Non Matchés', icon: AlertTriangle },
        { path: '/brs-traceability', label: 'Traçabilité', icon: Search },
      ]
    },
    { path: '/raw-scans', label: 'Scans Bruts', icon: Barcode },
    { path: '/export', label: 'Export', icon: Download },
    {
      label: 'Administration',
      icon: Users,
      children: [
        { path: '/users', label: 'Utilisateurs', icon: Users },
        { path: '/audit-logs', label: 'Historique', icon: Activity },
        { path: '/settings', label: 'Paramètres', icon: Settings },
      ]
    },
  ];

  // Menu d'approbations (uniquement pour le support)
  const approvalNavItem: NavItem = {
    label: 'Approbations',
    icon: ShieldCheck,
    children: [
      { path: '/user-approval', label: 'Utilisateurs', icon: Users },
      { path: '/airline-approval', label: 'Airlines', icon: Plane },
      { path: '/baggage-authorization', label: 'Bagages', icon: Package },
    ]
  };

  // Filtrer les éléments du menu selon le rôle de l'utilisateur
  const navItems: NavItem[] = [
    ...baseNavItems,
    // Ajouter le menu Approbations uniquement si l'utilisateur est support
    ...(user && user.role === 'support' ? [approvalNavItem] : [])
  ];

  const isMenuExpanded = (menuLabel: string) => {
    return expandedMenus.includes(menuLabel.toLowerCase().replace(/\s+/g, '-'));
  };

  const toggleMenu = (menuLabel: string) => {
    const key = menuLabel.toLowerCase().replace(/\s+/g, '-');
    setExpandedMenus(prev =>
      prev.includes(key)
        ? prev.filter(m => m !== key)
        : [...prev, key]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isChildActive = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => child.path && location.pathname === child.path);
  };

  return (
    <div 
      className="flex h-screen relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Overlay mobile pour fermer sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar à gauche (style glassmorphism) */}
      <aside className={`
        fixed md:relative
        w-64 h-screen max-h-screen
        bg-black/30 backdrop-blur-md text-white
        flex flex-col shadow-xl z-30 border-r border-white/20
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header Sidebar */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center space-x-3 mb-3">
            <Logo width={70} height={35} className="hover:scale-105 transition-transform duration-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              OPS Dashboard
            </h1>
            {user && (
              <p className="text-xs text-white/70 font-medium mt-1">
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
              
              // Item avec sous-menu
              if (item.children) {
                const menuKey = item.label.toLowerCase().replace(/\s+/g, '-');
                const expanded = isMenuExpanded(menuKey);
                const hasActiveChild = isChildActive(item.children);
                
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleMenu(menuKey)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        hasActiveChild
                          ? 'bg-white/20 text-white font-semibold'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.label}
                      </div>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    
                    {expanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/10 pl-2">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.path);
                          
                          return (
                            <Link
                              key={child.path}
                              to={child.path!}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                childActive
                                  ? 'bg-white/20 text-white font-semibold'
                                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <ChildIcon className="w-4 h-4 mr-2" />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Item simple sans sous-menu
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path!}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-white/20 text-white font-semibold shadow-lg'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info et déconnexion - toujours visible en bas */}
        {user && (
          <div className="mt-auto p-4 border-t border-white/20 bg-black/20">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
              <p className="text-xs text-white/60 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </button>
          </div>
        )}
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col w-full md:w-auto">
        {/* Bouton hamburger mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-black/50 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-black/70 transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        {/* Barre de recherche globale */}
        <div className="fixed top-4 right-4 z-40">
          <GlobalSearch />
        </div>
        
        <div className="flex-1 container mx-auto py-6 px-6 mt-16 md:mt-0">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
