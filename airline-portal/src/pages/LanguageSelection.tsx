import { Globe, Plane } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSelection() {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();

  // Auto-redirection si langue déjà choisie
  useEffect(() => {
    const savedLanguage = localStorage.getItem('airline-language');
    if (savedLanguage) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLanguageSelect = (lang: 'fr' | 'en') => {
    setLanguage(lang);
    navigate('/login');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Plane className="w-20 h-20 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">BFS System</h1>
          <p className="text-xl text-primary-100">Baggage Found Solution</p>
          <p className="text-lg text-white/80 mt-2">Airlines Portal</p>
        </div>

        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-white mr-3" />
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Choose Language / Langue
            </h2>
          </div>
          <p className="text-white/70 text-center mb-6 text-sm md:text-base">
            Select your preferred language<br className="md:hidden" /> / Sélectionnez votre langue
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            {/* Bouton Français */}
            <button
              onClick={() => handleLanguageSelect('fr')}
              className="group relative overflow-hidden bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 hover:border-blue-400/50 rounded-lg px-6 py-4 transition-all duration-200 flex items-center justify-center space-x-3 flex-1"
            >
              <div className="text-3xl">🇫🇷</div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">Français</h3>
                <p className="text-xs text-white/70">French</p>
              </div>
            </button>

            {/* Bouton English */}
            <button
              onClick={() => handleLanguageSelect('en')}
              className="group relative overflow-hidden bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 hover:border-red-400/50 rounded-lg px-6 py-4 transition-all duration-200 flex items-center justify-center space-x-3 flex-1"
            >
              <div className="text-3xl">🇬🇧</div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">English</h3>
                <p className="text-xs text-white/70">Anglais</p>
              </div>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-white/60">
              💡 Your choice will be saved
              <br />
              Votre choix sera sauvegardé
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/80">
            © 2024 BFS System - Baggage Found Solution
          </p>
        </div>
      </div>
    </div>
  );
}
