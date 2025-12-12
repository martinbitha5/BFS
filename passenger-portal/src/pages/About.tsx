import { Award, CheckCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function About() {
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
            <span className="text-black font-medium">{t('nav.about')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-black mb-4 tracking-tight">
            {t('about.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-12">{t('about.subtitle')}</p>

          {/* Intro Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">{t('about.intro.title')}</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">{t('about.intro.p1')}</p>
            <p className="text-gray-700 leading-relaxed">{t('about.intro.p2')}</p>
          </div>

          {/* Mission */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">{t('about.mission.title')}</h2>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{t('about.mission.p1')}</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{t('about.mission.p2')}</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{t('about.mission.p3')}</span>
              </li>
            </ul>
          </div>

          {/* Values */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">{t('about.values.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Innovation */}
              <div className="border border-gray-200 rounded-lg p-6">
                <Award className="w-8 h-8 text-black mb-3" />
                <h3 className="font-bold text-black mb-2">{t('about.values.innovation')}</h3>
                <p className="text-sm text-gray-600">{t('about.values.innovation.text')}</p>
              </div>

              {/* Reliability */}
              <div className="border border-gray-200 rounded-lg p-6">
                <Shield className="w-8 h-8 text-black mb-3" />
                <h3 className="font-bold text-black mb-2">{t('about.values.reliability')}</h3>
                <p className="text-sm text-gray-600">{t('about.values.reliability.text')}</p>
              </div>

              {/* Transparency */}
              <div className="border border-gray-200 rounded-lg p-6">
                <CheckCircle className="w-8 h-8 text-black mb-3" />
                <h3 className="font-bold text-black mb-2">{t('about.values.transparency')}</h3>
                <p className="text-sm text-gray-600">{t('about.values.transparency.text')}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
