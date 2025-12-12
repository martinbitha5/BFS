import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function News() {
  const { t } = useLanguage();

  const news = [
    {
      date: '2025-01-15',
      title: 'Lancement du nouveau système BFS',
      content: 'Le système BFS est maintenant opérationnel à l\'aéroport de Kinshasa.'
    },
    {
      date: '2025-01-10',
      title: 'Expansion vers d\'autres aéroports',
      content: 'BFS System s\'étend à Goma et Lubumbashi dans les prochains mois.'
    }
  ];

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
            <span className="text-white font-medium">{t('footer.about.news')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            {t('news.title')}
          </h1>
          <p className="text-xl text-white/70 mb-12">{t('news.subtitle')}</p>

          <div className="space-y-6">
            {news.map((item, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-8">
                <div className="flex items-center space-x-2 text-sm text-white/70 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">{item.title}</h2>
                <p className="text-white/80 leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
