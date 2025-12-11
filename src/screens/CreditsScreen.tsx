import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Credits'>;

interface CreditSection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  members: string[];
}

const CREDIT_SECTIONS: CreditSection[] = [
  {
    title: 'Développement & Intégration',
    icon: 'code-slash',
    members: ['Martin Bitha Moponda – Développeur (ATS)', 'martinbitha@yahoo.fr'],
  },
  {
    title: 'Conception & Supervision du Projet',
    icon: 'briefcase',
    members: ['Équipe ATS', 'Direction Technique ATS'],
  },
  {
    title: 'Design & UI/UX',
    icon: 'color-palette',
    members: ['Équipe ATS', 'Martin Bitha Moponda'],
  },
  {
    title: 'Tests & Validation',
    icon: 'checkmark-done-circle',
    members: ['Équipe ATS', 'Agents terrain ATS'],
  },
  {
    title: 'Infrastructure & Hébergement',
    icon: 'cloud-done',
    members: ['ATS / Supabase', 'PostgreSQL Database', 'SQLite Local Storage'],
  },
];

export default function CreditsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleWebsitePress = () => {
    Linking.openURL('http://ats-handling-rdc.com');
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:contact@ats-handling-rdc.com');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.default }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { backgroundColor: colors.primary.main, paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={48} color={colors.primary.contrast} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.primary.contrast }]}>Crédits</Text>
        <Text style={[styles.headerSubtitle, { color: colors.primary.contrast + 'CC' }]}>
          L&apos;équipe derrière BFS
        </Text>
      </View>

      <View style={styles.content}>
        {/* À propos de l'application */}
        <Card style={styles.card}>
          <View style={styles.appInfoSection}>
            <View style={[styles.appIcon, { backgroundColor: colors.primary.light + '20' }]}>
              <Ionicons name="airplane" size={40} color={colors.primary.main} />
            </View>
            <Text style={[styles.appName, { color: colors.text.primary }]}>BFS - Baggage Flow System</Text>
            <Text style={[styles.appVersion, { color: colors.text.secondary }]}>Version 1.0.0 (2024)</Text>
            <Text style={[styles.appDescription, { color: colors.text.secondary }]}>
              Solution complète de gestion des bagages et passagers pour AFRICAN TRANSPORT SYSTEMS
            </Text>
          </View>
        </Card>

        {/* Sections de crédits */}
        {CREDIT_SECTIONS.map((section, index) => (
          <Card key={index} style={styles.card}>
            <View style={styles.creditSection}>
              <View style={styles.creditHeader}>
                <Ionicons name={section.icon} size={24} color={colors.primary.main} />
                <Text style={[styles.creditTitle, { color: colors.text.primary }]}>{section.title}</Text>
              </View>
              <View style={styles.creditMembers}>
                {section.members.map((member, memberIndex) => (
                  <View key={memberIndex} style={styles.creditMemberItem}>
                    <Ionicons name="ellipse" size={8} color={colors.primary.main} />
                    <Text style={[styles.creditMemberText, { color: colors.text.secondary }]}>
                      {member}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        ))}

        {/* Remerciements spéciaux */}
        <Card style={[styles.card, { backgroundColor: colors.primary.light + '10' }]}>
          <View style={styles.thanksContent}>
            <Ionicons name="heart" size={32} color={colors.primary.main} />
            <Text style={[styles.thanksTitle, { color: colors.text.primary }]}>Remerciements spéciaux</Text>
            <Text style={[styles.thanksText, { color: colors.text.secondary }]}>
              Toute l&apos;équipe ATS pour le soutien dans le développement de l&apos;application.
            </Text>
            <Text style={[styles.thanksText, { color: colors.text.secondary }]}>
              Merci aux agents terrain qui utilisent quotidiennement BFS et contribuent à son amélioration continue.
            </Text>
          </View>
        </Card>

        {/* Contact ATS */}
        <Card style={styles.card}>
          <View style={styles.contactSection}>
            <Text style={[styles.contactTitle, { color: colors.text.primary }]}>Contact</Text>
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: colors.primary.light + '15' }]}
                onPress={handleWebsitePress}
                activeOpacity={0.7}>
                <Ionicons name="globe" size={20} color={colors.primary.main} />
                <Text style={[styles.contactButtonText, { color: colors.primary.main }]}>ats-handling-rdc.com</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: colors.primary.light + '15' }]}
                onPress={handleEmailPress}
                activeOpacity={0.7}>
                <Ionicons name="mail" size={20} color={colors.primary.main} />
                <Text style={[styles.contactButtonText, { color: colors.primary.main }]}>contact@ats-handling-rdc.com</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Copyright */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>
            © {new Date().getFullYear()} AFRICAN TRANSPORT SYSTEMS
          </Text>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>
            Tous droits réservés
          </Text>
        </View>
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
  card: {
    marginBottom: Spacing.lg,
  },
  appInfoSection: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  appVersion: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
  },
  appDescription: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  creditSection: {
    padding: Spacing.xs,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  creditTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    flex: 1,
  },
  creditMembers: {
    gap: Spacing.sm,
    marginLeft: Spacing.lg,
  },
  creditMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  creditMemberText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
    flex: 1,
  },
  thanksContent: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  thanksTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  thanksText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  contactSection: {
    padding: Spacing.xs,
  },
  contactTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  contactButtons: {
    gap: Spacing.md,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  contactButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSizes.sm,
  },
});
