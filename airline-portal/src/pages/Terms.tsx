import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Terms() {
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
            {language === 'fr' ? 'Conditions Générales d\'Utilisation' : 'Terms of Service'}
          </h1>

          <div className="space-y-6 text-white/90">
            {language === 'fr' ? (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">1. Objet</h2>
                  <p>
                    Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation 
                    du système BFS (Baggage Found Solution) par les compagnies aériennes partenaires.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">2. Accès au service</h2>
                  <p>
                    L'accès au système BFS est réservé aux compagnies aériennes disposant d'un compte validé.
                    Chaque compagnie est responsable de la confidentialité de ses identifiants de connexion.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">3. Utilisation du service</h2>
                  <p>
                    Le système BFS permet aux compagnies aériennes de :
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Transmettre les rapports BRS (manifestes bagages)</li>
                    <li>Consulter l'historique de leurs envois</li>
                    <li>Suivre le statut de réconciliation des bagages</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">4. Obligations des compagnies</h2>
                  <p>
                    Les compagnies aériennes s'engagent à :
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Fournir des informations exactes et à jour</li>
                    <li>Transmettre les rapports BRS dans les délais convenus</li>
                    <li>Respecter les formats de fichiers spécifiés</li>
                    <li>Ne pas tenter d'accéder à des données non autorisées</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">5. Responsabilités</h2>
                  <p>
                    BFS s'engage à assurer la disponibilité du système dans la mesure du possible.
                    Toutefois, BFS ne peut être tenu responsable des interruptions de service dues à 
                    des cas de force majeure ou à des problèmes techniques indépendants de sa volonté.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">6. Protection des données</h2>
                  <p>
                    Les données transmises sont traitées conformément à notre politique de confidentialité.
                    BFS s'engage à protéger les informations contre tout accès non autorisé.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">7. Modification des CGU</h2>
                  <p>
                    BFS se réserve le droit de modifier ces CGU à tout moment. Les compagnies seront 
                    informées des modifications par email.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">8. Résiliation</h2>
                  <p>
                    L'accès au système peut être suspendu ou résilié en cas de non-respect des présentes CGU.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">1. Purpose</h2>
                  <p>
                    These Terms of Service govern access to and use of the BFS (Baggage Found Solution) 
                    system by partner airlines.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">2. Service Access</h2>
                  <p>
                    Access to the BFS system is reserved for airlines with a validated account.
                    Each airline is responsible for maintaining the confidentiality of their login credentials.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">3. Service Usage</h2>
                  <p>
                    The BFS system allows airlines to:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Submit BRS reports (baggage manifests)</li>
                    <li>View their submission history</li>
                    <li>Track baggage reconciliation status</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">4. Airline Obligations</h2>
                  <p>
                    Airlines commit to:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Provide accurate and up-to-date information</li>
                    <li>Submit BRS reports within agreed timeframes</li>
                    <li>Comply with specified file formats</li>
                    <li>Not attempt to access unauthorized data</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">5. Responsibilities</h2>
                  <p>
                    BFS commits to ensuring system availability as much as possible.
                    However, BFS cannot be held responsible for service interruptions due to 
                    force majeure or technical issues beyond its control.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">6. Data Protection</h2>
                  <p>
                    Transmitted data is processed in accordance with our privacy policy.
                    BFS commits to protecting information against unauthorized access.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">7. Terms Modification</h2>
                  <p>
                    BFS reserves the right to modify these Terms at any time. Airlines will be 
                    notified of changes via email.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">8. Termination</h2>
                  <p>
                    System access may be suspended or terminated for non-compliance with these Terms.
                  </p>
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
