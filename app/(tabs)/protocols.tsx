import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import AnimatedPressable from '../../components/AnimatedPressable';
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
      // Silently handle — data will show on next focus
    }
  }, [showAll]);

  useFocusEffect(useCallback(() => { loadProtocols(); }, [loadProtocols]));

  const handleDelete = (protocol: Protocol) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Protocol',
      `Delete "${protocol.name}"? This will also delete all dose logs for this protocol.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProtocol(protocol.id);
            loadProtocols();
          },
        },
      ]
    );
  };

  const getNextDoseDate = (protocol: Protocol & { lastDose?: DoseLog | null }): string => {
    if (!protocol.lastDose) return 'No doses logged';
    const lastDate = new Date(protocol.lastDose.logged_at);
    const nextDate = new Date(lastDate.getTime() + protocol.frequency_days * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (nextDate < now) return 'Overdue';

    const diffMs = nextDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `in ${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `in ${diffHours}h`;
    return 'Soon';
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header controls */}
      <View style={styles.headerRow}>
        <AnimatedPressable
          style={styles.filterToggle}
          onPress={() => { setShowAll(!showAll); Haptics.selectionAsync(); }}
          haptic="selection"
          scaleDown={0.95}
        >
          <Text style={styles.filterText}>{showAll ? 'All' : 'Active'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </AnimatedPressable>

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <AnimatedPressable
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/inventory')}
            accessibilityRole="button"
            accessibilityLabel="View inventory"
            haptic="light"
          >
            <Ionicons name="flask-outline" size={18} color="#ffffff" />
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.addBtn}
            onPress={() => router.push('/protocol/new')}
            accessibilityRole="button"
            accessibilityLabel="Create new protocol"
            haptic="light"
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.addBtnText}>New</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Inventory Alerts */}
      {alerts.expiring.length > 0 && (
        <AnimatedPressable style={styles.alertBanner} onPress={() => router.push('/inventory')} haptic="light">
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <Text style={styles.alertText}>
            {alerts.expiring.length} vial{alerts.expiring.length > 1 ? 's' : ''} expiring soon: {alerts.expiring.map(v => v.peptide_name).join(', ')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.warning} />
        </AnimatedPressable>
      )}
      {alerts.lowStock.length > 0 && (
        <AnimatedPressable style={[styles.alertBanner, { backgroundColor: colors.dangerLight }]} onPress={() => router.push('/inventory')} haptic="light">
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[styles.alertText, { color: colors.danger }]}>
            {alerts.lowStock.length} vial{alerts.lowStock.length > 1 ? 's' : ''} running low: {alerts.lowStock.map(v => `${v.peptide_name} (${v.mg_remaining.toFixed(1)}mg)`).join(', ')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.danger} />
        </AnimatedPressable>
      )}

      <FlatList
        data={protocols}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="flask-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Protocols Yet</Text>
            <Text style={styles.emptyText}>
              Create your first protocol to start tracking doses, set reminders, and monitor adherence.
            </Text>
            <AnimatedPressable
              style={styles.emptyBtn}
              onPress={() => router.push('/protocol/new')}
              haptic="light"
              scaleDown={0.95}
            >
              <Ionicons name="add-circle" size={20} color="#ffffff" />
              <Text style={styles.emptyBtnText}>Create Protocol</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.emptyTemplateBtn}
              onPress={() => router.push('/protocol/templates')}
              haptic="light"
              scaleDown={0.95}
            >
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
              <Text style={styles.emptyTemplateBtnText}>Browse Templates</Text>
            </AnimatedPressable>
          </View>
        }
        renderItem={({ item }) => {
          const nextDose = getNextDoseDate(item);
          const isOverdue = nextDose === 'Overdue';

          return (
            <AnimatedPressable
              style={styles.card}
              onPress={() => router.push(`/protocol/${item.id}`)}
              onLongPress={() => handleDelete(item)}
              haptic="light"
              scaleDown={0.98}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardPeptide}>{item.peptide_name}</Text>
                </View>
                {item.is_active ? (
                  <View style={[styles.badge, isOverdue && styles.badgeOverdue]}>
                    <Text style={[styles.badgeText, isOverdue && styles.badgeTextOverdue]}>
                      {nextDose}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.badgeInactive}>
                    <Text style={styles.badgeTextInactive}>Inactive</Text>
                  </View>
                )}
              </View>

              {/* End date indicator */}
              {item.end_date && (() => {
                const endDate = new Date(item.end_date);
                const now = new Date();
                const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft <= 0;
                return (
                  <View style={[styles.endDateBanner, isExpired ? { backgroundColor: colors.dangerLight } : { backgroundColor: colors.warningLight }]}>
                    <Ionicons name={isExpired ? 'checkmark-circle' : 'calendar-outline'} size={14} color={isExpired ? colors.danger : colors.warning} />
                    <Text style={[styles.endDateText, { color: isExpired ? colors.danger : colors.warning }]}>
                      {isExpired ? 'Cycle complete' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                    </Text>
                  </View>
                );
              })()}

              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="eyedrop-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.detailText}>
                    {item.dose_mcg >= 1000
                      ? `${(item.dose_mcg / 1000).toFixed(1)}mg`
                      : `${item.dose_mcg}mcg`
                    }
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="repeat-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.detailText}>
                    {item.frequency_days === 1 ? 'Daily' :
                     item.frequency_days === 7 ? 'Weekly' :
                     item.frequency_days === 3.5 ? '2x/week' :
                     `Every ${item.frequency_days}d`}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="navigate-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.detailText}>{item.route}</Text>
                </View>
              </View>

              {/* Quick log button */}
              {item.is_active && (
                <AnimatedPressable
                  style={styles.quickLogBtn}
                  onPress={() => router.push(`/log/${item.id}`)}
                  haptic="selection"
                  scaleDown={0.98}
                >
                  <Ionicons name="add-circle" size={18} color={colors.primary} />
                  <Text style={styles.quickLogText}>Log Dose</Text>
                </AnimatedPressable>
              )}
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
    headerRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: Spacing.lg, paddingBottom: Spacing.sm,
    },
    filterToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      backgroundColor: colors.surface, borderRadius: BorderRadius.full,
    },
    filterText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primary, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
      minHeight: 36,
      ...Shadows.sm,
    },
    addBtnText: { color: '#ffffff', fontWeight: '600', fontSize: FontSize.sm },
    alertBanner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
      backgroundColor: colors.warningLight, borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    alertText: { flex: 1, fontSize: FontSize.xs, color: colors.warning, fontWeight: '600' },
    listContent: { padding: Spacing.lg, paddingTop: 0 },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.md,
      ...Shadows.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    cardPeptide: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
    badge: {
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 2,
    },
    badgeOverdue: { backgroundColor: colors.dangerLight },
    badgeText: { fontSize: FontSize.xs, color: colors.primary, fontWeight: '600' },
    badgeTextOverdue: { color: colors.danger },
    badgeInactive: {
      backgroundColor: colors.surface, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 2,
    },
    badgeTextInactive: { fontSize: FontSize.xs, color: colors.textTertiary },
    endDateBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderRadius: BorderRadius.sm, padding: Spacing.xs, paddingHorizontal: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    endDateText: { fontSize: FontSize.xs, fontWeight: '600' },
    cardDetails: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: FontSize.sm, color: colors.textSecondary },
    quickLogBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Spacing.md,
      minHeight: 44,
    },
    quickLogText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
    emptyIconWrap: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: colors.text },
    emptyText: {
      fontSize: FontSize.md, color: colors.textSecondary, marginTop: Spacing.sm,
      textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.lg,
    },
    emptyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, marginTop: Spacing.xl,
      ...Shadows.md,
    },
    emptyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: FontSize.md },
    emptyTemplateBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, marginTop: Spacing.md,
    },
    emptyTemplateBtnText: { color: colors.primary, fontWeight: '600', fontSize: FontSize.md },
  });
}
