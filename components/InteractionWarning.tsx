import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import type { PeptideInteraction, InteractionSeverity } from '../lib/interactions';
import { getSeverityInfo } from '../lib/interactionChecker';

interface InteractionWarningProps {
  interactions: PeptideInteraction[];
  compact?: boolean;
}

export default function InteractionWarning({ interactions, compact = false }: InteractionWarningProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  if (interactions.length === 0) return null;

  const getSeverityColor = (severity: InteractionSeverity) => {
    switch (severity) {
      case 'contraindicated':
      case 'major':
        return colors.danger;
      case 'moderate':
        return colors.warning;
      default:
        return colors.accent;
    }
  };

  const getSeverityBg = (severity: InteractionSeverity) => {
    switch (severity) {
      case 'contraindicated':
      case 'major':
        return colors.dangerLight;
      case 'moderate':
        return colors.warningLight;
      default:
        return colors.primaryLight;
    }
  };

  const visibleInteractions = expanded ? interactions : interactions.slice(0, 2);
  const hasMore = interactions.length > 2 && !expanded;

  if (compact) {
    const worst = interactions[0]; // already sorted by severity
    const color = getSeverityColor(worst.severity);
    const info = getSeverityInfo(worst.severity);
    return (
      <View style={[compactStyles.badge, { backgroundColor: getSeverityBg(worst.severity) }]}>
        <Ionicons name={info.icon as any} size={12} color={color} />
        <Text style={[compactStyles.badgeText, { color }]}>{interactions.length}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {visibleInteractions.map((interaction, idx) => {
        const color = getSeverityColor(interaction.severity);
        const bg = getSeverityBg(interaction.severity);
        const info = getSeverityInfo(interaction.severity);

        return (
          <View key={idx} style={[styles.card, { borderColor: color, backgroundColor: bg }]}>
            <View style={styles.header}>
              <Ionicons name={info.icon as any} size={18} color={color} />
              <Text style={[styles.severity, { color }]}>{info.label}</Text>
              <Text style={[styles.pair, { color: colors.textSecondary }]}>
                {interaction.peptideA} + {interaction.peptideB}
              </Text>
            </View>
            <Text style={[styles.description, { color: colors.text }]}>{interaction.description}</Text>
            <View style={[styles.recBox, { backgroundColor: colors.card }]}>
              <Ionicons name="bulb-outline" size={14} color={colors.accent} />
              <Text style={[styles.recommendation, { color: colors.textSecondary }]}>{interaction.recommendation}</Text>
            </View>
          </View>
        );
      })}
      {hasMore && (
        <TouchableOpacity style={styles.moreBtn} onPress={() => setExpanded(true)}>
          <Text style={[styles.moreText, { color: colors.primary }]}>
            +{interactions.length - 2} more interaction{interactions.length - 2 > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, marginBottom: Spacing.md },
  card: {
    borderRadius: BorderRadius.lg, borderWidth: 1.5,
    padding: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  severity: { fontSize: FontSize.sm, fontWeight: '800' },
  pair: { fontSize: FontSize.xs, flex: 1, textAlign: 'right' },
  description: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
  recBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
  },
  recommendation: { fontSize: FontSize.xs, flex: 1, lineHeight: 18 },
  moreBtn: { alignItems: 'center', paddingVertical: 4 },
  moreText: { fontSize: FontSize.sm, fontWeight: '600' },
});

const compactStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
