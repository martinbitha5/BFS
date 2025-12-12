export default function Legal() {

  return (
    <div 
      className="min-h-screen p-8 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            Mentions Légales
          </h1>

          <div className="space-y-6 text-white/90">
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
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <a href="/" className="text-primary-300 hover:text-primary-200">
              ← Retour au tableau de bord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
