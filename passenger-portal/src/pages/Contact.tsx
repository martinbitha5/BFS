import { Link } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function Contact() {
  const { t } = useLanguage();

  return (
    <div 
      className="min-h-screen flex flex-col relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white/5 backdrop-blur-sm border-b relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-white/70">
            <Link to="/" className="hover:text-white">{t('breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-medium">{t('footer.support.contact')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            {t('contact.title')}
          </h1>
          <p className="text-xl text-white/70 mb-12">{t('contact.text')}</p>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-8 text-center">
            <p className="text-white/80 mb-6">
              {t('support.contact.text')}
            </p>
            <Link
              to="/support"
              className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded transition-colors"
            >
              {t('support.contact.title')}
            </Link>
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
