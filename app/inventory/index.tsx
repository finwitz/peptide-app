import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import {
  getActiveInventory, updateInventoryItem,
  type InventoryItem,
} from '../../lib/database';

export default function InventoryScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getActiveInventory().then(setItems).catch(() => {});
    }, [])
  );

  const markEmpty = (item: InventoryItem) => {
    Alert.alert('Mark as Empty', `Mark ${item.peptide_name} vial as empty?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Empty', onPress: async () => {
          await updateInventoryItem(item.id, { status: 'empty' });
          getActiveInventory().then(setItems);
        },
      },
    ]);
  };

  const daysUntilExpiry = (date: string | null) => {
    if (!date) return null;
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return Math.round(diff);
  };

  const getStockColor = (item: InventoryItem) => {
    const pct = item.mg_remaining / item.vial_mg;
    if (pct > 0.5) return colors.success;
    if (pct > 0.2) return colors.warning;
    return colors.danger;
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/inventory/add')}
            accessibilityRole="button"
            accessibilityLabel="Add new vial to inventory"
          >
            <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.addBtnText}>Add Vial</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flask-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Vials</Text>
            <Text style={styles.emptySubtitle}>Track your peptide inventory to auto-deduct doses</Text>
          </View>
        }
        renderItem={({ item }) => {
          const pct = item.mg_remaining / item.vial_mg;
          const expDays = daysUntilExpiry(item.expiration_date);
          const stockColor = getStockColor(item);

          return (
            <TouchableOpacity style={styles.card} onLongPress={() => markEmpty(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.peptideName}>{item.peptide_name}</Text>
                {expDays !== null && expDays <= 7 && (
                  <View style={[styles.badge, { backgroundColor: colors.warningLight }]}>
                    <Text style={[styles.badgeText, { color: colors.warning }]}>
                      {expDays <= 0 ? 'Expired' : `${expDays}d left`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.max(2, pct * 100)}%`, backgroundColor: stockColor }]} />
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.detailText}>
                  {item.mg_remaining.toFixed(1)} / {item.vial_mg} mg remaining
                </Text>
                {item.bac_water_ml && (
                  <Text style={styles.detailMeta}>{item.bac_water_ml} mL BAC water</Text>
                )}
                {item.reconstitution_date && (
                  <Text style={styles.detailMeta}>
                    Reconstituted: {new Date(item.reconstitution_date).toLocaleDateString()}
                  </Text>
                )}
                {item.source && (
                  <Text style={styles.detailMeta}>Source: {item.source}</Text>
                )}
              </View>
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
    list: { padding: Spacing.lg },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      padding: Spacing.md, marginBottom: Spacing.lg,
    },
    addBtnText: { color: '#ffffff', fontSize: FontSize.md, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginTop: Spacing.md },
    emptySubtitle: { fontSize: FontSize.sm, color: colors.textTertiary, marginTop: 4, textAlign: 'center' },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.md,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    peptideName: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    badge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
    progressBg: {
      height: 6, backgroundColor: colors.cardBorder, borderRadius: 3,
      marginBottom: Spacing.sm, overflow: 'hidden',
    },
    progressFill: { height: 6, borderRadius: 3 },
    cardDetails: { gap: 2 },
    detailText: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text },
    detailMeta: { fontSize: FontSize.xs, color: colors.textTertiary },
  });
}
