import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { language } = useLanguage();

  return (
    <footer className="mt-auto py-6 border-t border-white/20 bg-black/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          {/* Colonne 1: BFS */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">BFS System</h3>
            <p className="text-xs text-white/70">
              {language === 'fr' 
                ? 'Baggage Found Solution - Gestion des bagages aéroportuaires'
                : 'Baggage Found Solution - Airport baggage management'
              }
            </p>
          </div>

          {/* Colonne 2: Liens légaux */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              {language === 'fr' ? 'Informations Légales' : 'Legal Information'}
            </h3>
            <ul className="space-y-1">
              <li>
                <Link to="/legal" className="text-xs text-white/70 hover:text-white">
                  {language === 'fr' ? 'Mentions légales' : 'Legal notice'}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-xs text-white/70 hover:text-white">
                  {language === 'fr' ? 'CGU' : 'Terms of Service'}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-xs text-white/70 hover:text-white">
                  {language === 'fr' ? 'Confidentialité' : 'Privacy Policy'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3: À propos */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              {language === 'fr' ? 'À Propos' : 'About'}
            </h3>
            <ul className="space-y-1">
              <li>
                <Link to="/about" className="text-xs text-white/70 hover:text-white">
                  {language === 'fr' ? 'À propos de BFS' : 'About BFS'}
                </Link>
              </li>
              <li>
                <a href="mailto:contact@bfs-system.com" className="text-xs text-white/70 hover:text-white">
                  contact@bfs-system.com
                </a>
              </li>
              <li>
                <a href="mailto:support@bfs-system.com" className="text-xs text-white/70 hover:text-white">
                  support@bfs-system.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/60">
            © 2024 BFS System - African Transport Systems. {language === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
