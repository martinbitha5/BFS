import { Package, Plane, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<'pnr' | 'tag'>('pnr');
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/track?${searchType}=${searchValue.trim().toUpperCase()}`);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Header */}
      <header className="relative z-10 bg-black/30 backdrop-blur-md border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-3">
            <Plane className="w-8 h-8 text-primary-400" />
            <h1 className="text-2xl font-bold text-white">BFS Tracking</h1>
          </div>
          <p className="text-center text-white/80 text-sm mt-1">
            Suivez vos bagages en temps réel
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-8 shadow-2xl">
            <div className="text-center mb-8">
              <Package className="w-16 h-16 text-primary-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Où est mon bagage ?
              </h2>
              <p className="text-white/70 text-sm">
                Entrez votre numéro de réservation (PNR) ou numéro de bagage
              </p>
            </div>

            {/* Search Type Selector */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSearchType('pnr')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  searchType === 'pnr'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Numéro PNR
              </button>
              <button
                onClick={() => setSearchType('tag')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  searchType === 'tag'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                N° Bagage
              </button>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {searchType === 'pnr' ? 'Numéro PNR' : 'Numéro de bagage'}
                </label>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={searchType === 'pnr' ? 'Ex: ABC123' : 'Ex: RF123456'}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/50"
                  required
                />
                <p className="text-xs text-white/60 mt-1">
                  {searchType === 'pnr' 
                    ? 'Code à 6 caractères sur votre billet'
                    : 'Numéro sur l\'étiquette de votre bagage'
                  }
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Search className="w-5 h-5" />
                <span>Rechercher mon bagage</span>
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/60 text-center">
                🔒 Vos informations sont sécurisées et confidentielles
              </p>
            </div>
          </div>

          {/* Help */}
          <div className="mt-6 text-center">
            <p className="text-white/70 text-sm">
              Besoin d'aide ? Contactez{' '}
              <a href="mailto:support@bfs-system.com" className="text-primary-400 hover:text-primary-300">
                support@bfs-system.com
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/30 backdrop-blur-md border-t border-white/20 py-4">
        <p className="text-center text-white/60 text-xs">
          © 2024 BFS System - African Transport Systems
        </p>
      </footer>
    </div>
  );
}
