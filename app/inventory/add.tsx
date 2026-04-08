import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import { useToast } from '../../components/Toast';
import {
  createInventoryItem, searchPeptides, getAllPeptides,
  type Peptide,
} from '../../lib/database';

export default function AddInventoryScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const toast = useToast();

  const [peptideQuery, setPeptideQuery] = useState('');
  const [selectedPeptide, setSelectedPeptide] = useState<Peptide | null>(null);
  const [suggestions, setSuggestions] = useState<Peptide[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [vialMg, setVialMg] = useState('');
  const [bacWaterMl, setBacWaterMl] = useState('');
  const [expirationDays, setExpirationDays] = useState('30');
  const [source, setSource] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (peptideQuery.length > 0 && !selectedPeptide) {
      searchPeptides(peptideQuery).then((results) => {
        setSuggestions(results.slice(0, 6));
        setShowSuggestions(true);
      });
    } else if (!peptideQuery) {
      setShowSuggestions(false);
    }
  }, [peptideQuery, selectedPeptide]);

  const selectPeptide = (p: Peptide) => {
    setSelectedPeptide(p);
    setPeptideQuery(p.name);
    setShowSuggestions(false);
  };

  const clearPeptide = () => {
    setSelectedPeptide(null);
    setPeptideQuery('');
  };

  const handleSave = async () => {
    const mg = parseFloat(vialMg);
    if (!peptideQuery.trim() || isNaN(mg) || mg <= 0) return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString().split('T')[0];
      const expDays = parseInt(expirationDays) || 30;
      const expDate = new Date(Date.now() + expDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await createInventoryItem({
        peptide_name: peptideQuery.trim(),
        peptide_id: selectedPeptide?.id ?? null,
        vial_mg: mg,
        mg_remaining: mg,
        bac_water_ml: bacWaterMl ? parseFloat(bacWaterMl) : null,
        reconstitution_date: now,
        expiration_date: expDate,
        source: source.trim() || null,
        lot_number: lotNumber.trim() || null,
        notes: notes.trim() || null,
        protocol_id: null,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({ message: `${peptideQuery.trim()} vial added to inventory`, type: 'success' });
      router.back();
    } catch (e) {
      toast.show({ message: 'Failed to save — please try again', type: 'error' });
      setIsSaving(false);
    }
  };

  const isValid = peptideQuery.trim().length > 0 && parseFloat(vialMg) > 0;
  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Peptide Search */}
      <Text style={styles.label}>Peptide *</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search peptide..."
          placeholderTextColor={colors.textTertiary}
          value={peptideQuery}
          onChangeText={(t) => { setPeptideQuery(t); setSelectedPeptide(null); }}
        />
        {selectedPeptide && (
          <TouchableOpacity onPress={clearPeptide} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((p) => (
            <TouchableOpacity key={p.id} style={styles.suggestion} onPress={() => selectPeptide(p)}>
              <Text style={styles.suggestionName}>{p.name}</Text>
              <Text style={styles.suggestionCat}>{p.category}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Vial Size */}
      <Text style={styles.label}>Vial Size (mg) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 5"
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        value={vialMg}
        onChangeText={setVialMg}
      />

      {/* BAC Water */}
      <Text style={styles.label}>BAC Water (mL)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2"
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        value={bacWaterMl}
        onChangeText={setBacWaterMl}
      />

      {/* Expiration */}
      <Text style={styles.label}>Days Until Expiration</Text>
      <TextInput
        style={styles.input}
        placeholder="30"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        value={expirationDays}
        onChangeText={setExpirationDays}
      />

      {/* Source */}
      <Text style={styles.label}>Source / Vendor</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Optimum Formula"
        placeholderTextColor={colors.textTertiary}
        value={source}
        onChangeText={setSource}
      />

      {/* Lot Number */}
      <Text style={styles.label}>Lot Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Optional"
        placeholderTextColor={colors.textTertiary}
        value={lotNumber}
        onChangeText={setLotNumber}
      />

      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Optional notes..."
        placeholderTextColor={colors.textTertiary}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, (!isValid || isSaving) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!isValid || isSaving}
        accessibilityRole="button"
        accessibilityLabel="Add vial to inventory"
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
        )}
        <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Add to Inventory'}</Text>
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
    searchRow: { position: 'relative' },
    clearBtn: { position: 'absolute', right: 12, top: 14 },
    suggestionsBox: {
      backgroundColor: colors.card, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.cardBorder,
      marginTop: 4, overflow: 'hidden',
    },
    suggestion: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    suggestionName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
    suggestionCat: { fontSize: FontSize.xs, color: colors.textTertiary },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, marginTop: Spacing.xl,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#ffffff', fontSize: FontSize.md, fontWeight: '700' },
  });
}
