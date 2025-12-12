import { History, LogOut, Menu, Plane, Upload, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { airline, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  const navItems = [
    { path: '/dashboard', icon: Upload, label: t('nav.upload') },
    { path: '/history', icon: History, label: t('nav.history') },
  ];

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

      {/* Sidebar */}
      <div className={`
        fixed md:relative
        w-64 h-screen
        bg-black/30 backdrop-blur-md shadow-lg z-30 border-r border-white/20
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plane className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-lg font-bold text-white">{t('dashboard.title')}</h1>
                <p className="text-xs text-white/70">BFS System</p>
              </div>
            </div>
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
              title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
            >
              <span className="text-xs text-white font-semibold">{language.toUpperCase()}</span>
            </button>
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
                onClick={() => setSidebarOpen(false)}
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
            <span className="font-medium">{t('nav.logout')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative z-10 flex flex-col w-full md:w-auto">
        {/* Bouton hamburger mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-black/50 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-black/70 transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        <div className="flex-1 p-8 pt-20 md:pt-8">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}
