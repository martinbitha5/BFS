import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [pnr, setPnr] = useState('');
  const [tagNumber, setTagNumber] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (pnr.trim()) {
      navigate(`/track?pnr=${pnr.trim().toUpperCase()}`);
    } else if (tagNumber.trim()) {
      navigate(`/track?tag=${tagNumber.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <Link to="/" className="hover:text-black">{t('breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">{t('breadcrumb.tracking')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Title */}
          <h1 className="text-5xl font-bold text-black mb-12 tracking-tight">
            {t('home.title')}
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* PNR */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.pnr.required')}
                </label>
                <input
                  type="text"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder={t('home.pnr.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>

              {/* Flight Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.flight.label')}
                </label>
                <input
                  type="text"
                  placeholder={t('home.flight.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.date.label')}
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>

              {/* Baggage Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.tag.label')}
                </label>
                <input
                  type="text"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                  placeholder={t('home.tag.placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={!pnr.trim() && !tagNumber.trim()}
                className="bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Search className="w-5 h-5" />
                <span>{t('home.button')}</span>
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {t('home.required')}
              </p>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-black mb-3">{t('home.help.title')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('home.help.text')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:support@bfs-system.com"
                className="inline-flex items-center justify-center px-6 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors rounded text-sm font-medium"
              >
                {t('home.help.contact')}
              </a>
              <Link
                to="/faq"
                className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded text-sm font-medium"
              >
                {t('home.help.faq')}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
