import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useToast } from '../../components/Toast';
import {
  getInventoryById, updateInventoryItem, type InventoryItem,
} from '../../lib/database';

export default function EditInventoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const toast = useToast();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [peptideName, setPeptideName] = useState('');
  const [vialMg, setVialMg] = useState('');
  const [mgRemaining, setMgRemaining] = useState('');
  const [bacWaterMl, setBacWaterMl] = useState('');
  const [reconstitutionDate, setReconstitutionDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [source, setSource] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'empty'>('active');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getInventoryById(parseInt(id, 10)).then((inv) => {
      if (!inv) return;
      setItem(inv);
      setPeptideName(inv.peptide_name);
      setVialMg(inv.vial_mg.toString());
      setMgRemaining(inv.mg_remaining.toString());
      setBacWaterMl(inv.bac_water_ml?.toString() ?? '');
      setReconstitutionDate(inv.reconstitution_date ?? '');
      setExpirationDate(inv.expiration_date ?? '');
      setSource(inv.source ?? '');
      setLotNumber(inv.lot_number ?? '');
      setNotes(inv.notes ?? '');
      setStatus((inv.status as 'active' | 'empty') ?? 'active');
    });
  }, [id]);

  const handleSave = async () => {
    if (!item || isSaving) return;
    const mg = parseFloat(vialMg);
    const rem = parseFloat(mgRemaining);
    if (isNaN(mg) || mg <= 0 || isNaN(rem) || rem < 0) {
      Alert.alert('Error', 'Vial size and remaining must be valid numbers.');
      return;
    }
    setIsSaving(true);
    try {
      await updateInventoryItem(item.id, {
        peptide_name: peptideName.trim() || item.peptide_name,
        vial_mg: mg,
        mg_remaining: rem,
        bac_water_ml: bacWaterMl ? parseFloat(bacWaterMl) : null,
        reconstitution_date: reconstitutionDate || null,
        expiration_date: expirationDate || null,
        source: source.trim() || null,
        lot_number: lotNumber.trim() || null,
        notes: notes.trim() || null,
        status,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({ message: 'Vial updated', type: 'success' });
      router.back();
    } catch {
      toast.show({ message: 'Failed to save', type: 'error' });
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert(
      'Delete Vial',
      `Permanently delete this ${item.peptide_name} vial?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await updateInventoryItem(item.id, { status: 'deleted' });
            router.back();
          },
        },
      ]
    );
  };

  if (!item) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Peptide Name</Text>
      <TextInput style={styles.input} value={peptideName} onChangeText={setPeptideName} />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Vial Size (mg)</Text>
          <TextInput style={styles.input} value={vialMg} onChangeText={setVialMg} keyboardType="decimal-pad" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>Remaining (mg)</Text>
          <TextInput style={styles.input} value={mgRemaining} onChangeText={setMgRemaining} keyboardType="decimal-pad" />
        </View>
      </View>

      <Text style={styles.label}>BAC Water (mL)</Text>
      <TextInput style={styles.input} value={bacWaterMl} onChangeText={setBacWaterMl} keyboardType="decimal-pad" placeholder="e.g. 2" placeholderTextColor={colors.textTertiary} />

      <Text style={styles.label}>Reconstitution Date</Text>
      <TextInput style={styles.input} value={reconstitutionDate} onChangeText={setReconstitutionDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />

      <Text style={styles.label}>Expiration Date</Text>
      <TextInput style={styles.input} value={expirationDate} onChangeText={setExpirationDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />

      <Text style={styles.label}>Source / Vendor</Text>
      <TextInput style={styles.input} value={source} onChangeText={setSource} />

      <Text style={styles.label}>Lot Number</Text>
      <TextInput style={styles.input} value={lotNumber} onChangeText={setLotNumber} />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.statusRow}>
        {(['active', 'empty'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, status === s && styles.statusBtnActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
        <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteBtnText}>Delete Vial</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: Spacing.md },
    input: {
      backgroundColor: colors.card, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.md, fontSize: FontSize.md, color: colors.text,
    },
    row: { flexDirection: 'row', gap: Spacing.md },
    flex1: { flex: 1 },
    statusRow: { flexDirection: 'row', gap: Spacing.sm },
    statusBtn: {
      flex: 1, paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md, backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    statusBtnText: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
    statusBtnTextActive: { color: '#ffffff' },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, marginTop: Spacing.xl,
    },
    saveBtnText: { color: '#ffffff', fontSize: FontSize.md, fontWeight: '700' },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.lg,
    },
    deleteBtnText: { fontSize: FontSize.md, color: colors.danger, fontWeight: '600' },
  });
}
