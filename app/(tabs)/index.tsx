import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import AnimatedPressable from '../../components/AnimatedPressable';
import {
  calculateReconstitution, SYRINGE_TYPES, formatSyringeUnits, formatMl,
  type SyringeType, type ReconstitutionResult,
} from '../../lib/calculations';

const SYRINGE_OPTIONS: SyringeType[] = ['U100', 'U50', 'U40', 'U30', 'U20', 'tuberculin'];

export default function CalculatorScreen() {
  const colors = useThemeColors();
  const router = useRouter();
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

    if (doseUnit === 'mg') dose = dose * 1000;
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero header */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="calculator" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.heroTitle}>Reconstitution</Text>
            <Text style={styles.heroSubtitle}>Calculator</Text>
          </View>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Peptide amount</Text>
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
                <View style={styles.unitPill}>
                  <Text style={styles.unitPillText}>mg</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>BAC water</Text>
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
                <View style={styles.unitPill}>
                  <Text style={styles.unitPillText}>mL</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Desired dose</Text>
              <View style={styles.unitToggle}>
                <AnimatedPressable
                  style={[styles.unitBtn, doseUnit === 'mcg' && styles.unitBtnActive]}
                  onPress={() => setDoseUnit('mcg')}
                  haptic="selection"
                  scaleDown={0.9}
                >
                  <Text style={[styles.unitBtnText, doseUnit === 'mcg' && styles.unitBtnTextActive]}>mcg</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.unitBtn, doseUnit === 'mg' && styles.unitBtnActive]}
                  onPress={() => setDoseUnit('mg')}
                  haptic="selection"
                  scaleDown={0.9}
                >
                  <Text style={[styles.unitBtnText, doseUnit === 'mg' && styles.unitBtnTextActive]}>mg</Text>
                </AnimatedPressable>
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
              <View style={styles.unitPill}>
                <Text style={styles.unitPillText}>{doseUnit}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Syringe Selection */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Syringe Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg }} contentContainerStyle={{ paddingHorizontal: Spacing.lg }}>
            {SYRINGE_OPTIONS.map((type) => {
              const info = SYRINGE_TYPES[type];
              const isSelected = type === syringeType;
              return (
                <AnimatedPressable
                  key={type}
                  style={[styles.syringeChip, isSelected && styles.syringeChipActive]}
                  onPress={() => setSyringeType(type)}
                  haptic="selection"
                  scaleDown={0.93}
                >
                  <Text style={[styles.syringeChipText, isSelected && styles.syringeChipTextActive]}>
                    {info.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
          <Text style={styles.syringeDesc}>{SYRINGE_TYPES[syringeType].description}</Text>
        </View>

        {/* Results */}
        {result && (
          <View style={styles.resultCard}>
            {result.warningMessage && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={styles.warningText}>{result.warningMessage}</Text>
              </View>
            )}

            <View style={styles.resultHero}>
              <View style={styles.resultHeroItem}>
                <Text style={styles.resultHeroLabel}>Draw</Text>
                <Text style={styles.resultHeroValue}>{formatMl(result.injectionMl)}</Text>
                <Text style={styles.resultHeroUnit}>mL</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultHeroItem}>
                <Text style={styles.resultHeroLabel}>Mark</Text>
                <Text style={styles.resultHeroValue}>{formatSyringeUnits(result.syringeUnits)}</Text>
                <Text style={styles.resultHeroUnit}>units</Text>
              </View>
            </View>

            <View style={styles.resultMeta}>
              <View style={styles.resultMetaItem}>
                <Ionicons name="beaker-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.resultMetaText}>
                  {result.concentrationMcgPerMl.toFixed(0)} mcg/mL
                </Text>
              </View>
              <View style={styles.resultMetaItem}>
                <Ionicons name="layers-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.resultMetaText}>
                  {result.dosesPerVial} doses/vial
                </Text>
              </View>
            </View>

            <AnimatedPressable
              style={styles.saveProtocolBtn}
              onPress={() => router.push({
                pathname: '/protocol/new',
                params: {
                  prefillVialMg: vialMg,
                  prefillWaterMl: waterMl,
                  prefillDose: doseMcg,
                  prefillDoseUnit: doseUnit,
                  prefillSyringe: syringeType,
                },
              })}
              haptic="light"
              scaleDown={0.97}
            >
              <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
              <Text style={styles.saveProtocolText}>Save as Protocol</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </AnimatedPressable>
          </View>
        )}

        {/* Clear */}
        {(vialMg || waterMl || doseMcg) && (
          <AnimatedPressable style={styles.clearBtn} onPress={clearAll} haptic="light" scaleDown={0.95}>
            <Ionicons name="refresh-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </AnimatedPressable>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.disclaimerText}>Mathematical calculator only. Not medical advice.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.xl },
    // Hero
    hero: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      marginBottom: Spacing.xxl,
    },
    heroIconWrap: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    heroSubtitle: { fontSize: FontSize.md, color: colors.textSecondary, marginTop: -2 },
    // Cards
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      padding: Spacing.xl, marginBottom: Spacing.lg,
      overflow: 'hidden',
      ...Shadows.sm,
    },
    cardAccent: {
      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      backgroundColor: colors.primary, borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg,
    },
    cardLabel: {
      fontSize: FontSize.xs, fontWeight: '700', color: colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md,
    },
    // Inputs
    inputRow: { flexDirection: 'row', gap: Spacing.md },
    inputGroup: { flex: 1, marginBottom: Spacing.md },
    label: {
      fontSize: FontSize.xs, fontWeight: '600', color: colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
    },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      borderWidth: 1.5, borderColor: colors.inputBorder,
    },
    input: {
      flex: 1, fontSize: FontSize.xl, fontWeight: '700',
      color: colors.text, padding: Spacing.md, paddingVertical: Spacing.lg,
    },
    unitPill: {
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.sm, paddingVertical: 4, marginRight: Spacing.sm,
    },
    unitPillText: { fontSize: FontSize.xs, fontWeight: '700', color: colors.primary },
    // Unit toggle
    unitToggle: { flexDirection: 'row', borderRadius: BorderRadius.sm, overflow: 'hidden', gap: 2 },
    unitBtn: {
      paddingHorizontal: Spacing.md, paddingVertical: 4,
      borderRadius: BorderRadius.sm, backgroundColor: colors.surface,
    },
    unitBtnActive: { backgroundColor: colors.primary },
    unitBtnText: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '700' },
    unitBtnTextActive: { color: '#ffffff' },
    // Syringe chips
    syringeChip: {
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderRadius: BorderRadius.full, backgroundColor: colors.surface,
      marginRight: Spacing.sm,
    },
    syringeChipActive: {
      backgroundColor: colors.primary,
      ...Shadows.glow(colors.primary),
    },
    syringeChipText: { fontSize: FontSize.sm, color: colors.text, fontWeight: '600' },
    syringeChipTextActive: { color: '#ffffff', fontWeight: '700' },
    syringeDesc: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: Spacing.md },
    // Results
    resultCard: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 2, borderColor: colors.primary,
      padding: Spacing.xl, marginBottom: Spacing.lg,
      ...Shadows.md,
    },
    resultHero: {
      flexDirection: 'row', alignItems: 'center',
    },
    resultHeroItem: { flex: 1, alignItems: 'center' },
    resultHeroLabel: {
      fontSize: FontSize.xs, fontWeight: '700', color: colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 1,
    },
    resultHeroValue: {
      fontSize: FontSize.hero, fontWeight: '800', color: colors.primary,
      letterSpacing: -1, lineHeight: FontSize.hero + 4,
    },
    resultHeroUnit: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: '600' },
    resultDivider: {
      width: 1, height: 50, backgroundColor: colors.border, marginHorizontal: Spacing.md,
    },
    resultMeta: {
      flexDirection: 'row', justifyContent: 'center', gap: Spacing.xxl,
      marginTop: Spacing.lg, paddingTop: Spacing.lg,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    resultMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    resultMetaText: { fontSize: FontSize.sm, color: colors.textSecondary },
    saveProtocolBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.md,
      padding: Spacing.md, marginTop: Spacing.lg,
    },
    saveProtocolText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '700' },
    // Warning
    warningBanner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.warningLight, borderRadius: BorderRadius.sm,
      padding: Spacing.md, marginBottom: Spacing.lg,
    },
    warningText: { fontSize: FontSize.xs, color: colors.warning, flex: 1, fontWeight: '500' },
    // Clear
    clearBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: Spacing.md,
    },
    clearBtnText: { fontSize: FontSize.sm, color: colors.textTertiary, fontWeight: '500' },
    // Disclaimer
    disclaimer: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      justifyContent: 'center', paddingTop: Spacing.md,
    },
    disclaimerText: { fontSize: FontSize.xs, color: colors.textTertiary },
  });
}
