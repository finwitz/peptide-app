import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import {
  getProtocolById, getDoseLogsForProtocol, updateProtocol, deleteProtocol,
  type Protocol, type DoseLog,
} from '../../lib/database';
import { calculateReconstitution, SYRINGE_TYPES, formatMl, formatSyringeUnits, type SyringeType } from '../../lib/calculations';

const SITE_LABELS: Record<string, string> = {
  abdomen_left: 'L Abdomen', abdomen_right: 'R Abdomen',
  thigh_left: 'L Thigh', thigh_right: 'R Thigh',
  deltoid_left: 'L Deltoid', deltoid_right: 'R Deltoid',
  glute_left: 'L Glute', glute_right: 'R Glute',
};

export default function ProtocolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!id) return;
        const proto = await getProtocolById(parseInt(id));
        setProtocol(proto);
        if (proto) {
          const doseLogs = await getDoseLogsForProtocol(proto.id, 30);
          setLogs(doseLogs);
        }
      }
      load();
    }, [id])
  );

  if (!protocol) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textTertiary }}>Loading...</Text>
      </View>
    );
  }

  const reconResult = protocol.vial_mg && protocol.water_ml
    ? calculateReconstitution({
        vialMg: protocol.vial_mg,
        waterMl: protocol.water_ml,
        desiredDoseMcg: protocol.dose_mcg,
        syringeType: protocol.syringe_type as SyringeType,
      })
    : null;

  const toggleActive = async () => {
    await updateProtocol(protocol.id, { is_active: protocol.is_active ? 0 : 1 });
    setProtocol({ ...protocol, is_active: protocol.is_active ? 0 : 1 });
  };

  const handleDelete = () => {
    Alert.alert('Delete Protocol', 'This will delete all dose logs too. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteProtocol(protocol.id); router.back(); },
      },
    ]);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{protocol.name}</Text>
        <Text style={styles.subtitle}>{protocol.peptide_name}</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity style={styles.statusBtn} onPress={toggleActive}>
            <View style={[styles.statusDot, { backgroundColor: protocol.is_active ? colors.success : colors.textTertiary }]} />
            <Text style={styles.statusText}>{protocol.is_active ? 'Active' : 'Inactive'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dose</Text>
          <Text style={styles.detailValue}>
            {protocol.dose_mcg >= 1000 ? `${(protocol.dose_mcg / 1000).toFixed(2)} mg` : `${protocol.dose_mcg} mcg`}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Frequency</Text>
          <Text style={styles.detailValue}>
            {protocol.frequency_days === 1 ? 'Daily' :
             protocol.frequency_days === 7 ? 'Weekly' :
             `Every ${protocol.frequency_days} days`}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Route</Text>
          <Text style={styles.detailValue}>{protocol.route}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Started</Text>
          <Text style={styles.detailValue}>{protocol.start_date}</Text>
        </View>
        {protocol.notes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={[styles.detailValue, { flex: 1 }]}>{protocol.notes}</Text>
          </View>
        )}
      </View>

      {/* Reconstitution Info */}
      {reconResult && (
        <View style={[styles.card, { borderColor: colors.primary, borderWidth: 1.5 }]}>
          <Text style={styles.cardTitle}>Reconstitution</Text>
          <View style={styles.reconGrid}>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Draw</Text>
              <Text style={styles.reconValue}>{formatMl(reconResult.injectionMl)} mL</Text>
            </View>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Units</Text>
              <Text style={styles.reconValue}>{formatSyringeUnits(reconResult.syringeUnits)}</Text>
            </View>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Conc.</Text>
              <Text style={styles.reconValue}>{reconResult.concentrationMcgPerMl.toFixed(0)} mcg/mL</Text>
            </View>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Doses/Vial</Text>
              <Text style={styles.reconValue}>{reconResult.dosesPerVial}</Text>
            </View>
          </View>
          <Text style={styles.reconNote}>
            {protocol.vial_mg}mg vial + {protocol.water_ml}mL BAC water · {SYRINGE_TYPES[protocol.syringe_type as SyringeType]?.label || protocol.syringe_type}
          </Text>
        </View>
      )}

      {/* Log Dose Button */}
      {protocol.is_active && (
        <TouchableOpacity style={styles.logBtn} onPress={() => router.push(`/log/${protocol.id}`)}>
          <Ionicons name="add-circle" size={22} color="#ffffff" />
          <Text style={styles.logBtnText}>Log Dose</Text>
        </TouchableOpacity>
      )}

      {/* Dose History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dose History ({logs.length})</Text>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No doses logged yet.</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logDot} />
              <View style={{ flex: 1 }}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDose}>
                    {log.dose_mcg >= 1000 ? `${(log.dose_mcg / 1000).toFixed(1)}mg` : `${log.dose_mcg}mcg`}
                  </Text>
                  <Text style={styles.logDate}>{formatDate(log.logged_at)}</Text>
                </View>
                {log.injection_site && (
                  <Text style={styles.logSite}>{SITE_LABELS[log.injection_site] || log.injection_site}</Text>
                )}
                {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteBtnText}>Delete Protocol</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    header: { marginBottom: Spacing.lg },
    title: { fontSize: FontSize.title, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: FontSize.lg, color: colors.textSecondary, marginTop: 2 },
    statusRow: { flexDirection: 'row', marginTop: Spacing.sm },
    statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: FontSize.sm, color: colors.textSecondary },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    detailLabel: { fontSize: FontSize.sm, color: colors.textSecondary },
    detailValue: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text },
    reconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    reconItem: {
      flex: 1, minWidth: '40%', backgroundColor: colors.primaryLight,
      borderRadius: BorderRadius.md, padding: Spacing.md,
    },
    reconLabel: { fontSize: FontSize.xs, color: colors.textSecondary },
    reconValue: { fontSize: FontSize.lg, fontWeight: '700', color: colors.primary, marginTop: 2 },
    reconNote: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: Spacing.sm },
    logBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    logBtnText: { color: '#ffffff', fontSize: FontSize.lg, fontWeight: '700' },
    logItem: { flexDirection: 'row', marginBottom: Spacing.md },
    logDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
      marginTop: 5, marginRight: Spacing.md,
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    logDose: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
    logDate: { fontSize: FontSize.xs, color: colors.textTertiary },
    logSite: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
    logNotes: { fontSize: FontSize.xs, color: colors.textTertiary, fontStyle: 'italic', marginTop: 2 },
    emptyText: { fontSize: FontSize.sm, color: colors.textTertiary, textAlign: 'center', padding: Spacing.lg },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.lg,
    },
    deleteBtnText: { fontSize: FontSize.md, color: colors.danger, fontWeight: '600' },
  });
}
