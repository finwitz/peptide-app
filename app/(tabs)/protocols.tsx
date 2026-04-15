import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import AnimatedPressable from '../../components/AnimatedPressable';
import { formatFrequency, formatDose } from '../../lib/calculations';
import {
  getActiveProtocols, getAllProtocols, deleteProtocol, getLastDoseForProtocol,
  getExpiringSoonInventory, getLowStockInventory,
  type Protocol, type DoseLog, type InventoryItem,
} from '../../lib/database';

export default function ProtocolsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [protocols, setProtocols] = useState<(Protocol & { lastDose?: DoseLog | null })[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [alerts, setAlerts] = useState<{ expiring: InventoryItem[]; lowStock: InventoryItem[] }>({ expiring: [], lowStock: [] });

  const loadProtocols = useCallback(async () => {
    try {
      const protos = showAll ? await getAllProtocols() : await getActiveProtocols();
      const withLastDose = await Promise.all(
        protos.map(async (p) => ({
          ...p,
          lastDose: await getLastDoseForProtocol(p.id),
        }))
      );
      setProtocols(withLastDose);
      const [expiring, lowStock] = await Promise.all([
        getExpiringSoonInventory(7),
        getLowStockInventory(0.2),
      ]);
      setAlerts({ expiring, lowStock });
    } catch (e) {
      if (__DEV__) console.warn('[protocols] load failed', e);
    }
  }, [showAll]);

  useFocusEffect(useCallback(() => { loadProtocols(); }, [loadProtocols]));

  const handleDelete = (protocol: Protocol) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Protocol',
      `Delete "${protocol.name}"? This will also delete all dose logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProtocol(protocol.id); loadProtocols(); } },
      ]
    );
  };

  const getNextDoseInfo = (protocol: Protocol & { lastDose?: DoseLog | null }): { text: string; isOverdue: boolean } => {
    if (!protocol.lastDose) return { text: 'No doses yet', isOverdue: false };
    const lastDate = new Date(protocol.lastDose.logged_at);
    const nextDate = new Date(lastDate.getTime() + protocol.frequency_days * 24 * 60 * 60 * 1000);
    const now = new Date();
    if (nextDate < now) return { text: 'Overdue', isOverdue: true };
    const diffMs = nextDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return { text: `${diffDays}d ${diffHours % 24}h`, isOverdue: false };
    if (diffHours > 0) return { text: `${diffHours}h`, isOverdue: false };
    return { text: 'Soon', isOverdue: false };
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <AnimatedPressable
          style={styles.filterToggle}
          onPress={() => { setShowAll(!showAll); Haptics.selectionAsync(); }}
          haptic="selection"
          scaleDown={0.93}
        >
          <Ionicons name={showAll ? 'list' : 'pulse'} size={14} color={colors.primary} />
          <Text style={styles.filterText}>{showAll ? 'All' : 'Active'}</Text>
        </AnimatedPressable>

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <AnimatedPressable
            style={styles.iconBtn}
            onPress={() => router.push('/protocol/templates')}
            haptic="light" scaleDown={0.9}
            accessibilityRole="button"
            accessibilityLabel="Browse protocol templates"
          >
            <Ionicons name="copy-outline" size={18} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.iconBtn}
            onPress={() => router.push('/inventory')}
            haptic="light" scaleDown={0.9}
            accessibilityLabel="Inventory"
          >
            <Ionicons name="flask-outline" size={18} color={colors.accent} />
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.iconBtn}
            onPress={() => router.push('/settings')}
            haptic="light" scaleDown={0.9}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.primaryBtn}
            onPress={() => router.push('/protocol/new')}
            haptic="light" scaleDown={0.95}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>New</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Alerts */}
      {alerts.expiring.length > 0 && (
        <AnimatedPressable style={styles.alertBanner} onPress={() => router.push('/inventory')} haptic="light" scaleDown={0.98}>
          <View style={[styles.alertDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.alertText} numberOfLines={1}>
            {alerts.expiring.length} vial{alerts.expiring.length > 1 ? 's' : ''} expiring — {alerts.expiring.map(v => v.peptide_name).join(', ')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </AnimatedPressable>
      )}
      {alerts.lowStock.length > 0 && (
        <AnimatedPressable style={[styles.alertBanner, { borderLeftColor: colors.danger }]} onPress={() => router.push('/inventory')} haptic="light" scaleDown={0.98}>
          <View style={[styles.alertDot, { backgroundColor: colors.danger }]} />
          <Text style={styles.alertText} numberOfLines={1}>
            {alerts.lowStock.length} vial{alerts.lowStock.length > 1 ? 's' : ''} running low
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </AnimatedPressable>
      )}

      <FlatList
        data={protocols}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="flask-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No protocols yet</Text>
            <Text style={styles.emptyText}>
              Set up your first protocol to start tracking doses and stay on schedule.
            </Text>
            <AnimatedPressable
              style={styles.emptyCta}
              onPress={() => router.push('/protocol/new')}
              haptic="light" scaleDown={0.95}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.emptyCtaText}>Create Protocol</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.emptySecondary}
              onPress={() => router.push('/protocol/templates')}
              haptic="light" scaleDown={0.95}
            >
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text style={styles.emptySecondaryText}>Browse Templates</Text>
            </AnimatedPressable>
          </View>
        }
        renderItem={({ item }) => {
          const { text: nextDose, isOverdue } = getNextDoseInfo(item);
          return (
            <AnimatedPressable
              style={styles.card}
              onPress={() => router.push(`/protocol/${item.id}`)}
              onLongPress={() => handleDelete(item)}
              haptic="light" scaleDown={0.98}
            >
              {/* Status indicator */}
              <View style={[styles.statusBar, isOverdue ? { backgroundColor: colors.danger } : item.is_active ? { backgroundColor: colors.success } : { backgroundColor: colors.textTertiary }]} />

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardPeptide}>{item.peptide_name}</Text>
                  </View>
                  {item.is_active ? (
                    <View style={[styles.badge, isOverdue && { backgroundColor: colors.dangerLight }]}>
                      <Ionicons name={isOverdue ? 'alert-circle' : 'time-outline'} size={12} color={isOverdue ? colors.danger : colors.primary} />
                      <Text style={[styles.badgeText, isOverdue && { color: colors.danger }]}>{nextDose}</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.badgeText, { color: colors.textTertiary }]}>Paused</Text>
                    </View>
                  )}
                </View>

                {/* End date */}
                {item.end_date && (() => {
                  const daysLeft = Math.ceil((new Date(item.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft <= 0;
                  return (
                    <View style={styles.endDate}>
                      <Ionicons name={isExpired ? 'checkmark-circle' : 'calendar-outline'} size={12} color={isExpired ? colors.success : colors.textTertiary} />
                      <Text style={[styles.endDateText, isExpired && { color: colors.success }]}>
                        {isExpired ? 'Cycle complete' : `${daysLeft}d remaining`}
                      </Text>
                    </View>
                  );
                })()}

                <View style={styles.cardDetails}>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipText}>{formatDose(item.dose_mcg)}</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipText}>{formatFrequency(item.frequency_days)}</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipText}>{item.route}</Text>
                  </View>
                </View>

                {item.is_active && (
                  <AnimatedPressable
                    style={styles.quickLogBtn}
                    onPress={() => router.push(`/log/${item.id}`)}
                    haptic="selection" scaleDown={0.97}
                  >
                    <Ionicons name="add-circle" size={16} color={colors.primary} />
                    <Text style={styles.quickLogText}>Log Dose</Text>
                  </AnimatedPressable>
                )}
              </View>
            </AnimatedPressable>
          );
        }}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Header
    headerRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    },
    filterToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: Spacing.md, paddingVertical: 8,
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.full,
    },
    filterText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '700' },
    iconBtn: {
      width: 38, height: 38, borderRadius: BorderRadius.full,
      backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center',
    },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primary, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.lg, height: 38,
      ...Shadows.glow(colors.primary),
    },
    primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: FontSize.sm },
    // Alerts
    alertBanner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
      backgroundColor: colors.card, borderRadius: BorderRadius.md,
      padding: Spacing.md,
      borderLeftWidth: 3, borderLeftColor: colors.warning,
    },
    alertDot: { width: 6, height: 6, borderRadius: 3 },
    alertText: { flex: 1, fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '500' },
    // List
    listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: 80 },
    // Cards
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md, flexDirection: 'row', overflow: 'hidden',
      ...Shadows.sm,
    },
    statusBar: { width: 4, borderTopLeftRadius: BorderRadius.lg, borderBottomLeftRadius: BorderRadius.lg },
    cardBody: { flex: 1, padding: Spacing.lg },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
    cardPeptide: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 1 },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 3,
    },
    badgeText: { fontSize: FontSize.xs, color: colors.primary, fontWeight: '600' },
    endDate: {
      flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm,
    },
    endDateText: { fontSize: FontSize.xs, color: colors.textTertiary, fontWeight: '500' },
    cardDetails: {
      flexDirection: 'row', gap: 6, marginTop: Spacing.md, flexWrap: 'wrap',
    },
    detailChip: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 3,
    },
    detailChipText: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '500' },
    quickLogBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Spacing.md, marginTop: Spacing.md,
      minHeight: 40,
    },
    quickLogText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '700' },
    // Empty
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xxl },
    emptyIconWrap: {
      width: 80, height: 80, borderRadius: 24,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
    },
    emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    emptyText: {
      fontSize: FontSize.md, color: colors.textSecondary, marginTop: Spacing.sm,
      textAlign: 'center', lineHeight: 22,
    },
    emptyCta: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, marginTop: Spacing.xxl,
      ...Shadows.glow(colors.primary),
    },
    emptyCtaText: { color: '#ffffff', fontWeight: '700', fontSize: FontSize.md },
    emptySecondary: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.md, marginTop: Spacing.sm,
    },
    emptySecondaryText: { color: colors.primary, fontWeight: '600', fontSize: FontSize.md },
  });
}
