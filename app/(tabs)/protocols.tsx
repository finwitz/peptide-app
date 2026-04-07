import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { getActiveProtocols, getAllProtocols, deleteProtocol, getLastDoseForProtocol, type Protocol, type DoseLog } from '../../lib/database';

export default function ProtocolsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [protocols, setProtocols] = useState<(Protocol & { lastDose?: DoseLog | null })[]>([]);
  const [showAll, setShowAll] = useState(false);

  const loadProtocols = useCallback(async () => {
    const protos = showAll ? await getAllProtocols() : await getActiveProtocols();
    const withLastDose = await Promise.all(
      protos.map(async (p) => ({
        ...p,
        lastDose: await getLastDoseForProtocol(p.id),
      }))
    );
    setProtocols(withLastDose);
  }, [showAll]);

  useFocusEffect(useCallback(() => { loadProtocols(); }, [loadProtocols]));

  const handleDelete = (protocol: Protocol) => {
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
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowAll(!showAll)}
        >
          <Text style={styles.filterText}>{showAll ? 'All' : 'Active'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/protocol/new')}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={protocols}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flask-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Protocols Yet</Text>
            <Text style={styles.emptyText}>
              Create a protocol to start tracking your doses.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/protocol/new')}
            >
              <Text style={styles.emptyBtnText}>Create Protocol</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const nextDose = getNextDoseDate(item);
          const isOverdue = nextDose === 'Overdue';

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/protocol/${item.id}`)}
              onLongPress={() => handleDelete(item)}
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
                <TouchableOpacity
                  style={styles.quickLogBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/log/${item.id}`);
                  }}
                >
                  <Ionicons name="add-circle" size={18} color={colors.primary} />
                  <Text style={styles.quickLogText}>Log Dose</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
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
    },
    addBtnText: { color: '#ffffff', fontWeight: '600', fontSize: FontSize.sm },
    listContent: { padding: Spacing.lg, paddingTop: 0 },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.md,
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
    cardDetails: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: FontSize.sm, color: colors.textSecondary },
    quickLogBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Spacing.md,
    },
    quickLogText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', color: colors.text, marginTop: Spacing.lg },
    emptyText: { fontSize: FontSize.md, color: colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
    emptyBtn: {
      backgroundColor: colors.primary, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, marginTop: Spacing.xl,
    },
    emptyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: FontSize.md },
  });
}
