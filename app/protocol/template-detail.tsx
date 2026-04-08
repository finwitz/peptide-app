import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { PROTOCOL_TEMPLATES, getCategoryInfo } from '../../lib/protocolTemplates';
import { createProtocol, getActiveProtocols, type Protocol } from '../../lib/database';
import { checkInteractions } from '../../lib/interactionChecker';
import type { PeptideInteraction } from '../../lib/interactions';
import InteractionWarning from '../../components/InteractionWarning';

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [activeProtos, setActiveProtos] = useState<Protocol[]>([]);

  const template = useMemo(() => PROTOCOL_TEMPLATES.find(t => t.id === id), [id]);

  useEffect(() => { getActiveProtocols().then(setActiveProtos); }, []);

  if (!template) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textTertiary }}>Template not found</Text>
      </View>
    );
  }

  const catInfo = getCategoryInfo(template.category);

  // Check interactions within the template and with existing protocols
  const allNames = [
    ...template.peptides.map(p => p.peptideName),
    ...activeProtos.map(p => p.peptide_name),
  ];
  const interactions = checkInteractions(allNames);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const endDate = template.durationWeeks > 0
        ? new Date(Date.now() + template.durationWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;

      for (const pep of template.peptides) {
        await createProtocol({
          name: template.peptides.length > 1
            ? `${template.name} — ${pep.peptideName}`
            : template.name,
          peptide_id: null,
          peptide_name: pep.peptideName,
          dose_mcg: pep.doseMcg,
          frequency_days: pep.frequencyDays,
          vial_mg: pep.vialMg ?? null,
          water_ml: pep.waterMl ?? null,
          syringe_type: pep.syringeType ?? 'U100',
          route: pep.route,
          notes: [pep.notes, template.notes].filter(Boolean).join('\n\n'),
          start_date: today,
          end_date: endDate,
        });
      }

      Alert.alert(
        'Protocols Created',
        `Created ${template.peptides.length} protocol${template.peptides.length > 1 ? 's' : ''} from "${template.name}"`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/protocols') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to create protocols. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const formatDose = (mcg: number) => mcg >= 1000 ? `${(mcg / 1000).toFixed(1)} mg` : `${mcg} mcg`;
  const formatFreq = (days: number) => {
    if (days === 1) return 'Daily';
    if (days === 7) return 'Weekly';
    if (days === 3.5) return '2x/week';
    if (days === 2.33) return '3x/week';
    if (days === 2) return 'EOD';
    return `Every ${days} days`;
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.catBadge, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={catInfo.icon as any} size={14} color={colors.primary} />
          <Text style={[styles.catText, { color: colors.primary }]}>{catInfo.label}</Text>
        </View>
        <Text style={styles.title}>{template.name}</Text>
        <Text style={styles.description}>{template.description}</Text>
        {template.durationWeeks > 0 && (
          <View style={styles.durationRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.durationText}>{template.durationWeeks} weeks</Text>
          </View>
        )}
      </View>

      {/* Interaction warnings */}
      {interactions.length > 0 && <InteractionWarning interactions={interactions} />}

      {/* Peptides in this template */}
      <Text style={styles.sectionTitle}>Peptides ({template.peptides.length})</Text>
      {template.peptides.map((pep, idx) => (
        <View key={idx} style={styles.pepCard}>
          <Text style={styles.pepName}>{pep.peptideName}</Text>
          <View style={styles.pepDetails}>
            <View style={styles.pepDetail}>
              <Ionicons name="eyedrop-outline" size={14} color={colors.primary} />
              <Text style={styles.pepDetailText}>{formatDose(pep.doseMcg)}</Text>
            </View>
            <View style={styles.pepDetail}>
              <Ionicons name="repeat-outline" size={14} color={colors.accent} />
              <Text style={styles.pepDetailText}>{formatFreq(pep.frequencyDays)}</Text>
            </View>
            <View style={styles.pepDetail}>
              <Ionicons name="navigate-outline" size={14} color={colors.success} />
              <Text style={styles.pepDetailText}>{pep.route}</Text>
            </View>
          </View>
          {pep.notes && <Text style={styles.pepNotes}>{pep.notes}</Text>}
        </View>
      ))}

      {/* Notes */}
      {template.notes && (
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Ionicons name="document-text-outline" size={16} color={colors.accent} />
            <Text style={styles.notesTitle}>Notes</Text>
          </View>
          <Text style={styles.notesBody}>{template.notes}</Text>
        </View>
      )}

      {/* Create button */}
      <TouchableOpacity
        style={[styles.createBtn, creating && { opacity: 0.5 }]}
        onPress={handleCreate}
        disabled={creating}
      >
        <Ionicons name="add-circle" size={22} color="#ffffff" />
        <Text style={styles.createBtnText}>
          {creating ? 'Creating...' : `Create ${template.peptides.length > 1 ? `${template.peptides.length} Protocols` : 'Protocol'}`}
        </Text>
      </TouchableOpacity>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.warningLight }]}>
        <Ionicons name="warning-outline" size={14} color={colors.warning} />
        <Text style={[styles.disclaimerText, { color: colors.warning }]}>
          Templates are for reference only. Consult a healthcare professional before starting any protocol.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    header: { marginBottom: Spacing.lg },
    catBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: Spacing.sm,
    },
    catText: { fontSize: FontSize.xs, fontWeight: '600' },
    title: { fontSize: FontSize.title, fontWeight: '800', color: colors.text },
    description: { fontSize: FontSize.md, color: colors.textSecondary, marginTop: Spacing.sm, lineHeight: 22 },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
    durationText: { fontSize: FontSize.sm, color: colors.textTertiary },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
    pepCard: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.sm,
    },
    pepName: { fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm },
    pepDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    pepDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pepDetailText: { fontSize: FontSize.sm, color: colors.textSecondary },
    pepNotes: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: Spacing.sm, fontStyle: 'italic' },
    notesCard: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.lg,
    },
    notesHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    notesTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    notesBody: { fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20 },
    createBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    createBtnText: { color: '#ffffff', fontSize: FontSize.lg, fontWeight: '700' },
    disclaimer: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderRadius: BorderRadius.lg, padding: Spacing.md,
    },
    disclaimerText: { fontSize: FontSize.xs, flex: 1, lineHeight: 18 },
  });
}
