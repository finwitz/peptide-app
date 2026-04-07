import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import {
  getProtocolById, logDose, getInjectionSites,
  type Protocol, type InjectionSite,
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

  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [sites, setSites] = useState<InjectionSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [suggestedSite, setSuggestedSite] = useState<string | null>(null);
  const [doseOverride, setDoseOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [sideEffects, setSideEffects] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    }
    load();
  }, [protocolId]);

  const handleSave = async () => {
    if (!protocol || isSaving) return;
    setIsSaving(true);

    try {
      const dose = doseOverride ? parseFloat(doseOverride) : protocol.dose_mcg;
      if (isNaN(dose) || dose <= 0) {
        Alert.alert('Error', 'Invalid dose value.');
        setIsSaving(false);
        return;
      }

      await logDose(protocol.id, dose, selectedSite ?? undefined, notes || undefined, sideEffects || undefined);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save dose log.');
      setIsSaving(false);
    }
  };

  if (!protocol) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textTertiary }}>Loading...</Text>
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
          <Text style={styles.cardTitle}>Dose</Text>
          <TextInput
            style={styles.input}
            value={doseOverride}
            onChangeText={setDoseOverride}
            placeholder={`${protocol.dose_mcg} mcg (default)`}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
          <Text style={styles.helperText}>Leave blank to use default dose</Text>
        </View>

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
    input: {
      backgroundColor: colors.input, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: colors.inputBorder,
      padding: Spacing.md, fontSize: FontSize.md, color: colors.text,
    },
    helperText: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: Spacing.xs },
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
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md, borderWidth: 1, minWidth: 100,
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
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    },
    saveBtnText: { color: '#ffffff', fontSize: FontSize.lg, fontWeight: '700' },
  });
}
