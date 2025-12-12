import { ArrowLeft, CheckCircle, Plane, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function About() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen p-8 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            {language === 'fr' ? 'À Propos de BFS' : 'About BFS'}
          </h1>

          <div className="space-y-8 text-white/90">
            {language === 'fr' ? (
              <>
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
                          <h3 className="font-semibold text-white mb-1">Pour les Compagnies</h3>
                          <p className="text-sm">
                            Envoi des manifestes BRS, suivi en temps réel, historique complet des rapports
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-white mb-1">Réconciliation</h3>
                          <p className="text-sm">
                            Comparaison automatique entre bagages annoncés et bagages arrivés
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
                            Protection des données, accès sécurisé, traçabilité complète
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
                            Interface dédiée pour compagnies et superviseurs aéroportuaires
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
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">Our Mission</h2>
                  <p className="text-lg">
                    BFS (Baggage Found Solution) is an innovative baggage management and reconciliation system 
                    designed to simplify and secure baggage tracking in African airports.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">Key Features</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Plane className="w-6 h-6 text-primary-300 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-white mb-1">For Airlines</h3>
                          <p className="text-sm">
                            BRS manifest submission, real-time tracking, complete report history
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-white mb-1">Reconciliation</h3>
                          <p className="text-sm">
                            Automatic comparison between announced and arrived baggage
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Shield className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-white mb-1">Security</h3>
                          <p className="text-sm">
                            Data protection, secure access, complete traceability
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
                            Dedicated interface for airlines and airport supervisors
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">Why BFS?</h2>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p>
                        <strong>Efficiency:</strong> Drastic reduction in manifest processing time
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p>
                        <strong>Transparency:</strong> Complete visibility on each baggage status
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p>
                        <strong>Reliability:</strong> Error reduction through automation
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p>
                        <strong>Compliance:</strong> IATA standards and local regulations compliance
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">Developed by</h2>
                  <p>
                    <strong>African Transport Systems</strong><br />
                    Solution specifically developed to meet the needs of African airports.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-sm">
                      Contact: <a href="mailto:contact@bfs-system.com" className="text-primary-300 hover:text-primary-200">contact@bfs-system.com</a><br />
                      Support: <a href="mailto:support@bfs-system.com" className="text-primary-300 hover:text-primary-200">support@bfs-system.com</a>
                    </p>
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-primary-300 hover:text-primary-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'fr' ? 'Retour' : 'Back'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
