import { useLanguage } from '../contexts/LanguageContext';

export default function Legal() {
  const { t, language } = useLanguage();

  return (
    <div 
      className="min-h-screen p-8 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            {language === 'fr' ? 'Mentions Légales' : 'Legal Notice'}
          </h1>

          <div className="space-y-6 text-white/90">
            {language === 'fr' ? (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Éditeur du système</h2>
                  <p>
                    <strong>Nom :</strong> BFS - Baggage Found Solution<br />
                    <strong>Raison sociale :</strong> African Transport Systems<br />
                    <strong>Siège social :</strong> Kinshasa, République Démocratique du Congo<br />
                    <strong>Email :</strong> contact@bfs-system.com
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Directeur de publication</h2>
                  <p>African Transport Systems</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Hébergement</h2>
                  <p>
                    Le système BFS est hébergé sur des serveurs sécurisés.<br />
                    Les données sont stockées en conformité avec les réglementations internationales.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Propriété intellectuelle</h2>
                  <p>
                    L'ensemble du système BFS (code source, interface, logos, documentation) est protégé par les droits d'auteur.
                    Toute reproduction, même partielle, est strictement interdite sans autorisation préalable.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Données personnelles</h2>
                  <p>
                    Conformément aux réglementations en vigueur, vous disposez d'un droit d'accès, de rectification 
                    et de suppression des données vous concernant. Pour exercer ce droit, contactez-nous à : 
                    <strong> privacy@bfs-system.com</strong>
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">System Publisher</h2>
                  <p>
                    <strong>Name:</strong> BFS - Baggage Found Solution<br />
                    <strong>Company:</strong> African Transport Systems<br />
                    <strong>Headquarters:</strong> Kinshasa, Democratic Republic of Congo<br />
                    <strong>Email:</strong> contact@bfs-system.com
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Publication Director</h2>
                  <p>African Transport Systems</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Hosting</h2>
                  <p>
                    The BFS system is hosted on secure servers.<br />
                    Data is stored in compliance with international regulations.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Intellectual Property</h2>
                  <p>
                    The entire BFS system (source code, interface, logos, documentation) is protected by copyright.
                    Any reproduction, even partial, is strictly prohibited without prior authorization.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">Personal Data</h2>
                  <p>
                    In accordance with current regulations, you have the right to access, rectify and delete 
                    your personal data. To exercise this right, contact us at: 
                    <strong> privacy@bfs-system.com</strong>
                  </p>
                </section>
              </>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <a href="/" className="text-primary-300 hover:text-primary-200">
              {language === 'fr' ? '← Retour à l\'accueil' : '← Back to home'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
