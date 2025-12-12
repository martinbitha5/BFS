import { Link } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div 
      className="min-h-screen flex flex-col relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <Link to="/" className="hover:text-black">{t('breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">{t('footer.legal.terms')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-black mb-6 tracking-tight">
            {t('terms.title')}
          </h1>
          <p className="text-gray-700 mb-12 leading-relaxed">{t('terms.intro')}</p>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-4">{t('terms.service.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('terms.service.text')}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-4">{t('terms.responsibility.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('terms.responsibility.text')}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-4">{t('terms.availability.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('terms.availability.text')}</p>
            </div>
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
