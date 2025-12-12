import { Mail, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function Support() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pnr: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Message envoyé ! / Message sent!');
  };

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
            <span className="text-white font-medium">{t('nav.support')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            {t('support.title')}
          </h1>
          <p className="text-xl text-white/70 mb-12">{t('support.subtitle')}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-8">
                <h2 className="text-2xl font-bold text-white mb-4">{t('support.contact.title')}</h2>
                <p className="text-white/80 mb-6">{t('support.contact.text')}</p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-white/70" />
                    <div>
                      <p className="text-sm text-white/70">{t('support.contact.email')}</p>
                      <a href="mailto:support@bfs-system.com" className="font-medium text-white hover:underline">
                        support@bfs-system.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-white/70" />
                    <div>
                      <p className="text-sm text-white/70">{t('support.contact.phone')}</p>
                      <p className="font-medium text-white">+243 123 456 789</p>
                      <p className="text-xs text-white/60">{t('support.contact.hours')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency */}
              <div className="bg-red-900/20 backdrop-blur-sm rounded-lg border border-red-400/30 p-6">
                <h3 className="font-bold text-red-400 mb-2">{t('support.emergency.title')}</h3>
                <p className="text-sm text-red-300">{t('support.emergency.text')}</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">{t('support.form.title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('support.form.name')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('support.form.email')}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('support.form.pnr')}
                  </label>
                  <input
                    type="text"
                    value={formData.pnr}
                    onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('support.form.subject')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('support.form.message')}
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/60"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-white font-medium py-3 px-6 rounded transition-colors flex items-center justify-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>{t('support.form.submit')}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
