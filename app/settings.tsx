import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../constants/theme';
import AnimatedPressable from '../components/AnimatedPressable';
import { useToast } from '../components/Toast';
import { usePremium } from '../lib/PremiumContext';
import { exportProtocolsJSON, exportDoseLogsCSV, importProtocolsJSON } from '../lib/export';
import { getRevenueCatDiagnostics } from '../lib/revenue';

const TERMS_URL = 'https://peptidecalc.app/terms';
const PRIVACY_URL = 'https://peptidecalc.app/privacy';
const MANAGE_IOS = 'https://apps.apple.com/account/subscriptions';
const MANAGE_ANDROID = 'https://play.google.com/store/account/subscriptions';
const SUPPORT_EMAIL = 'support@peptidecalc.app';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const { isPremium, refresh } = usePremium();
  const [busy, setBusy] = useState<string | null>(null);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleExportJSON = async () => {
    setBusy('export-json');
    try {
      await exportProtocolsJSON();
      toast.show({ message: 'Backup exported', type: 'success' });
    } catch {
      toast.show({ message: 'Export failed', type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleExportCSV = async () => {
    setBusy('export-csv');
    try {
      await exportDoseLogsCSV();
      toast.show({ message: 'CSV exported', type: 'success' });
    } catch {
      toast.show({ message: 'Export failed', type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    try {
      // Use dynamic import so app still runs if expo-document-picker isn't installed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let DocumentPicker: any = null;
      try {
        // @ts-ignore optional dependency resolved at runtime
        DocumentPicker = await import('expo-document-picker');
      } catch {
        DocumentPicker = null;
      }
      if (!DocumentPicker) {
        Alert.alert(
          'Import Unavailable',
          'Install expo-document-picker to enable JSON backup import.',
        );
        return;
      }
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      setBusy('import');
      const { File } = await import('expo-file-system/next');
      const file = new File(picked.assets[0].uri);
      const text = await file.text();
      const result = await importProtocolsJSON(text);
      Alert.alert(
        'Import Complete',
        `Created ${result.protocolsCreated} protocols and ${result.dosesCreated} dose logs.${
          result.errors.length ? `\n\n${result.errors.length} errors — check logs.` : ''
        }`,
      );
      toast.show({ message: 'Import finished', type: 'success' });
    } catch (e) {
      toast.show({ message: `Import failed: ${(e as Error).message}`, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete every protocol, dose log, vial, and reminder. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const { getDatabase } = await import('../lib/database');
              const db = await getDatabase();
              await db.execAsync('DELETE FROM dose_logs; DELETE FROM reminders; DELETE FROM inventory; DELETE FROM protocols;');
              toast.show({ message: 'All data cleared', type: 'info' });
            } catch {
              toast.show({ message: 'Failed to clear data', type: 'error' });
            }
          },
        },
      ],
    );
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Subscription */}
      <Text style={styles.sectionLabel}>Subscription</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name={isPremium ? 'diamond' : 'diamond-outline'} size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{isPremium ? 'PeptideCalc Pro' : 'Free'}</Text>
            <Text style={styles.rowSubtitle}>
              {isPremium ? 'All features unlocked' : '2 protocols, library, calculator'}
            </Text>
          </View>
          {!isPremium && (
            <AnimatedPressable
              style={styles.upgradeBtn}
              onPress={() => router.push('/paywall')}
              haptic="medium"
              scaleDown={0.95}
            >
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </AnimatedPressable>
          )}
        </View>
        {isPremium && (
          <AnimatedPressable
            style={styles.linkRow}
            onPress={() => Linking.openURL(Platform.OS === 'ios' ? MANAGE_IOS : MANAGE_ANDROID)}
            haptic="light"
          >
            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.linkText}>Manage Subscription</Text>
            <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
          </AnimatedPressable>
        )}
        <AnimatedPressable
          style={styles.linkRow}
          onPress={async () => { await refresh(); toast.show({ message: 'Subscription refreshed', type: 'info' }); }}
          haptic="light"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>Refresh Status</Text>
        </AnimatedPressable>
        {__DEV__ && (
          <AnimatedPressable
            style={styles.linkRow}
            onPress={async () => {
              const diag = await getRevenueCatDiagnostics();
              Alert.alert('RevenueCat Diagnostics', diag);
            }}
            haptic="light"
          >
            <Ionicons name="bug-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.linkText}>Debug RevenueCat</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Data */}
      <Text style={styles.sectionLabel}>Data</Text>
      <View style={styles.card}>
        <AnimatedPressable style={styles.linkRow} onPress={handleExportJSON} disabled={busy !== null} haptic="light">
          <Ionicons name="cloud-download-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>{busy === 'export-json' ? 'Exporting…' : 'Export Backup (JSON)'}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.linkRow} onPress={handleExportCSV} disabled={busy !== null} haptic="light">
          <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>{busy === 'export-csv' ? 'Exporting…' : 'Export Dose Logs (CSV)'}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.linkRow} onPress={handleImport} disabled={busy !== null} haptic="light">
          <Ionicons name="cloud-upload-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>{busy === 'import' ? 'Importing…' : 'Import Backup (JSON)'}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.linkRow} onPress={confirmDeleteAll} haptic="medium">
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={[styles.linkText, { color: colors.danger }]}>Delete All Data</Text>
        </AnimatedPressable>
      </View>

      {/* About */}
      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.card}>
        <AnimatedPressable style={styles.linkRow} onPress={() => Linking.openURL(TERMS_URL)} haptic="light">
          <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>Terms of Service</Text>
          <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
        </AnimatedPressable>
        <AnimatedPressable style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_URL)} haptic="light">
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.linkRow}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=PeptideCalc Support`)}
          haptic="light"
        >
          <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>Contact Support</Text>
        </AnimatedPressable>
        <View style={styles.linkRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkText}>Version</Text>
          <Text style={styles.versionText}>{version}</Text>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="warning-outline" size={14} color={colors.warning} />
        <Text style={styles.disclaimerText}>
          This app is for research purposes only. Not medical advice. Always consult a qualified healthcare professional.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    sectionLabel: {
      fontSize: FontSize.xs, fontWeight: '700', color: colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginTop: Spacing.lg, marginBottom: Spacing.sm, marginLeft: Spacing.sm,
    },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      overflow: 'hidden', ...Shadows.sm,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      padding: Spacing.lg,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rowTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    rowSubtitle: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
    upgradeBtn: {
      backgroundColor: colors.primary, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    },
    upgradeBtnText: { color: '#ffffff', fontSize: FontSize.sm, fontWeight: '700' },
    linkRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      padding: Spacing.lg,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    linkText: { flex: 1, fontSize: FontSize.md, color: colors.text, fontWeight: '500' },
    versionText: { fontSize: FontSize.sm, color: colors.textTertiary },
    disclaimer: {
      flexDirection: 'row', gap: Spacing.sm,
      backgroundColor: colors.warningLight, borderRadius: BorderRadius.lg,
      padding: Spacing.md, marginTop: Spacing.xl,
    },
    disclaimerText: { flex: 1, fontSize: FontSize.xs, color: colors.warning, lineHeight: 18 },
  });
}
