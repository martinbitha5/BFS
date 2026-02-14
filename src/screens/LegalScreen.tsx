import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { FontSizes, FontWeights, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

export default function LegalScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.default }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        <Card style={styles.section}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Mentions légales</Text>
          <Text style={[styles.lastUpdated, { color: colors.text.secondary }]}>Dernière mise à jour : Janvier 2024</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Éditeur de l&apos;application</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            L&apos;application Police Bagages est éditée par :
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            <Text style={[styles.bold, { color: colors.text.primary }]}>AFRICAN TRANSPORT SYSTEMS</Text>{'\n'}
            AFRICAN TRANSPORT HANDLING{'\n'}
            11ème niveau, Immeuble Equity BCDC{'\n'}
            Numéro 15, Boulevard du 30 juin{'\n'}
            Commune de GOMBE{'\n'}
            Kinshasa, République Démocratique du Congo
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Téléphone : +243 819 929 881{'\n'}
            Email : support@brsats.com{'\n'}
            Site web : https://brsats.com
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. À propos d&apos;ATS</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            AFRICAN TRANSPORT HANDLING fait partie d&apos;un grand Groupe : AFRICAN TRANSPORT SYSTEMS. 
            Le groupe comprend en son sein plusieurs autres sociétés qui travaillent pour le développement 
            de l&apos;Afrique en général.
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            ATS Handling est spécialisé dans les services d&apos;assistance aéroportuaire, incluant 
            l&apos;assistance au sol, la manutention des bagages, le traitement des cargos, la sûreté 
            aéroportuaire, la maintenance, le support informatique, le cleaning, le catering et 
            la restauration.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. Propriété intellectuelle</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            L&apos;ensemble du contenu de l&apos;application Police Bagages (textes, images, vidéos, logos, icônes, etc.) 
            est la propriété exclusive d&apos;AFRICAN TRANSPORT SYSTEMS ou de ses partenaires, sauf mention 
            contraire.
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
            des éléments de l&apos;application, quel que soit le moyen ou le procédé utilisé, est interdite, 
            sauf autorisation écrite préalable d&apos;AFRICAN TRANSPORT SYSTEMS.
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Les marques, logos et signes distinctifs présents dans l&apos;application sont la propriété exclusive 
            d&apos;AFRICAN TRANSPORT SYSTEMS ou de ses partenaires. Toute reproduction non autorisée de ces 
            éléments constitue une contrefaçon passible de sanctions pénales.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Protection des données personnelles</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi 
            Informatique et Libertés, vous disposez d&apos;un droit d&apos;accès, de rectification, de 
            suppression et d&apos;opposition aux données personnelles vous concernant.
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Pour exercer ces droits, vous pouvez nous contacter à l&apos;adresse suivante : 
            support@brsats.com
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Les données collectées dans le cadre de l&apos;utilisation de l&apos;application sont traitées 
            conformément à notre politique de confidentialité. Elles sont utilisées uniquement 
            dans le cadre de la gestion des opérations aéroportuaires et ne sont pas transmises 
            à des tiers sans votre consentement.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>6. Responsabilité</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            AFRICAN TRANSPORT SYSTEMS s&apos;efforce de fournir sur l&apos;application Police Bagages des informations aussi 
            précises que possible. Toutefois, il ne pourra être tenu responsable des omissions, des 
            inexactitudes et des carences dans la mise à jour, qu&apos;elles soient de son fait ou du fait 
            des tiers partenaires qui lui fournissent ces informations.
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Toutes les informations indiquées sur l&apos;application sont données à titre indicatif, et sont 
            susceptibles d&apos;évoluer. Par ailleurs, les renseignements figurant sur l&apos;application ne sont 
            pas exhaustifs. Ils sont donnés sous réserve de modifications ayant été apportées depuis leur 
            mise en ligne.
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            AFRICAN TRANSPORT SYSTEMS ne pourra être tenu responsable des dommages directs ou indirects 
            causés au matériel de l&apos;utilisateur lors de l&apos;accès à l&apos;application, et résultant soit de 
            l&apos;utilisation d&apos;un matériel ne répondant pas aux spécifications, soit de l&apos;apparition d&apos;un bug 
            ou d&apos;une incompatibilité.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>7. Cookies et traceurs</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            L&apos;application Police Bagages peut utiliser des cookies ou des technologies similaires pour améliorer 
            l&apos;expérience utilisateur et analyser l&apos;utilisation de l&apos;application. Ces cookies sont 
            utilisés uniquement dans le cadre technique de l&apos;application et ne sont pas utilisés à des 
            fins publicitaires.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>8. Droit applicable</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Les présentes mentions légales sont régies par le droit de la République Démocratique du Congo. 
            En cas de litige et à défaut d&apos;accord amiable, le litige sera porté devant les tribunaux 
            compétents de Kinshasa conformément aux règles de compétence en vigueur.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>9. Contact</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            Pour toute question concernant les présentes mentions légales, vous pouvez nous contacter :
          </Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            <Text style={[styles.bold, { color: colors.text.primary }]}>Par email :</Text> support@brsats.com{'\n'}
            <Text style={[styles.bold, { color: colors.text.primary }]}>Par téléphone :</Text> +243 819 929 881{'\n'}
            <Text style={[styles.bold, { color: colors.text.primary }]}>Par courrier :</Text>{'\n'}
            AFRICAN TRANSPORT SYSTEMS{'\n'}
            11ème niveau, Immeuble Equity BCDC{'\n'}
            Numéro 15, Boulevard du 30 juin{'\n'}
            Commune de GOMBE, Kinshasa{'\n'}
            République Démocratique du Congo
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>10. Modifications</Text>
          <Text style={[styles.text, { color: colors.text.secondary }]}>
            AFRICAN TRANSPORT SYSTEMS se réserve le droit de modifier les présentes mentions légales à tout 
            moment. L&apos;utilisateur est invité à les consulter de manière régulière.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  lastUpdated: {
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  text: {
    fontSize: FontSizes.md,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  bold: {
    fontWeight: FontWeights.bold,
  },
});

