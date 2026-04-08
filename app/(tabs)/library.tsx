import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, SectionList,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import AnimatedPressable from '../../components/AnimatedPressable';
import { getAllPeptides, searchPeptides, type Peptide } from '../../lib/database';

const CATEGORY_ICONS: Record<string, string> = {
  'GLP-1': 'trending-down-outline',
  'Healing': 'bandage-outline',
  'Growth Hormone': 'arrow-up-outline',
  'Cognitive': 'brain-outline',
  'Immune': 'shield-checkmark-outline',
  'Longevity': 'hourglass-outline',
  'Sexual Health': 'heart-outline',
  'Fat Loss': 'flame-outline',
  'Metabolic': 'analytics-outline',
  'Performance': 'fitness-outline',
  'Sleep': 'moon-outline',
  'Skin': 'sparkles-outline',
  'Hair': 'cut-outline',
  'Reproductive': 'medkit-outline',
};

export default function LibraryScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<{ title: string; data: Peptide[] }[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadPeptides();
    }, [])
  );

  const loadPeptides = async (search?: string) => {
    const peptides = search ? await searchPeptides(search) : await getAllPeptides();
    const grouped = peptides.reduce<Record<string, Peptide[]>>((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});

    setSections(
      Object.entries(grouped)
        .map(([title, data]) => ({ title, data }))
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    loadPeptides(text || undefined);
  };

  const formatDoseRange = (low: number | null, high: number | null): string => {
    if (!low && !high) return 'N/A';
    const format = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}mg` : `${v}mcg`;
    if (low && high && low !== high) return `${format(low)} - ${format(high)}`;
    return format(low || high || 0);
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search peptides..."
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeader}>
            <Ionicons
              name={(CATEGORY_ICONS[title] || 'flask-outline') as any}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionCount}>{data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <AnimatedPressable
            style={styles.card}
            onPress={() => router.push(`/peptide/${item.id}`)}
            haptic="light"
            scaleDown={0.98}
          >
            <View style={styles.cardMain}>
              <Text style={styles.peptideName}>{item.name}</Text>
              <Text style={styles.peptideDesc} numberOfLines={1}>{item.description}</Text>
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Dose</Text>
                <Text style={styles.metaValue}>
                  {formatDoseRange(item.typical_dose_mcg_low, item.typical_dose_mcg_high)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Freq</Text>
                <Text style={styles.metaValue}>{item.frequency || 'N/A'}</Text>
              </View>
              {item.half_life_hours !== null && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>t½</Text>
                  <Text style={styles.metaValue}>
                    {item.half_life_hours >= 24
                      ? `${(item.half_life_hours / 24).toFixed(0)}d`
                      : `${item.half_life_hours}h`
                    }
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </AnimatedPressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No peptides found</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchWrapper: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      marginHorizontal: Spacing.lg, marginVertical: Spacing.md,
      paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: colors.inputBorder,
    },
    searchInput: {
      flex: 1, fontSize: FontSize.md, color: colors.text,
      paddingVertical: Spacing.md,
    },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.md, marginTop: Spacing.sm,
    },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },
    sectionCount: {
      fontSize: FontSize.xs, color: colors.textTertiary,
      backgroundColor: colors.surface, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 2,
    },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.md, marginBottom: Spacing.sm,
    },
    cardMain: { flex: 1, marginRight: Spacing.md },
    peptideName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
    peptideDesc: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
    cardMeta: { flexDirection: 'row', gap: Spacing.md, marginRight: Spacing.sm },
    metaItem: { alignItems: 'center' },
    metaLabel: { fontSize: 9, color: colors.textTertiary, textTransform: 'uppercase', fontWeight: '600' },
    metaValue: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '500' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: FontSize.md, color: colors.textTertiary, marginTop: Spacing.md },
  });
}
