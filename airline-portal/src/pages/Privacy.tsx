import { useLanguage } from '../contexts/LanguageContext';

export default function Privacy() {
  const { language } = useLanguage();

  return (
    <div 
      className="min-h-screen p-8 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            {language === 'fr' ? 'Politique de Confidentialité' : 'Privacy Policy'}
          </h1>

          <div className="space-y-6 text-white/90">
            {language === 'fr' ? (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">1. Collecte des données</h2>
                  <p>
                    BFS collecte les données suivantes :
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Informations de la compagnie (nom, code IATA, email)</li>
                    <li>Données des rapports BIRS (manifestes bagages)</li>
                    <li>Informations de vol (numéro, date, origine, destination)</li>
                    <li>Logs de connexion et d'utilisation du système</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">2. Utilisation des données</h2>
                  <p>
                    Les données collectées sont utilisées pour :
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Gérer la réconciliation des bagages</li>
                    <li>Assurer le suivi des manifestes</li>
                    <li>Générer des statistiques opérationnelles</li>
                    <li>Améliorer les services BFS</li>
                    <li>Respecter les obligations légales et réglementaires</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">3. Partage des données</h2>
                  <p>
                    Les données ne sont partagées qu'avec :
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Les aéroports destinataires (pour la réconciliation)</li>
                    <li>Les autorités compétentes (sur demande légale)</li>
                    <li>Nos prestataires techniques (sous contrat de confidentialité)</li>
                  </ul>
                  <p className="mt-2">
                    Aucune donnée n'est vendue à des tiers.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">4. Sécurité des données</h2>
                  <p>
                    BFS met en œuvre des mesures de sécurité techniques et organisationnelles pour protéger 
                    vos données contre tout accès non autorisé, perte, destruction ou divulgation.
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                    <li>Chiffrement des données en transit et au repos</li>
                    <li>Contrôles d'accès stricts</li>
                    <li>Surveillance continue des systèmes</li>
                    <li>Sauvegardes régulières</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">5. Durée de conservation</h2>
                  <p>
                    Les données sont conservées pendant la durée nécessaire aux fins pour lesquelles elles 
                    ont été collectées, conformément aux obligations légales et réglementaires en vigueur.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">6. Vos droits</h2>
                  <p>
                    Conformément aux réglementations applicables, vous disposez des droits suivants :
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Droit d'accès à vos données</li>
                    <li>Droit de rectification</li>
                    <li>Droit à l'effacement</li>
                    <li>Droit à la portabilité</li>
                    <li>Droit d'opposition au traitement</li>
                  </ul>
                  <p className="mt-2">
                    Pour exercer ces droits, contactez-nous à : <strong>privacy@bfs-system.com</strong>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
                  <p>
                    Le système BFS utilise des cookies essentiels pour le fonctionnement du service 
                    (authentification, session). Aucun cookie publicitaire ou de tracking n'est utilisé.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">8. Modifications</h2>
                  <p>
                    Cette politique peut être mise à jour. Les modifications importantes vous seront 
                    notifiées par email.
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    Dernière mise à jour : Décembre 2024
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">1. Data Collection</h2>
                  <p>
                    BFS collects the following data:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Company information (name, IATA code, email)</li>
                    <li>BIRS report data (baggage manifests)</li>
                    <li>Flight information (number, date, origin, destination)</li>
                    <li>Connection and system usage logs</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">2. Data Usage</h2>
                  <p>
                    Collected data is used to:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Manage baggage reconciliation</li>
                    <li>Track manifests</li>
                    <li>Generate operational statistics</li>
                    <li>Improve BFS services</li>
                    <li>Comply with legal and regulatory obligations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">3. Data Sharing</h2>
                  <p>
                    Data is only shared with:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Destination airports (for reconciliation)</li>
                    <li>Relevant authorities (upon legal request)</li>
                    <li>Our technical providers (under confidentiality agreement)</li>
                  </ul>
                  <p className="mt-2">
                    No data is sold to third parties.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
                  <p>
                    BFS implements technical and organizational security measures to protect 
                    your data against unauthorized access, loss, destruction or disclosure.
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                    <li>Data encryption in transit and at rest</li>
                    <li>Strict access controls</li>
                    <li>Continuous system monitoring</li>
                    <li>Regular backups</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">5. Retention Period</h2>
                  <p>
                    Data is retained for the period necessary for the purposes for which it was collected,
                    in accordance with applicable legal and regulatory obligations.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
                  <p>
                    In accordance with applicable regulations, you have the following rights:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Right of access to your data</li>
                    <li>Right to rectification</li>
                    <li>Right to erasure</li>
                    <li>Right to portability</li>
                    <li>Right to object to processing</li>
                  </ul>
                  <p className="mt-2">
                    To exercise these rights, contact us at: <strong>privacy@bfs-system.com</strong>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
                  <p>
                    The BFS system uses essential cookies for service operation 
                    (authentication, session). No advertising or tracking cookies are used.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-3">8. Updates</h2>
                  <p>
                    This policy may be updated. Significant changes will be notified to you via email.
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    Last updated: December 2024
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
