import { Globe, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-black/90 backdrop-blur-sm text-white sticky top-0 z-50 relative">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <Plane className="w-7 h-7" />
            <span className="text-xl font-bold tracking-wider">{t('header.title')}</span>
          </Link>
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-8 text-sm">
              <Link to="/" className="hover:text-gray-300 transition-colors">{t('nav.home')}</Link>
              <Link to="/about" className="hover:text-gray-300 transition-colors">{t('nav.about')}</Link>
              <Link to="/support" className="hover:text-gray-300 transition-colors">{t('nav.support')}</Link>
            </nav>
            {/* Language Switcher */}
            <div className="flex items-center space-x-2 border-l border-gray-700 pl-6">
              <Globe className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => setLanguage('fr')}
                className={`text-sm font-medium transition-colors ${
                  language === 'fr' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                FR
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={() => setLanguage('en')}
                className={`text-sm font-medium transition-colors ${
                  language === 'en' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
