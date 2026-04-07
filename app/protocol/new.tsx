import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { createProtocol, getAllPeptides, type Peptide } from '../../lib/database';
import { SYRINGE_TYPES, type SyringeType } from '../../lib/calculations';

const FREQUENCY_PRESETS = [
  { label: 'Daily', days: 1 },
  { label: 'EOD', days: 2 },
  { label: '3x/week', days: 2.33 },
  { label: '2x/week', days: 3.5 },
  { label: 'Weekly', days: 7 },
  { label: 'Biweekly', days: 14 },
  { label: 'Monthly', days: 30 },
];

const ROUTE_OPTIONS = ['SubQ', 'IM', 'Nasal', 'Oral', 'IV', 'Topical'];

export default function NewProtocolScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [selectedPeptide, setSelectedPeptide] = useState<Peptide | null>(null);
  const [showPeptideSearch, setShowPeptideSearch] = useState(false);
  const [peptideQuery, setPeptideQuery] = useState('');

  const [name, setName] = useState('');
  const [customPeptideName, setCustomPeptideName] = useState('');
  const [doseMcg, setDoseMcg] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg');
  const [frequencyDays, setFrequencyDays] = useState(1);
  const [customFrequency, setCustomFrequency] = useState('');
  const [vialMg, setVialMg] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [syringeType, setSyringeType] = useState<SyringeType>('U100');
  const [route, setRoute] = useState('SubQ');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getAllPeptides().then(setPeptides);
  }, []);

  const filteredPeptides = peptideQuery
    ? peptides.filter((p) =>
        p.name.toLowerCase().includes(peptideQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(peptideQuery.toLowerCase())
      )
    : peptides;

  const selectPeptide = (p: Peptide) => {
    setSelectedPeptide(p);
    setName(`${p.name} Protocol`);
    if (p.typical_dose_mcg_low) {
      const dose = p.typical_dose_mcg_low;
      if (dose >= 1000) {
        setDoseUnit('mg');
        setDoseMcg((dose / 1000).toString());
      } else {
        setDoseUnit('mcg');
        setDoseMcg(dose.toString());
      }
    }
    if (p.frequency) {
      const preset = FREQUENCY_PRESETS.find((f) => f.label === p.frequency);
      if (preset) setFrequencyDays(preset.days);
    }
    if (p.route) setRoute(p.route);
    setShowPeptideSearch(false);
    setPeptideQuery('');
  };

  const handleSave = async () => {
    const peptideName = selectedPeptide?.name || customPeptideName;
    if (!peptideName.trim()) {
      Alert.alert('Error', 'Please select or enter a peptide name.');
      return;
    }

    let doseValue = parseFloat(doseMcg);
    if (isNaN(doseValue) || doseValue <= 0) {
      Alert.alert('Error', 'Please enter a valid dose.');
      return;
    }
    if (doseUnit === 'mg') doseValue *= 1000;

    const freq = customFrequency ? parseFloat(customFrequency) : frequencyDays;
    if (isNaN(freq) || freq <= 0) {
      Alert.alert('Error', 'Please enter a valid frequency.');
      return;
    }

    await createProtocol({
      name: name || `${peptideName} Protocol`,
      peptide_id: selectedPeptide?.id ?? null,
      peptide_name: peptideName,
      dose_mcg: doseValue,
      frequency_days: freq,
      vial_mg: vialMg ? parseFloat(vialMg) : null,
      water_ml: waterMl ? parseFloat(waterMl) : null,
      syringe_type: syringeType,
      route,
      notes: notes || null,
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
    });

    router.back();
  };

  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Peptide Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Peptide</Text>

          {selectedPeptide ? (
            <View style={styles.selectedPeptide}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName}>{selectedPeptide.name}</Text>
                <Text style={styles.selectedCategory}>{selectedPeptide.category}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedPeptide(null); setShowPeptideSearch(true); }}>
                <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : showPeptideSearch ? (
            <>
              <TextInput
                style={styles.searchInput}
                value={peptideQuery}
                onChangeText={setPeptideQuery}
                placeholder="Search peptides..."
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
              <View style={styles.peptideList}>
                {filteredPeptides.slice(0, 8).map((p) => (
                  <TouchableOpacity key={p.id} style={styles.peptideOption} onPress={() => selectPeptide(p)}>
                    <Text style={styles.peptideOptionName}>{p.name}</Text>
                    <Text style={styles.peptideOptionCat}>{p.category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowPeptideSearch(true)}>
                <Ionicons name="search-outline" size={18} color={colors.primary} />
                <Text style={styles.selectBtnText}>Select from library</Text>
              </TouchableOpacity>
              <Text style={styles.orText}>or enter custom name:</Text>
              <TextInput
                style={styles.input}
                value={customPeptideName}
                onChangeText={setCustomPeptideName}
                placeholder="e.g. BPC-157"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}
        </View>

        {/* Protocol Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Protocol Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="My Protocol"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Dosing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dosing</Text>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Dose per injection</Text>
            <View style={styles.unitToggle}>
              {(['mcg', 'mg'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, doseUnit === u && styles.unitBtnActive]}
                  onPress={() => setDoseUnit(u)}
                >
                  <Text style={[styles.unitBtnText, doseUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={doseMcg}
            onChangeText={setDoseMcg}
            placeholder={doseUnit === 'mcg' ? '250' : '0.25'}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.freqScroll}>
            {FREQUENCY_PRESETS.map((f) => (
              <TouchableOpacity
                key={f.label}
                style={[styles.freqChip, frequencyDays === f.days && !customFrequency && styles.freqChipActive]}
                onPress={() => { setFrequencyDays(f.days); setCustomFrequency(''); }}
              >
                <Text style={[styles.freqChipText, frequencyDays === f.days && !customFrequency && styles.freqChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={[styles.input, { marginTop: Spacing.sm }]}
            value={customFrequency}
            onChangeText={setCustomFrequency}
            placeholder="Or enter custom days between doses"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Route</Text>
          <View style={styles.routeGrid}>
            {ROUTE_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.routeChip, route === r && styles.routeChipActive]}
                onPress={() => setRoute(r)}
              >
                <Text style={[styles.routeChipText, route === r && styles.routeChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reconstitution (optional) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reconstitution (Optional)</Text>
          <Text style={styles.helperText}>Save your vial info for quick calculations later.</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vial size</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
                  value={vialMg}
                  onChangeText={setVialMg}
                  placeholder="5"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitSuffix}>mg</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>BAC water</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
                  value={waterMl}
                  onChangeText={setWaterMl}
                  placeholder="2"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitSuffix}>mL</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Syringe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['U100', 'U50', 'U40', 'U30'] as SyringeType[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.freqChip, syringeType === s && styles.freqChipActive]}
                onPress={() => setSyringeType(s)}
              >
                <Text style={[styles.freqChipText, syringeType === s && styles.freqChipTextActive]}>
                  {SYRINGE_TYPES[s].label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this protocol..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Create Protocol</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: Spacing.xs },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    helperText: { fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: Spacing.md },
    input: {
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.inputBorder,
      padding: Spacing.md, fontSize: FontSize.md, color: colors.text,
    },
    inputRow: { flexDirection: 'row', gap: Spacing.md },
    inputGroup: { flex: 1 },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.inputBorder,
    },
    inputInner: { flex: 1, padding: Spacing.md, fontSize: FontSize.md, color: colors.text },
    unitSuffix: { paddingRight: Spacing.md, fontSize: FontSize.sm, color: colors.textTertiary, fontWeight: '600' },
    searchInput: {
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.inputFocusBorder,
      padding: Spacing.md, fontSize: FontSize.md, color: colors.text,
      marginBottom: Spacing.sm,
    },
    peptideList: { maxHeight: 240 },
    peptideOption: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    peptideOptionName: { fontSize: FontSize.md, color: colors.text, fontWeight: '500' },
    peptideOptionCat: { fontSize: FontSize.xs, color: colors.textTertiary },
    selectedPeptide: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    selectedName: { fontSize: FontSize.md, fontWeight: '600', color: colors.primary },
    selectedCategory: { fontSize: FontSize.xs, color: colors.textSecondary },
    selectBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.md,
      padding: Spacing.md, marginBottom: Spacing.sm,
    },
    selectBtnText: { fontSize: FontSize.md, color: colors.primary, fontWeight: '600' },
    orText: { fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: Spacing.xs, marginTop: Spacing.sm },
    unitToggle: { flexDirection: 'row', borderRadius: BorderRadius.sm, overflow: 'hidden' },
    unitBtn: {
      paddingHorizontal: Spacing.sm, paddingVertical: 2,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    unitBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    unitBtnText: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' },
    unitBtnTextActive: { color: '#ffffff' },
    freqScroll: { marginBottom: Spacing.xs },
    freqChip: {
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border, marginRight: Spacing.sm,
    },
    freqChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    freqChipText: { fontSize: FontSize.sm, color: colors.text, fontWeight: '500' },
    freqChipTextActive: { color: '#ffffff' },
    routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    routeChip: {
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    routeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    routeChipText: { fontSize: FontSize.sm, color: colors.text, fontWeight: '500' },
    routeChipTextActive: { color: '#ffffff' },
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, alignItems: 'center',
    },
    saveBtnText: { color: '#ffffff', fontSize: FontSize.lg, fontWeight: '700' },
  });
}
