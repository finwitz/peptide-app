import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import { useToast } from '../../components/Toast';
import {
  getProtocolById, logDose, getInjectionSites, getInventoryForPeptide,
  type Protocol, type InjectionSite, type InventoryItem,
} from '../../lib/database';

type SiteKey = string;

const SITE_LABELS: Record<string, string> = {
  abdomen_left: 'Left Abdomen',
  abdomen_right: 'Right Abdomen',
  thigh_left: 'Left Thigh',
  thigh_right: 'Right Thigh',
  deltoid_left: 'Left Deltoid',
  deltoid_right: 'Right Deltoid',
  glute_left: 'Left Glute',
  glute_right: 'Right Glute',
};

const SITE_SHORT: Record<string, string> = {
  abdomen_left: 'L Abd',
  abdomen_right: 'R Abd',
  thigh_left: 'L Thigh',
  thigh_right: 'R Thigh',
  deltoid_left: 'L Delt',
  deltoid_right: 'R Delt',
  glute_left: 'L Glute',
  glute_right: 'R Glute',
};

const REST_DAYS = 7;

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatCustomDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseCustomDate(text: string): Date | null {
  const m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  if (isNaN(date.getTime()) || date.getTime() > Date.now()) return null;
  return date;
}

function getSiteStatus(site: InjectionSite): 'green' | 'yellow' | 'red' {
  if (!site.last_used) return 'green';
  const lastUsed = new Date(site.last_used);
  const now = new Date();
  const daysSince = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= REST_DAYS) return 'green';
  if (daysSince >= REST_DAYS * 0.5) return 'yellow';
  return 'red';
}

function getSuggestedSite(sites: InjectionSite[]): string | null {
  const greenSites = sites.filter((s) => getSiteStatus(s) === 'green');
  if (greenSites.length === 0) {
    // Pick the one with the oldest last_used
    const sorted = [...sites].sort((a, b) => {
      if (!a.last_used) return -1;
      if (!b.last_used) return 1;
      return new Date(a.last_used).getTime() - new Date(b.last_used).getTime();
    });
    return sorted[0]?.site_key ?? null;
  }
  // Among green sites, pick the one with oldest usage (or never used)
  const sorted = greenSites.sort((a, b) => {
    if (!a.last_used) return -1;
    if (!b.last_used) return 1;
    return new Date(a.last_used).getTime() - new Date(b.last_used).getTime();
  });
  return sorted[0]?.site_key ?? null;
}

export default function LogDoseScreen() {
  const { protocolId } = useLocalSearchParams<{ protocolId: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const toast = useToast();

  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [sites, setSites] = useState<InjectionSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [suggestedSite, setSuggestedSite] = useState<string | null>(null);
  const [doseOverride, setDoseOverride] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg');
  const [notes, setNotes] = useState('');
  const [sideEffects, setSideEffects] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [vials, setVials] = useState<InventoryItem[]>([]);
  const [selectedVial, setSelectedVial] = useState<number | null>(null);
  const [loggedAt, setLoggedAt] = useState<Date>(new Date());

  useEffect(() => {
    async function load() {
      if (!protocolId) return;
      const proto = await getProtocolById(parseInt(protocolId));
      setProtocol(proto);

      const allSites = await getInjectionSites();
      setSites(allSites);
      const suggested = getSuggestedSite(allSites);
      setSuggestedSite(suggested);
      setSelectedSite(suggested);

      // Load matching inventory vials
      if (proto) {
        const inv = await getInventoryForPeptide(proto.peptide_name);
        setVials(inv);
        if (inv.length === 1) setSelectedVial(inv[0].id);
        // Default dose unit to mg if protocol dose is large enough
        if (proto.dose_mcg >= 1000) setDoseUnit('mg');
      }
    }
    load();
  }, [protocolId]);

  const handleSave = async () => {
    if (!protocol || isSaving) return;
    setIsSaving(true);

    try {
      let dose: number;
      if (doseOverride.trim()) {
        const parsed = parseFloat(doseOverride);
        if (isNaN(parsed) || parsed <= 0) {
          Alert.alert('Error', 'Invalid dose value.');
          setIsSaving(false);
          return;
        }
        dose = doseUnit === 'mg' ? parsed * 1000 : parsed;
      } else {
        dose = protocol.dose_mcg;
      }

      await logDose(
        protocol.id,
        dose,
        selectedSite ?? undefined,
        notes || undefined,
        sideEffects || undefined,
        selectedVial ?? undefined,
        loggedAt.toISOString(),
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({ message: `${protocol.peptide_name} dose logged`, type: 'success' });
      router.back();
    } catch (e) {
      toast.show({ message: 'Failed to log dose', type: 'error' });
      setIsSaving(false);
    }
  };

  if (!protocol) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textTertiary, marginTop: Spacing.sm }}>Loading...</Text>
      </View>
    );
  }

  const statusColors = {
    green: colors.success,
    yellow: colors.warning,
    red: colors.danger,
  };

  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Protocol info */}
        <View style={styles.protocolInfo}>
          <Text style={styles.protocolName}>{protocol.peptide_name}</Text>
          <Text style={styles.protocolDose}>
            Default: {protocol.dose_mcg >= 1000 ? `${(protocol.dose_mcg / 1000).toFixed(1)} mg` : `${protocol.dose_mcg} mcg`}
          </Text>
        </View>

        {/* Dose */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Dose</Text>
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
            value={doseOverride}
            onChangeText={setDoseOverride}
            placeholder={
              doseUnit === 'mg'
                ? `${(protocol.dose_mcg / 1000).toFixed(2)} mg (default)`
                : `${protocol.dose_mcg} mcg (default)`
            }
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
          <Text style={styles.helperText}>Leave blank to use default dose</Text>
        </View>

        {/* When */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>When</Text>
          <View style={styles.whenDisplay}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.whenText}>
              {loggedAt.toLocaleString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.whenPresets}>
            {([
              { label: 'Now', offset: 0 },
              { label: '1h ago', offset: -1 },
              { label: '3h ago', offset: -3 },
              { label: '6h ago', offset: -6 },
              { label: '12h ago', offset: -12 },
              { label: 'Yesterday', offset: -24 },
            ] as const).map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={styles.whenChip}
                onPress={() => setLoggedAt(new Date(Date.now() + preset.offset * 60 * 60 * 1000))}
              >
                <Text style={styles.whenChipText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helperText}>Or enter a custom date/time below (YYYY-MM-DD HH:MM)</Text>
          <TextInput
            style={styles.input}
            placeholder={formatCustomDate(new Date())}
            placeholderTextColor={colors.textTertiary}
            onChangeText={(text) => {
              const parsed = parseCustomDate(text);
              if (parsed) setLoggedAt(parsed);
            }}
          />
        </View>

        {/* Vial Selection */}
        {vials.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deduct from Vial</Text>
            {vials.map((vial) => {
              const pct = vial.vial_mg > 0 ? vial.mg_remaining / vial.vial_mg : 0;
              const isSelected = selectedVial === vial.id;
              const stockColor = pct > 0.5 ? colors.success : pct > 0.2 ? colors.warning : colors.danger;
              return (
                <TouchableOpacity
                  key={vial.id}
                  style={[
                    styles.vialOption,
                    { borderColor: isSelected ? colors.primary : colors.cardBorder },
                    isSelected && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setSelectedVial(isSelected ? null : vial.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vialName, isSelected && { color: colors.primary }]}>
                      {vial.peptide_name} — {vial.vial_mg}mg vial
                    </Text>
                    <View style={styles.vialBar}>
                      <View style={[styles.vialBarFill, { width: `${pct * 100}%`, backgroundColor: stockColor }]} />
                    </View>
                    <Text style={styles.vialRemaining}>
                      {vial.mg_remaining.toFixed(2)}mg remaining
                      {vial.source ? ` · ${vial.source}` : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })}
            <Text style={styles.helperText}>Select a vial to auto-deduct this dose from inventory</Text>
          </View>
        )}

        {/* Injection Site */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Injection Site</Text>
          {suggestedSite && (
            <View style={styles.suggestedBanner}>
              <Ionicons name="bulb-outline" size={16} color={colors.success} />
              <Text style={styles.suggestedText}>
                Suggested: {SITE_LABELS[suggestedSite]}
              </Text>
            </View>
          )}

          <View style={styles.siteGrid}>
            {/* Front body sites */}
            <View style={styles.bodySection}>
              <Text style={styles.bodyLabel}>Front</Text>
              <View style={styles.siteRow}>
                {['deltoid_left', 'deltoid_right'].map((key) => {
                  const site = sites.find((s) => s.site_key === key);
                  const status = site ? getSiteStatus(site) : 'green';
                  const isSelected = selectedSite === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.siteBtn,
                        { borderColor: statusColors[status] },
                        isSelected && { backgroundColor: statusColors[status] + '20', borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedSite(key)}
                    >
                      <View style={[styles.siteDot, { backgroundColor: statusColors[status] }]} />
                      <Text style={[styles.siteBtnText, isSelected && { fontWeight: '700' }]}>
                        {SITE_SHORT[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.siteRow}>
                {['abdomen_left', 'abdomen_right'].map((key) => {
                  const site = sites.find((s) => s.site_key === key);
                  const status = site ? getSiteStatus(site) : 'green';
                  const isSelected = selectedSite === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.siteBtn,
                        { borderColor: statusColors[status] },
                        isSelected && { backgroundColor: statusColors[status] + '20', borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedSite(key)}
                    >
                      <View style={[styles.siteDot, { backgroundColor: statusColors[status] }]} />
                      <Text style={[styles.siteBtnText, isSelected && { fontWeight: '700' }]}>
                        {SITE_SHORT[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.siteRow}>
                {['thigh_left', 'thigh_right'].map((key) => {
                  const site = sites.find((s) => s.site_key === key);
                  const status = site ? getSiteStatus(site) : 'green';
                  const isSelected = selectedSite === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.siteBtn,
                        { borderColor: statusColors[status] },
                        isSelected && { backgroundColor: statusColors[status] + '20', borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedSite(key)}
                    >
                      <View style={[styles.siteDot, { backgroundColor: statusColors[status] }]} />
                      <Text style={[styles.siteBtnText, isSelected && { fontWeight: '700' }]}>
                        {SITE_SHORT[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Back body sites */}
            <View style={styles.bodySection}>
              <Text style={styles.bodyLabel}>Back</Text>
              <View style={styles.siteRow}>
                {['glute_left', 'glute_right'].map((key) => {
                  const site = sites.find((s) => s.site_key === key);
                  const status = site ? getSiteStatus(site) : 'green';
                  const isSelected = selectedSite === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.siteBtn,
                        { borderColor: statusColors[status] },
                        isSelected && { backgroundColor: statusColors[status] + '20', borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedSite(key)}
                    >
                      <View style={[styles.siteDot, { backgroundColor: statusColors[status] }]} />
                      <Text style={[styles.siteBtnText, isSelected && { fontWeight: '700' }]}>
                        {SITE_SHORT[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Ready</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendText}>Recent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>Rest</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How are you feeling?"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>

        {/* Side Effects */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Side Effects (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={sideEffects}
            onChangeText={setSideEffects}
            placeholder="Any side effects to note?"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Log Dose'}</Text>
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
    protocolInfo: {
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    protocolName: { fontSize: FontSize.xl, fontWeight: '700', color: colors.primary },
    protocolDose: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    unitToggle: { flexDirection: 'row', gap: 2 },
    unitBtn: {
      paddingHorizontal: Spacing.md, paddingVertical: 4,
      borderRadius: BorderRadius.sm, backgroundColor: colors.surface,
    },
    unitBtnActive: { backgroundColor: colors.primary },
    unitBtnText: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '700' },
    unitBtnTextActive: { color: '#ffffff' },
    whenDisplay: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.primaryLight, borderRadius: BorderRadius.md,
      padding: Spacing.md, marginBottom: Spacing.md,
    },
    whenText: { fontSize: FontSize.md, fontWeight: '600', color: colors.primary },
    whenPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
    whenChip: {
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    whenChipText: { fontSize: FontSize.sm, color: colors.text, fontWeight: '600' },
    input: {
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.inputBorder,
      padding: Spacing.md, fontSize: FontSize.md, color: colors.text,
    },
    helperText: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: Spacing.xs, marginBottom: Spacing.xs },
    suggestedBanner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.successLight, borderRadius: BorderRadius.sm,
      padding: Spacing.sm, marginBottom: Spacing.md,
    },
    suggestedText: { fontSize: FontSize.sm, color: colors.success, fontWeight: '600' },
    siteGrid: { gap: Spacing.lg },
    bodySection: {},
    bodyLabel: {
      fontSize: FontSize.sm, fontWeight: '600', color: colors.textTertiary,
      textAlign: 'center', marginBottom: Spacing.sm,
    },
    siteRow: {
      flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.sm,
    },
    siteBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md, borderWidth: 1, minWidth: 100, minHeight: 44,
      backgroundColor: colors.surface,
    },
    siteDot: { width: 8, height: 8, borderRadius: 4 },
    siteBtnText: { fontSize: FontSize.sm, color: colors.text },
    legend: {
      flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl,
      marginTop: Spacing.md, paddingTop: Spacing.md,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: FontSize.xs, color: colors.textTertiary },
    vialOption: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      borderWidth: 1.5, borderRadius: BorderRadius.md,
      padding: Spacing.md, marginBottom: Spacing.sm,
    },
    vialName: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text },
    vialBar: {
      height: 4, backgroundColor: colors.border, borderRadius: 2,
      marginVertical: 4, overflow: 'hidden' as const,
    },
    vialBarFill: { height: 4, borderRadius: 2 },
    vialRemaining: { fontSize: FontSize.xs, color: colors.textTertiary },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    },
    saveBtnText: { color: '#ffffff', fontSize: FontSize.lg, fontWeight: '700' },
  });
}
