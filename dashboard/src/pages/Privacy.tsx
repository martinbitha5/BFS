export default function Privacy() {
  return (
    <div 
      className="min-h-screen p-8 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            Politique de Confidentialité
          </h1>

          <div className="space-y-6 text-white/90">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Collecte des données</h2>
              <p>
                BFS collecte les données suivantes :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Informations des superviseurs (nom, email, aéroport)</li>
                <li>Données des rapports BRS reçus</li>
                <li>Informations des bagages internationaux</li>
                <li>Logs de réconciliation et d'utilisation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Utilisation des données</h2>
              <p>
                Les données collectées sont utilisées pour :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Gérer la réconciliation des bagages</li>
                <li>Générer des statistiques opérationnelles</li>
                <li>Assurer le suivi des bagages internationaux</li>
                <li>Améliorer le système BFS</li>
                <li>Respecter les obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Partage des données</h2>
              <p>
                Les données ne sont partagées qu'avec :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Les compagnies aériennes concernées</li>
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
                BFS met en œuvre des mesures de sécurité pour protéger vos données contre 
                tout accès non autorisé :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Chiffrement des données sensibles</li>
                <li>Contrôles d'accès par rôle</li>
                <li>Surveillance continue des systèmes</li>
                <li>Sauvegardes régulières et sécurisées</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Durée de conservation</h2>
              <p>
                Les données sont conservées conformément aux obligations légales et aux besoins 
                opérationnels de l'aéroport.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Vos droits</h2>
              <p>
                Vous disposez des droits suivants :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Droit d'accès à vos données</li>
                <li>Droit de rectification</li>
                <li>Droit à l'effacement</li>
                <li>Droit d'opposition au traitement</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits : <strong>privacy@bfs-system.com</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
              <p>
                Le système utilise des cookies essentiels pour l'authentification et la session.
                Aucun cookie publicitaire ou de tracking n'est utilisé.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Modifications</h2>
              <p>
                Cette politique peut être mise à jour. Les modifications importantes seront notifiées.
              </p>
              <p className="mt-2 text-sm text-white/70">
                Dernière mise à jour : Décembre 2024
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
