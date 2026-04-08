import React from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { getTemplatesByCategory, type ProtocolTemplate } from '../../lib/protocolTemplates';

export default function TemplatesScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const sections = getTemplatesByCategory();

  const styles = makeStyles(colors);

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Ionicons name={section.icon as any} size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: '/protocol/template-detail', params: { id: item.id } })}
        >
          <View style={styles.cardTop}>
            <Ionicons name={item.icon as any} size={22} color={colors.primary} />
            <View style={styles.cardTitleArea}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.badges}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.peptides.length} peptide{item.peptides.length > 1 ? 's' : ''}</Text>
                </View>
                {item.durationWeeks > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.durationWeeks}w</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      marginTop: Spacing.lg, marginBottom: Spacing.sm,
    },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.sm,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
    cardTitleArea: { flex: 1 },
    cardName: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    badges: { flexDirection: 'row', gap: 6, marginTop: 4 },
    badge: {
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.full,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    badgeText: { fontSize: 10, fontWeight: '600', color: colors.primary },
    description: { fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  });
}
