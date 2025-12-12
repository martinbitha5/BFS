import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function FooterComponent() {
  const { t } = useLanguage();

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="font-semibold mb-4 text-sm tracking-wider">{t('footer.about.title')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-white transition-colors">{t('footer.about.us')}</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">{t('footer.about.news')}</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">{t('footer.about.careers')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-sm tracking-wider">{t('footer.legal.title')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/legal" className="hover:text-white transition-colors">{t('footer.legal.notices')}</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">{t('footer.legal.privacy')}</Link></li>
              <li><Link to="/cookies" className="hover:text-white transition-colors">{t('footer.legal.cookies')}</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">{t('footer.legal.terms')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-sm tracking-wider">{t('footer.support.title')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/faq" className="hover:text-white transition-colors">{t('footer.support.faq')}</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">{t('footer.support.contact')}</Link></li>
            </ul>
          </div>

          {/* Download App */}
          <div>
            <h4 className="font-semibold mb-4 text-sm tracking-wider">{t('footer.app.title')}</h4>
            <div className="space-y-2">
              <a href="#" className="block">
                <div className="bg-white text-black px-4 py-2 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                  {t('footer.app.appstore')}
                </div>
              </a>
              <a href="#" className="block">
                <div className="bg-white text-black px-4 py-2 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                  {t('footer.app.playstore')}
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
