import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FAQ'>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'Comment scanner un code-barres de carte d\'embarquement ?',
    answer: 'Pour scanner un code-barres, ouvrez l\'écran Check-in, appuyez sur le bouton scanner et pointez la caméra vers le code-barres de la carte d\'embarquement. L\'application détectera automatiquement le code et enregistrera les informations du passager. Cette fonctionnalité permet d\'accélérer le processus d\'enregistrement et de réduire les erreurs de saisie manuelle.',
  },
  {
    id: '2',
    question: 'Comment enregistrer un bagage avec un tag RFID ?',
    answer: 'Dans l\'écran Gestion des Bagages, utilisez le scanner RFID pour lire le tag du bagage. L\'application associera automatiquement le bagage au passager correspondant. Assurez-vous que le tag RFID est bien positionné et lisible. Cette technologie permet un suivi précis des bagages tout au long du processus de manutention.',
  },
  {
    id: '3',
    question: 'Que faire si je n\'ai pas de connexion internet ?',
    answer: 'L\'application BFS fonctionne en mode hors ligne. Toutes les données sont enregistrées localement dans la base de données SQLite et seront synchronisées automatiquement dès que la connexion sera rétablie. Vous pouvez continuer à travailler normalement sans internet, ce qui est essentiel pour les opérations aéroportuaires où la connectivité peut être intermittente.',
  },
  {
    id: '4',
    question: 'Dans quels aéroports ATS Handling opère-t-il ?',
    answer: 'AFRICAN TRANSPORT SYSTEMS opère dans plusieurs aéroports de la République Démocratique du Congo : Kinshasa (N\'djili), Kisangani, Goma, Lubumbashi, Kolwezi, Kananga, Mbuyi-Mayi, Gemena et Mbandaka. L\'application BFS est utilisée dans tous ces aéroports pour assurer une gestion cohérente et efficace des opérations de manutention.',
  },
  {
    id: '5',
    question: 'Comment exporter les données pour les rapports ?',
    answer: 'Les superviseurs peuvent exporter les données depuis l\'écran de Supervision. Les données peuvent être exportées au format Excel ou CSV. L\'export inclut toutes les informations des passagers, bagages et statuts d\'embarquement. Ces rapports sont essentiels pour l\'analyse des performances et la conformité réglementaire.',
  },
  {
    id: '6',
    question: 'Qu\'est-ce que la synchronisation automatique ?',
    answer: 'La synchronisation automatique permet de transférer automatiquement les données locales vers le serveur central d\'ATS lorsque vous êtes connecté à internet. Cette fonctionnalité garantit que toutes les données sont à jour et accessibles depuis n\'importe quel point d\'accès. Vous pouvez activer ou désactiver cette fonctionnalité dans les Paramètres.',
  },
  {
    id: '7',
    question: 'Comment signaler un problème technique ?',
    answer: 'Pour signaler un problème technique, vous pouvez contacter le support via l\'écran Paramètres > Contact support ou directement par email à support@brsats.com. Veuillez inclure une description détaillée du problème et, si possible, une capture d\'écran.',
  },
  {
    id: '8',
    question: 'Quels sont les différents rôles dans l\'application BFS ?',
    answer: 'L\'application propose plusieurs rôles spécialisés : Check-in (enregistrement des passagers), Bagages (gestion et suivi des bagages), Embarquement (validation de l\'embarquement), Arrivée (confirmation de l\'arrivée des bagages), et Superviseur (accès à toutes les fonctionnalités, statistiques et rapports). Chaque rôle a des permissions spécifiques pour garantir la sécurité et l\'efficacité des opérations.',
  },
  {
    id: '9',
    question: 'Comment réinitialiser mon mot de passe ?',
    answer: 'Pour réinitialiser votre mot de passe, contactez votre administrateur système ou le support à support@brsats.com. Les mots de passe sont gérés de manière centralisée pour garantir la sécurité des données sensibles liées aux opérations aéroportuaires.',
  },
  {
    id: '10',
    question: 'L\'application conserve-t-elle un historique des actions ?',
    answer: 'Oui, l\'application BFS conserve un historique complet de toutes les actions effectuées (audit trail). Cet historique inclut qui a effectué quelle action, quand et sur quelles données. Cet historique est accessible aux superviseurs et permet de tracer toutes les opérations pour des raisons de sécurité, de conformité et de qualité de service.',
  },
  {
    id: '11',
    question: 'Quels services ATS Handling propose-t-il ?',
    answer: 'AFRICAN TRANSPORT HANDLING propose une gamme complète de services aéroportuaires : assistance au sol, traitement des cargos, manutention des bagages, sûreté aéroportuaire, maintenance, support informatique, cleaning, catering et restauration. L\'application BFS est spécialement conçue pour optimiser la gestion de ces services.',
  },
  {
    id: '12',
    question: 'Qui sont les partenaires d\'ATS Handling ?',
    answer: 'ATS Handling travaille avec de nombreux partenaires prestigieux, notamment RVA (Régie des Voies Aériennes), RAWBANK, AAC, Royal Air Maroc, Ethiopian Airlines, Turkish Airlines, ASKY, Air Côte d\'Ivoire et TAAG. L\'application BFS assure une intégration fluide avec les systèmes de ces partenaires.',
  },
];

export default function FAQScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };


  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.default }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { backgroundColor: colors.primary.main, paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.headerIcon}>
          <Ionicons name="help-circle" size={48} color={colors.primary.contrast} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.primary.contrast }]}>Questions fréquentes</Text>
        <Text style={[styles.headerSubtitle, { color: colors.primary.contrast + 'CC' }]}>
          Trouvez des réponses aux questions les plus courantes
        </Text>
      </View>

      <View style={styles.content}>
        {FAQ_DATA.map((item, index) => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <Card key={item.id} style={[styles.faqCard, index === 0 && styles.firstCard]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleItem(item.id)}
                style={styles.faqHeader}>
                <View style={styles.faqHeaderContent}>
                  <View style={[styles.questionNumber, { backgroundColor: colors.primary.light + '20' }]}>
                    <Text style={[styles.questionNumberText, { color: colors.primary.main }]}>{index + 1}</Text>
                  </View>
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  <Text style={[styles.questionText, { color: colors.text.primary }]}>{item.question}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.primary.main}
                />
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.answerContainer}>
                  <View style={[styles.answerLine, { backgroundColor: colors.primary.light }]} />
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  <Text style={[styles.answerText, { color: colors.text.secondary }]}>{item.answer}</Text>
                </View>
              )}
            </Card>
          );
        })}

        <Card style={[styles.helpCard, { backgroundColor: colors.primary.light + '10' }]}>
          <View style={styles.helpContent}>
            <Ionicons name="mail-outline" size={32} color={colors.primary.main} />
            <Text style={[styles.helpTitle, { color: colors.text.primary }]}>Besoin d&apos;aide supplémentaire ?</Text>
            <Text style={[styles.helpText, { color: colors.text.secondary }]}>
              Si vous ne trouvez pas la réponse à votre question, n&apos;hésitez pas à contacter notre équipe de support ATS.
            </Text>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactText, { color: colors.text.secondary }]}>
                <Text style={[styles.contactLabel, { color: colors.text.primary }]}>Email :</Text> support@brsats.com
              </Text>
              <Text style={[styles.contactText, { color: colors.text.secondary }]}>
                <Text style={[styles.contactLabel, { color: colors.text.primary }]}>Téléphone :</Text> +243 819 929 881
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.helpButton, { backgroundColor: colors.primary.main }]}
              activeOpacity={0.7}
              onPress={() => {}}>
              <Text style={[styles.helpButtonText, { color: colors.primary.contrast }]}>Contacter le support</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  faqCard: {
    marginBottom: Spacing.md,
  },
  firstCard: {
    marginTop: 0,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  questionNumberText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  questionText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    lineHeight: 22,
  },
  answerContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  answerLine: {
    height: 2,
    width: 40,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  answerText: {
    fontSize: FontSizes.md,
    lineHeight: 24,
  },
  helpCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  helpContent: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  helpTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  helpButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  helpButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  contactInfo: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  contactText: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  contactLabel: {
    fontWeight: FontWeights.semibold,
  },
});

