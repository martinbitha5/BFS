import { Briefcase, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function Careers() {
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
            <span className="text-white font-medium">{t('footer.about.careers')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            {t('careers.title')}
          </h1>
          <p className="text-xl text-white/70 mb-12">{t('careers.subtitle')}</p>

          {/* Intro */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-8 mb-8">
            <p className="text-white/80 leading-relaxed text-lg">{t('careers.intro')}</p>
          </div>

          {/* Why Join Us */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">{t('careers.values.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Zap className="w-8 h-8 text-white mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">{t('careers.values.innovation')}</h3>
              </div>
              <div className="text-center">
                <Briefcase className="w-8 h-8 text-white mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">{t('careers.values.impact')}</h3>
              </div>
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-white mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">{t('careers.values.growth')}</h3>
              </div>
            </div>
          </div>

          {/* Open Positions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('careers.positions.title')}</h2>
            <p className="text-white/80">{t('careers.positions.none')}</p>
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
