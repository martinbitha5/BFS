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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <Link to="/" className="hover:text-black">{t('breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">{t('nav.support')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-black mb-4 tracking-tight">
            {t('support.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-12">{t('support.subtitle')}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-black mb-4">{t('support.contact.title')}</h2>
                <p className="text-gray-700 mb-6">{t('support.contact.text')}</p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">{t('support.contact.email')}</p>
                      <a href="mailto:support@bfs-system.com" className="font-medium text-black hover:underline">
                        support@bfs-system.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">{t('support.contact.phone')}</p>
                      <p className="font-medium text-black">+243 123 456 789</p>
                      <p className="text-xs text-gray-500">{t('support.contact.hours')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency */}
              <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                <h3 className="font-bold text-red-900 mb-2">{t('support.emergency.title')}</h3>
                <p className="text-sm text-red-800">{t('support.emergency.text')}</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-6">{t('support.form.title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('support.form.name')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('support.form.email')}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('support.form.pnr')}
                  </label>
                  <input
                    type="text"
                    value={formData.pnr}
                    onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('support.form.subject')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('support.form.message')}
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded transition-colors flex items-center justify-center space-x-2"
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
