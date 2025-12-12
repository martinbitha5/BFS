import { Link } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function Privacy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <Link to="/" className="hover:text-black">{t('breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">{t('footer.legal.privacy')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-black mb-6 tracking-tight">
            {t('privacy.title')}
          </h1>
          <p className="text-gray-700 mb-12 leading-relaxed">{t('privacy.intro')}</p>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-4">{t('privacy.collect.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('privacy.collect.text')}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-4">{t('privacy.use.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('privacy.use.text')}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-4">{t('privacy.security.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('privacy.security.text')}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-4">{t('privacy.rights.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('privacy.rights.text')}</p>
            </div>
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
