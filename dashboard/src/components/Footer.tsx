import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto py-4 md:py-6 border-t border-white/20 bg-black/20">
      <div className="max-w-7xl mx-auto px-3 md:px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-4">
          {/* Colonne 1: BFS */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">BFS System</h3>
            <p className="text-xs text-white/70">
              Baggage Found Solution - Dashboard Superviseur
            </p>
          </div>

          {/* Colonne 2: Liens légaux */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Informations Légales</h3>
            <ul className="space-y-1">
              <li>
                <Link to="/legal" className="text-xs text-white/70 hover:text-white">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-xs text-white/70 hover:text-white">
                  CGU
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-xs text-white/70 hover:text-white">
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3: À propos */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">À Propos</h3>
            <ul className="space-y-1">
              <li>
                <Link to="/about" className="text-xs text-white/70 hover:text-white">
                  À propos de BFS
                </Link>
              </li>
              <li>
                <a href="mailto:contact@bfs-system.com" className="text-xs text-white/70 hover:text-white">
                  contact@bfs-system.com
                </a>
              </li>
              <li>
                <a href="mailto:support@brsats.com" className="text-xs text-white/70 hover:text-white">
                  support@brsats.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/60">
            © 2024 BFS System - African Transport Systems. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
