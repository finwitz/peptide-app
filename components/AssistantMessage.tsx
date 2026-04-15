import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import type { AssistantResponse, AssistantSection } from '../lib/assistant';
import { getPeptideByName } from '../lib/database';

interface Props {
  response: AssistantResponse;
}

const SECTION_CONFIG: Record<AssistantSection['type'], { icon: string; color: (c: any) => string }> = {
  text: { icon: 'information-circle-outline', color: c => c.primary },
  warning: { icon: 'warning-outline', color: c => c.warning },
  tip: { icon: 'bulb-outline', color: c => c.accent },
  data: { icon: 'stats-chart-outline', color: c => c.success },
};

export default function AssistantMessage({ response }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
  const [peptideIds, setPeptideIds] = useState<Record<string, number>>({});
  const styles = makeStyles(colors);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, number> = {};
      for (const name of response.relatedPeptides) {
        const pep = await getPeptideByName(name);
        if (pep) map[name] = pep.id;
      }
      if (!cancelled) setPeptideIds(map);
    })();
    return () => { cancelled = true; };
  }, [response.relatedPeptides]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name={response.type === 'not_found' ? 'help-circle-outline' : 'sparkles'}
          size={18}
          color={colors.primary}
        />
        <Text style={styles.title}>{response.title}</Text>
        {response.confidence === 'low' && (
          <View style={[styles.confidenceBadge, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.confidenceText, { color: colors.warning }]}>Low confidence</Text>
          </View>
        )}
      </View>

      {response.sections.map((section, idx) => {
        const config = SECTION_CONFIG[section.type];
        const iconColor = config.color(colors);
        return (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={config.icon as any} size={14} color={iconColor} />
              <Text style={[styles.sectionHeading, { color: iconColor }]}>{section.heading}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        );
      })}

      {response.relatedPeptides.length > 0 && (
        <View style={styles.relatedRow}>
          <Ionicons name="link-outline" size={12} color={colors.textTertiary} />
          {response.relatedPeptides.map((name, i) => {
            const id = peptideIds[name];
            const chip = (
              <Text
                key={name}
                style={[styles.relatedChip, id != null && styles.relatedChipLink]}
              >
                {name}
              </Text>
            );
            if (id != null) {
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => router.push(`/peptide/${id}`)}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  {chip}
                </TouchableOpacity>
              );
            }
            return chip;
          })}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    title: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    confidenceBadge: {
      borderRadius: BorderRadius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    confidenceText: {
      fontSize: 10,
      fontWeight: '600',
    },
    section: {
      marginBottom: Spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    sectionHeading: {
      fontSize: FontSize.sm,
      fontWeight: '700',
    },
    sectionBody: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    relatedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
    },
    relatedChip: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
    },
    relatedChipLink: {
      color: colors.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });
}
