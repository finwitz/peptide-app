import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { getPeptideById, type Peptide } from '../../lib/database';

export default function PeptideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const [peptide, setPeptide] = useState<Peptide | null>(null);

  useEffect(() => {
    if (id) getPeptideById(parseInt(id)).then(setPeptide);
  }, [id]);

  if (!peptide) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textTertiary }}>Loading...</Text>
      </View>
    );
  }

  const formatDose = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} mg` : `${v} mcg`;

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{peptide.category}</Text>
        </View>
        <Text style={styles.name}>{peptide.name}</Text>
        {peptide.description && (
          <Text style={styles.description}>{peptide.description}</Text>
        )}
      </View>

      {/* Quick Facts */}
      <View style={styles.factsGrid}>
        {peptide.typical_dose_mcg_low && (
          <View style={styles.factCard}>
            <Ionicons name="eyedrop-outline" size={20} color={colors.primary} />
            <Text style={styles.factLabel}>Typical Dose</Text>
            <Text style={styles.factValue}>
              {formatDose(peptide.typical_dose_mcg_low)}
              {peptide.typical_dose_mcg_high && peptide.typical_dose_mcg_high !== peptide.typical_dose_mcg_low
                ? ` - ${formatDose(peptide.typical_dose_mcg_high)}`
                : ''
              }
            </Text>
          </View>
        )}

        {peptide.half_life_hours !== null && (
          <View style={styles.factCard}>
            <Ionicons name="time-outline" size={20} color={colors.accent} />
            <Text style={styles.factLabel}>Half-Life</Text>
            <Text style={styles.factValue}>
              {peptide.half_life_hours >= 24
                ? `${(peptide.half_life_hours / 24).toFixed(1)} days`
                : peptide.half_life_hours >= 1
                  ? `${peptide.half_life_hours} hours`
                  : `${(peptide.half_life_hours * 60).toFixed(0)} min`
              }
            </Text>
          </View>
        )}

        {peptide.frequency && (
          <View style={styles.factCard}>
            <Ionicons name="repeat-outline" size={20} color={colors.success} />
            <Text style={styles.factLabel}>Frequency</Text>
            <Text style={styles.factValue}>{peptide.frequency}</Text>
          </View>
        )}

        {peptide.route && (
          <View style={styles.factCard}>
            <Ionicons name="navigate-outline" size={20} color={colors.warning} />
            <Text style={styles.factLabel}>Route</Text>
            <Text style={styles.factValue}>{peptide.route}</Text>
          </View>
        )}
      </View>

      {/* Storage */}
      {peptide.storage_info && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="snow-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Storage</Text>
          </View>
          <Text style={styles.cardBody}>{peptide.storage_info}</Text>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Ionicons name="warning-outline" size={18} color={colors.warning} />
        <Text style={styles.disclaimerText}>
          This information is for reference only and does not constitute medical advice.
          Always consult a qualified healthcare professional before making any health decisions.
          Dosage information reflects common research protocols and may not be appropriate for all individuals.
        </Text>
      </View>

      {/* Create Protocol */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => router.push('/protocol/new')}
      >
        <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
        <Text style={styles.createBtnText}>Create Protocol with {peptide.name}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    header: { marginBottom: Spacing.xl },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md, paddingVertical: 4, marginBottom: Spacing.sm,
    },
    categoryText: { fontSize: FontSize.xs, fontWeight: '600', color: colors.primary },
    name: { fontSize: FontSize.title, fontWeight: '800', color: colors.text },
    description: { fontSize: FontSize.md, color: colors.textSecondary, marginTop: Spacing.sm, lineHeight: 22 },
    factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    factCard: {
      flex: 1, minWidth: '45%',
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg,
    },
    factLabel: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: Spacing.sm },
    factValue: { fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginTop: 2 },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    cardBody: { fontSize: FontSize.md, color: colors.textSecondary, lineHeight: 22 },
    disclaimerCard: {
      flexDirection: 'row', gap: Spacing.sm,
      backgroundColor: colors.warningLight, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    disclaimerText: { fontSize: FontSize.xs, color: colors.warning, flex: 1, lineHeight: 18 },
    createBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    },
    createBtnText: { color: '#ffffff', fontSize: FontSize.md, fontWeight: '700' },
  });
}
