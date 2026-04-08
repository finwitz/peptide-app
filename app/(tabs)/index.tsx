import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import {
  calculateReconstitution, SYRINGE_TYPES, formatSyringeUnits, formatMl,
  type SyringeType, type ReconstitutionResult,
} from '../../lib/calculations';

const SYRINGE_OPTIONS: SyringeType[] = ['U100', 'U50', 'U40', 'U30', 'U20', 'tuberculin'];

export default function CalculatorScreen() {
  const colors = useThemeColors();
  const [vialMg, setVialMg] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [doseMcg, setDoseMcg] = useState('');
  const [syringeType, setSyringeType] = useState<SyringeType>('U100');
  const [result, setResult] = useState<ReconstitutionResult | null>(null);
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg');

  const calculate = useCallback(() => {
    const vial = parseFloat(vialMg);
    const water = parseFloat(waterMl);
    let dose = parseFloat(doseMcg);

    if (isNaN(vial) || isNaN(water) || isNaN(dose) || vial <= 0 || water <= 0 || dose <= 0) {
      setResult(null);
      return;
    }

    if (doseUnit === 'mg') {
      dose = dose * 1000;
    }

    setResult(calculateReconstitution({ vialMg: vial, waterMl: water, desiredDoseMcg: dose, syringeType }));
  }, [vialMg, waterMl, doseMcg, syringeType, doseUnit]);

  React.useEffect(() => { calculate(); }, [calculate]);

  const clearAll = () => {
    setVialMg('');
    setWaterMl('');
    setDoseMcg('');
    setResult(null);
  };

  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.disclaimerText}>
            Mathematical calculator only. Not medical advice.
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reconstitution</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Peptide in vial</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={vialMg}
                  onChangeText={setVialMg}
                  placeholder="5"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <Text style={styles.unitLabel}>mg</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>BAC water added</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={waterMl}
                  onChangeText={setWaterMl}
                  placeholder="2"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <Text style={styles.unitLabel}>mL</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Desired dose</Text>
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[styles.unitBtn, doseUnit === 'mcg' && styles.unitBtnActive]}
                  onPress={() => setDoseUnit('mcg')}
                >
                  <Text style={[styles.unitBtnText, doseUnit === 'mcg' && styles.unitBtnTextActive]}>mcg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitBtn, doseUnit === 'mg' && styles.unitBtnActive]}
                  onPress={() => setDoseUnit('mg')}
                >
                  <Text style={[styles.unitBtnText, doseUnit === 'mg' && styles.unitBtnTextActive]}>mg</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={doseMcg}
                onChangeText={setDoseMcg}
                placeholder={doseUnit === 'mcg' ? '250' : '0.25'}
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <Text style={styles.unitLabel}>{doseUnit}</Text>
            </View>
          </View>
        </View>

        {/* Syringe Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Syringe Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.syringeScroll}>
            {SYRINGE_OPTIONS.map((type) => {
              const info = SYRINGE_TYPES[type];
              const isSelected = type === syringeType;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.syringeChip, isSelected && styles.syringeChipActive]}
                  onPress={() => setSyringeType(type)}
                >
                  <Text style={[styles.syringeChipText, isSelected && styles.syringeChipTextActive]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.syringeDesc}>{SYRINGE_TYPES[syringeType].description}</Text>
        </View>

        {/* Results */}
        {result && (
          <View style={[styles.card, styles.resultCard]}>
            <Text style={styles.cardTitle}>Result</Text>

            {result.warningMessage && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={18} color={colors.warning} />
                <Text style={styles.warningText}>{result.warningMessage}</Text>
              </View>
            )}

            <View style={styles.resultGrid}>
              <ResultItem
                label="Draw Volume"
                value={formatMl(result.injectionMl)}
                unit="mL"
                highlight
                colors={colors}
              />
              <ResultItem
                label="Syringe Units"
                value={formatSyringeUnits(result.syringeUnits)}
                unit="units"
                highlight
                colors={colors}
              />
              <ResultItem
                label="Concentration"
                value={result.concentrationMcgPerMl.toFixed(0)}
                unit="mcg/mL"
                colors={colors}
              />
              <ResultItem
                label="Doses per Vial"
                value={result.dosesPerVial.toString()}
                unit="doses"
                colors={colors}
              />
            </View>
          </View>
        )}

        {/* Clear button */}
        {(vialMg || waterMl || doseMcg) && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ResultItem({ label, value, unit, highlight, colors }: {
  label: string; value: string; unit: string; highlight?: boolean; colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={{
      flex: 1,
      minWidth: '45%',
      backgroundColor: highlight ? colors.primaryLight : colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    }}>
      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{
          fontSize: highlight ? FontSize.xxl : FontSize.xl,
          fontWeight: '700',
          color: highlight ? colors.primary : colors.text,
        }}>
          {value}
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginLeft: 4 }}>{unit}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    disclaimer: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.sm,
      padding: Spacing.sm, marginBottom: Spacing.lg,
    },
    disclaimerText: { fontSize: FontSize.xs, color: colors.primary, flex: 1 },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.lg,
      ...Shadows.sm,
    },
    resultCard: { borderColor: colors.primary, borderWidth: 1.5, ...Shadows.md },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
    inputRow: { flexDirection: 'row', gap: Spacing.md },
    inputGroup: { flex: 1, marginBottom: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: Spacing.xs },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.inputBorder,
    },
    input: {
      flex: 1, fontSize: FontSize.lg, fontWeight: '600',
      color: colors.text, padding: Spacing.md,
    },
    unitLabel: {
      fontSize: FontSize.sm, color: colors.textTertiary,
      paddingRight: Spacing.md, fontWeight: '600',
    },
    unitToggle: { flexDirection: 'row', borderRadius: BorderRadius.sm, overflow: 'hidden' },
    unitBtn: {
      paddingHorizontal: Spacing.sm, paddingVertical: 2,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    unitBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    unitBtnText: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' },
    unitBtnTextActive: { color: '#ffffff' },
    syringeScroll: { marginBottom: Spacing.sm },
    syringeChip: {
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border, marginRight: Spacing.sm,
    },
    syringeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    syringeChipText: { fontSize: FontSize.sm, color: colors.text, fontWeight: '500' },
    syringeChipTextActive: { color: '#ffffff' },
    syringeDesc: { fontSize: FontSize.xs, color: colors.textTertiary, fontStyle: 'italic' },
    resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    warningBanner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.warningLight, borderRadius: BorderRadius.sm,
      padding: Spacing.md, marginBottom: Spacing.md,
    },
    warningText: { fontSize: FontSize.sm, color: colors.warning, flex: 1 },
    clearBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: Spacing.xs, paddingVertical: Spacing.md,
    },
    clearBtnText: { fontSize: FontSize.md, color: colors.primary, fontWeight: '600' },
  });
}
