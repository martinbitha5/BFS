export default function Terms() {
  return (
    <div 
      className="min-h-screen p-8 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            Conditions Générales d'Utilisation
          </h1>

          <div className="space-y-6 text-white/90">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Objet</h2>
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation 
                du système BFS (Baggage Found Solution) par les superviseurs aéroportuaires.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Accès au service</h2>
              <p>
                L'accès au système BFS est réservé aux superviseurs disposant d'un compte validé.
                Chaque superviseur est responsable de la confidentialité de ses identifiants de connexion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Utilisation du service</h2>
              <p>
                Le système BFS permet aux superviseurs de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Consulter les rapports BIRS reçus des compagnies</li>
                <li>Effectuer la réconciliation des bagages</li>
                <li>Générer des statistiques et des exports</li>
                <li>Suivre les bagages internationaux</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Obligations des superviseurs</h2>
              <p>
                Les superviseurs s'engagent à :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Traiter les données avec confidentialité</li>
                <li>Effectuer la réconciliation dans les délais</li>
                <li>Signaler toute anomalie détectée</li>
                <li>Ne pas divulguer les données à des tiers non autorisés</li>
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
                Les données traitées sont confidentielles et protégées conformément à notre politique 
                de confidentialité.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Modification des CGU</h2>
              <p>
                BFS se réserve le droit de modifier ces CGU à tout moment. Les superviseurs seront 
                informés des modifications importantes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Résiliation</h2>
              <p>
                L'accès au système peut être suspendu ou résilié en cas de non-respect des présentes CGU.
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
