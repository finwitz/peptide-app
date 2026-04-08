import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import { useToast } from '../../components/Toast';
import { getProtocolById, updateProtocol, type Protocol } from '../../lib/database';
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

export default function EditProtocolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const toast = useToast();

  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [name, setName] = useState('');
  const [doseMcg, setDoseMcg] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg');
  const [frequencyDays, setFrequencyDays] = useState(1);
  const [customFrequency, setCustomFrequency] = useState('');
  const [vialMg, setVialMg] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [syringeType, setSyringeType] = useState<SyringeType>('U100');
  const [route, setRoute] = useState('SubQ');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProtocolById(parseInt(id)).then((proto) => {
      if (!proto) return;
      setProtocol(proto);
      setName(proto.name);
      if (proto.dose_mcg >= 1000) {
        setDoseUnit('mg');
        setDoseMcg((proto.dose_mcg / 1000).toString());
      } else {
        setDoseUnit('mcg');
        setDoseMcg(proto.dose_mcg.toString());
      }
      setFrequencyDays(proto.frequency_days);
      const isPreset = FREQUENCY_PRESETS.some(f => f.days === proto.frequency_days);
      if (!isPreset) setCustomFrequency(proto.frequency_days.toString());
      setRoute(proto.route);
      setNotes(proto.notes ?? '');
      if (proto.vial_mg) setVialMg(proto.vial_mg.toString());
      if (proto.water_ml) setWaterMl(proto.water_ml.toString());
      setSyringeType((proto.syringe_type as SyringeType) || 'U100');
    });
  }, [id]);

  const handleSave = async () => {
    if (!protocol || isSaving) return;

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

    setIsSaving(true);
    try {
      await updateProtocol(protocol.id, {
        name: name || protocol.name,
        dose_mcg: doseValue,
        frequency_days: freq,
        vial_mg: vialMg ? parseFloat(vialMg) : null,
        water_ml: waterMl ? parseFloat(waterMl) : null,
        syringe_type: syringeType,
        route,
        notes: notes || null,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({ message: 'Protocol updated', type: 'success' });
      router.back();
    } catch (e) {
      toast.show({ message: 'Failed to save changes', type: 'error' });
      setIsSaving(false);
    }
  };

  if (!protocol) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textTertiary, marginTop: Spacing.sm }}>Loading protocol...</Text>
      </View>
    );
  }

  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Peptide (read-only) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Peptide</Text>
          <View style={styles.readOnly}>
            <Ionicons name="flask-outline" size={18} color={colors.primary} />
            <Text style={styles.readOnlyText}>{protocol.peptide_name}</Text>
          </View>
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

        {/* Reconstitution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reconstitution (Optional)</Text>
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
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Save protocol changes"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: Spacing.sm }} />
          ) : null}
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
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
    readOnly: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md,
    },
    readOnlyText: { fontSize: FontSize.md, fontWeight: '600', color: colors.primary },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: Spacing.xs },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
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
    unitToggle: { flexDirection: 'row', borderRadius: BorderRadius.sm, overflow: 'hidden' as const },
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
