import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SectionList, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import AnimatedPressable from '../../components/AnimatedPressable';
import { getAllPeptides, type Peptide } from '../../lib/database';

const CATEGORY_ICONS: Record<string, string> = {
  'GLP-1': 'trending-down-outline',
  'Healing': 'bandage-outline',
  'Growth Hormone': 'arrow-up-outline',
  'Cognitive': 'bulb-outline',
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
  const [allPeptides, setAllPeptides] = useState<Peptide[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sections, setSections] = useState<{ title: string; data: Peptide[] }[]>([]);

  useFocusEffect(useCallback(() => {
    getAllPeptides().then(setAllPeptides);
  }, []));

  // Derive sections from current filters
  React.useEffect(() => {
    const matchQuery = query.trim().toLowerCase();
    const filtered = allPeptides.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (matchQuery) {
        const hay = `${p.name} ${p.category} ${p.description ?? ''}`.toLowerCase();
        if (!hay.includes(matchQuery)) return false;
      }
      return true;
    });
    const grouped = filtered.reduce<Record<string, Peptide[]>>((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});
    setSections(
      Object.entries(grouped)
        .map(([title, data]) => ({ title, data }))
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  }, [allPeptides, query, selectedCategory]);

  const handleSearch = (text: string) => {
    setQuery(text);
  };

  const allCategories = React.useMemo(() => {
    return Array.from(new Set(allPeptides.map((p) => p.category))).sort();
  }, [allPeptides]);

  const formatDoseRange = (low: number | null, high: number | null): string => {
    if (!low && !high) return '—';
    const format = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}mg` : `${v}mcg`;
    if (low && high && low !== high) return `${format(low)}–${format(high)}`;
    return format(low || high || 0);
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
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
          <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.catChip, selectedCategory == null && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catChipText, selectedCategory == null && styles.catChipTextActive]}>All</Text>
          </TouchableOpacity>
          {allCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => setSelectedCategory(isActive ? null : cat)}
              >
                <Ionicons
                  name={(CATEGORY_ICONS[cat] || 'flask-outline') as any}
                  size={12}
                  color={isActive ? '#ffffff' : colors.primary}
                />
                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons
                name={(CATEGORY_ICONS[title] || 'flask-outline') as any}
                size={14}
                color={colors.primary}
              />
            </View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{data.length}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <AnimatedPressable
            style={styles.card}
            onPress={() => router.push(`/peptide/${item.id}`)}
            haptic="light" scaleDown={0.98}
          >
            <View style={styles.cardMain}>
              <Text style={styles.peptideName}>{item.name}</Text>
              <Text style={styles.peptideDesc} numberOfLines={1}>{item.description}</Text>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.metaValue}>
                {formatDoseRange(item.typical_dose_mcg_low, item.typical_dose_mcg_high)}
              </Text>
              <Text style={styles.metaLabel}>{item.frequency || '—'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </AnimatedPressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
            </View>
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
      backgroundColor: colors.card, borderRadius: BorderRadius.full,
      marginHorizontal: Spacing.xl, marginVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      ...Shadows.sm,
    },
    searchInput: {
      flex: 1, fontSize: FontSize.md, color: colors.text,
      paddingVertical: Spacing.md,
    },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.card, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderWidth: 1, borderColor: colors.cardBorder,
      marginRight: Spacing.sm,
    },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { fontSize: FontSize.xs, color: colors.text, fontWeight: '600' },
    catChipTextActive: { color: '#ffffff' },
    listContent: { paddingHorizontal: Spacing.xl, paddingBottom: 80 },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.md, marginTop: Spacing.md,
    },
    sectionIconWrap: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
    sectionCount: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.full,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    sectionCountText: { fontSize: FontSize.xs, color: colors.textTertiary, fontWeight: '600' },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: BorderRadius.md,
      padding: Spacing.lg, marginBottom: Spacing.sm,
      ...Shadows.sm,
    },
    cardMain: { flex: 1, marginRight: Spacing.md },
    peptideName: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    peptideDesc: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
    cardMeta: { alignItems: 'flex-end', marginRight: Spacing.sm },
    metaValue: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '700' },
    metaLabel: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 1 },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIconWrap: {
      width: 72, height: 72, borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    },
    emptyText: { fontSize: FontSize.md, color: colors.textTertiary },
  });
}
