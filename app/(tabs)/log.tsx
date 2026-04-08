import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, SectionList,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import {
  getActiveProtocols, getRecentDoseLogs, getTodaysDoseCount,
  getDoseLogsByDateRange, getDoseCountByDay,
  type Protocol, type DoseLog,
} from '../../lib/database';
import { exportDoseLogsCSV, exportProtocolsJSON } from '../../lib/export';
import AdherenceRing from '../../components/charts/AdherenceRing';

const SITE_LABELS: Record<string, string> = {
  abdomen_left: 'L Abdomen', abdomen_right: 'R Abdomen',
  thigh_left: 'L Thigh', thigh_right: 'R Thigh',
  deltoid_left: 'L Deltoid', deltoid_right: 'R Deltoid',
  glute_left: 'L Glute', glute_right: 'R Glute',
};

type Period = 'today' | '7d' | '30d' | 'all';

export default function LogScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [recentLogs, setRecentLogs] = useState<(DoseLog & { peptide_name: string })[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [period, setPeriod] = useState<Period>('today');
  const [periodStats, setPeriodStats] = useState<{ totalDoses: number; activeDays: number; totalDays: number }>({ totalDoses: 0, activeDays: 0, totalDays: 0 });

  const getDateRange = (p: Period): { start: string; end: string; days: number } => {
    const now = new Date();
    const end = now.toISOString();
    let start: Date;
    let days: number;
    switch (p) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        days = 1;
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        days = 7;
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
        break;
      default:
        start = new Date(2000, 0, 1);
        days = Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    }
    return { start: start.toISOString(), end, days };
  };

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [protos, count] = await Promise.all([
          getActiveProtocols(),
          getTodaysDoseCount(),
        ]);
        setProtocols(protos);
        setTodayCount(count);

        const { start, end, days } = getDateRange(period);
        const [logs, dayCounts] = await Promise.all([
          period === 'all'
            ? getRecentDoseLogs(100)
            : getDoseLogsByDateRange(start, end),
          getDoseCountByDay(start, end),
        ]);
        setRecentLogs(logs);
        setPeriodStats({
          totalDoses: logs.length,
          activeDays: dayCounts.length,
          totalDays: days,
        });
      }
      load();
    }, [period])
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

  const formatDateHeader = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Group logs by date for section headers
  const sections = recentLogs.reduce<{ title: string; data: (DoseLog & { peptide_name: string })[] }[]>((acc, log) => {
    const dateKey = new Date(log.logged_at).toDateString();
    const existing = acc.find(s => s.title === dateKey);
    if (existing) {
      existing.data.push(log);
    } else {
      acc.push({ title: dateKey, data: [log] });
    }
    return acc;
  }, []);

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {/* Summary row */}
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

      {/* Period filter */}
      <View style={styles.filterRow}>
        {(['today', '7d', '30d', 'all'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.filterBtn, period === p && styles.filterBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
              {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period stats */}
      {period !== 'today' && periodStats.totalDoses > 0 && (
        <View style={styles.statsCard}>
          <AdherenceRing
            percentage={periodStats.totalDays > 0 ? Math.round((periodStats.activeDays / periodStats.totalDays) * 100) : 0}
            size={60}
            strokeWidth={6}
            label="active days"
          />
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{periodStats.totalDoses}</Text>
              <Text style={styles.statLabel}>Total Doses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{periodStats.activeDays}</Text>
              <Text style={styles.statLabel}>Active Days</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {periodStats.activeDays > 0 ? (periodStats.totalDoses / periodStats.activeDays).toFixed(1) : '0'}
              </Text>
              <Text style={styles.statLabel}>Avg/Day</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Log */}
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

      {/* Grouped dose timeline */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.logList}
        renderSectionHeader={({ section }) => (
          <Text style={styles.dateHeader}>{formatDateHeader(section.title)}</Text>
        )}
        ListFooterComponent={recentLogs.length > 0 ? (
          <View style={styles.exportSection}>
            <TouchableOpacity style={styles.exportBtn} onPress={exportDoseLogsCSV}>
              <Ionicons name="download-outline" size={16} color={colors.primary} />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={exportProtocolsJSON}>
              <Ionicons name="code-download-outline" size={16} color={colors.primary} />
              <Text style={styles.exportBtnText}>Export JSON</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No doses logged{period !== 'all' ? ' in this period' : ' yet'}</Text>
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
                  {item.dose_mcg >= 1000 ? `${(item.dose_mcg / 1000).toFixed(1)} mg` : `${item.dose_mcg} mcg`}
                </Text>
                {item.injection_site && (
                  <Text style={styles.logSite}>{SITE_LABELS[item.injection_site] || item.injection_site}</Text>
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
      borderWidth: 1, borderColor: colors.cardBorder, padding: Spacing.xl, marginBottom: Spacing.md,
    },
    summaryLeft: { flex: 1, alignItems: 'center' },
    summaryRight: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: Spacing.lg },
    summaryCount: { fontSize: FontSize.xxxl, fontWeight: '800', color: colors.primary },
    summaryProtocols: { fontSize: FontSize.xxxl, fontWeight: '800', color: colors.accent },
    summaryLabel: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
    filterRow: {
      flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md,
    },
    filterBtn: {
      flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary },
    filterTextActive: { color: '#ffffff' },
    statsCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.md,
    },
    statsGrid: { flex: 1, flexDirection: 'row', gap: Spacing.md },
    statItem: { flex: 1 },
    statValue: { fontSize: FontSize.lg, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: FontSize.xs, color: colors.textTertiary },
    quickSection: { marginBottom: Spacing.md },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    quickCard: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.md, alignItems: 'center', minWidth: 100, flex: 1,
    },
    quickName: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text, marginTop: 4 },
    quickDose: { fontSize: FontSize.xs, color: colors.textSecondary },
    dateHeader: {
      fontSize: FontSize.sm, fontWeight: '700', color: colors.textSecondary,
      marginTop: Spacing.md, marginBottom: Spacing.sm,
      paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
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
    exportSection: {
      flexDirection: 'row', justifyContent: 'center', gap: Spacing.md,
      paddingVertical: Spacing.xl, borderTopWidth: 1, borderTopColor: colors.border,
      marginTop: Spacing.lg,
    },
    exportBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.primary,
    },
    exportBtnText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 40 },
    emptyText: { fontSize: FontSize.md, color: colors.textTertiary, marginTop: Spacing.sm },
  });
}
