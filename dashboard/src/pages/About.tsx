import { CheckCircle, Plane, Shield, Users } from 'lucide-react';

export default function About() {
  return (
    <div 
      className="min-h-screen p-8 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            À Propos de BFS
          </h1>

          <div className="space-y-8 text-white/90">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Notre Mission</h2>
              <p className="text-lg">
                BFS (Baggage Found Solution) est un système innovant de gestion et de réconciliation des bagages 
                conçu pour simplifier et sécuriser le suivi des bagages dans les aéroports africains.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Fonctionnalités Principales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Plane className="w-6 h-6 text-primary-300 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Pour les Superviseurs</h3>
                      <p className="text-sm">
                        Consultation des manifestes BIRS, réconciliation, exports Excel, statistiques
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Réconciliation Automatique</h3>
                      <p className="text-sm">
                        Comparaison intelligente entre bagages annoncés et bagages scannés
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Sécurité</h3>
                      <p className="text-sm">
                        Protection des données, accès sécurisé, traçabilité complète des opérations
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Users className="w-6 h-6 text-purple-300 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">Collaboration</h3>
                      <p className="text-sm">
                        Interface dédiée superviseurs + portail compagnies aériennes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Pourquoi BFS ?</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    <strong>Efficacité :</strong> Réduction drastique du temps de traitement des manifestes
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    <strong>Transparence :</strong> Visibilité complète sur le statut de chaque bagage
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    <strong>Fiabilité :</strong> Réduction des erreurs grâce à l'automatisation
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    <strong>Conformité :</strong> Respect des normes IATA et réglementations locales
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Composants du Système</h2>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span><strong>Dashboard Superviseur</strong> - Gestion et réconciliation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span><strong>Portail Compagnies</strong> - Envoi manifestes BIRS</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span><strong>App Mobile</strong> - Scan boarding pass et bagages RFID</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Développé par</h2>
              <p>
                <strong>African Transport Systems</strong><br />
                Solution développée spécifiquement pour répondre aux besoins des aéroports africains.
              </p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm">
                  Contact : <a href="mailto:contact@bfs-system.com" className="text-primary-300 hover:text-primary-200">contact@bfs-system.com</a><br />
                  Support : <a href="mailto:support@bfs-system.com" className="text-primary-300 hover:text-primary-200">support@bfs-system.com</a>
                </p>
              </div>
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
