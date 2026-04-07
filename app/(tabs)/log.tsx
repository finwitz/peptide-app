import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import {
  getActiveProtocols, getRecentDoseLogs, getTodaysDoseCount,
  type Protocol, type DoseLog,
} from '../../lib/database';

const SITE_LABELS: Record<string, string> = {
  abdomen_left: 'L Abdomen',
  abdomen_right: 'R Abdomen',
  thigh_left: 'L Thigh',
  thigh_right: 'R Thigh',
  deltoid_left: 'L Deltoid',
  deltoid_right: 'R Deltoid',
  glute_left: 'L Glute',
  glute_right: 'R Glute',
};

export default function LogScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [recentLogs, setRecentLogs] = useState<(DoseLog & { peptide_name: string })[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [protos, logs, count] = await Promise.all([
          getActiveProtocols(),
          getRecentDoseLogs(20),
          getTodaysDoseCount(),
        ]);
        setProtocols(protos);
        setRecentLogs(logs);
        setTodayCount(count);
      }
      load();
    }, [])
  );

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {/* Today's summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryCount}>{todayCount}</Text>
          <Text style={styles.summaryLabel}>doses today</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRight}>
          <Text style={styles.summaryProtocols}>{protocols.length}</Text>
          <Text style={styles.summaryLabel}>active protocols</Text>
        </View>
      </View>

      {/* Quick Log Buttons */}
      {protocols.length > 0 && (
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>Quick Log</Text>
          <View style={styles.quickGrid}>
            {protocols.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.quickCard}
                onPress={() => router.push(`/log/${p.id}`)}
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
                <Text style={styles.quickName} numberOfLines={1}>{p.peptide_name}</Text>
                <Text style={styles.quickDose}>
                  {p.dose_mcg >= 1000 ? `${(p.dose_mcg / 1000).toFixed(1)}mg` : `${p.dose_mcg}mcg`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recent Logs */}
      <Text style={styles.sectionTitle}>Recent Doses</Text>
      <FlatList
        data={recentLogs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.logList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No doses logged yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View style={styles.logDot} />
            <View style={styles.logContent}>
              <View style={styles.logHeader}>
                <Text style={styles.logPeptide}>{item.peptide_name}</Text>
                <Text style={styles.logTime}>{formatTime(item.logged_at)}</Text>
              </View>
              <View style={styles.logDetails}>
                <Text style={styles.logDose}>
                  {item.dose_mcg >= 1000
                    ? `${(item.dose_mcg / 1000).toFixed(1)} mg`
                    : `${item.dose_mcg} mcg`
                  }
                </Text>
                {item.injection_site && (
                  <Text style={styles.logSite}>
                    {SITE_LABELS[item.injection_site] || item.injection_site}
                  </Text>
                )}
              </View>
              {item.notes && <Text style={styles.logNotes}>{item.notes}</Text>}
            </View>
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: Spacing.lg },
    summaryCard: {
      flexDirection: 'row', backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder, padding: Spacing.xl, marginBottom: Spacing.lg,
    },
    summaryLeft: { flex: 1, alignItems: 'center' },
    summaryRight: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: Spacing.lg },
    summaryCount: { fontSize: FontSize.xxxl, fontWeight: '800', color: colors.primary },
    summaryProtocols: { fontSize: FontSize.xxxl, fontWeight: '800', color: colors.accent },
    summaryLabel: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
    quickSection: { marginBottom: Spacing.lg },
    sectionTitle: {
      fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md,
    },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    quickCard: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.md, alignItems: 'center', minWidth: 100, flex: 1,
    },
    quickName: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text, marginTop: 4 },
    quickDose: { fontSize: FontSize.xs, color: colors.textSecondary },
    logList: { paddingBottom: 80 },
    logItem: { flexDirection: 'row', marginBottom: Spacing.md },
    logDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
      marginTop: 6, marginRight: Spacing.md,
    },
    logContent: { flex: 1 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logPeptide: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
    logTime: { fontSize: FontSize.xs, color: colors.textTertiary },
    logDetails: { flexDirection: 'row', gap: Spacing.lg, marginTop: 2 },
    logDose: { fontSize: FontSize.sm, color: colors.textSecondary },
    logSite: { fontSize: FontSize.sm, color: colors.textTertiary },
    logNotes: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2, fontStyle: 'italic' },
    empty: { alignItems: 'center', paddingTop: 40 },
    emptyText: { fontSize: FontSize.md, color: colors.textTertiary, marginTop: Spacing.sm },
  });
}
