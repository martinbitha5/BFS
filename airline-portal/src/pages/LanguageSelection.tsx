import { Plane } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSelection() {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();

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

        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Choose Your Language / Choisissez votre langue
          </h2>
          <p className="text-white/70 text-center mb-8">
            Select your preferred language to continue
            <br />
            Sélectionnez votre langue préférée pour continuer
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bouton Français */}
            <button
              onClick={() => handleLanguageSelect('fr')}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-600/80 to-blue-800/80 hover:from-blue-500/90 hover:to-blue-700/90 backdrop-blur-md border-2 border-white/30 rounded-xl p-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="text-center">
                <h3 className="text-4xl font-bold text-white mb-3">FR</h3>
                <h4 className="text-xl font-semibold text-blue-100 mb-2">Français</h4>
                <p className="text-blue-100 text-sm">
                  Continuer en français
                </p>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"></div>
            </button>

            {/* Bouton English */}
            <button
              onClick={() => handleLanguageSelect('en')}
              className="group relative overflow-hidden bg-gradient-to-br from-red-600/80 to-red-800/80 hover:from-red-500/90 hover:to-red-700/90 backdrop-blur-md border-2 border-white/30 rounded-xl p-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="text-center">
                <h3 className="text-4xl font-bold text-white mb-3">EN</h3>
                <h4 className="text-xl font-semibold text-red-100 mb-2">English</h4>
                <p className="text-red-100 text-sm">
                  Continue in English
                </p>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"></div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-white/60">
              You can change the language anytime from the settings
              <br />
              Vous pouvez changer la langue à tout moment depuis les paramètres
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
