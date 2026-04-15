import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../../constants/theme';
import { useToast } from '../../components/Toast';
import {
  getProtocolById, getDoseLogsForProtocol, updateProtocol, deleteProtocol,
  getPeptideByName, getProtocolDoseSummary, getActiveProtocols,
  getRemindersForProtocol, createReminder, deleteReminder as deleteReminderDB,
  deleteDoseLog,
  type Protocol, type DoseLog, type Peptide, type Reminder,
} from '../../lib/database';
import { requestPermissions, scheduleDailyReminder, scheduleWeeklyReminder, cancelReminder } from '../../lib/notifications';
import { checkNewProtocolInteractions } from '../../lib/interactionChecker';
import type { PeptideInteraction } from '../../lib/interactions';
import InteractionWarning from '../../components/InteractionWarning';
import { calculateReconstitution, SYRINGE_TYPES, formatMl, formatSyringeUnits, formatFrequency, type SyringeType } from '../../lib/calculations';
import { calculateAdherence, calculateStreak } from '../../lib/analytics';
import DecayCurveChart from '../../components/charts/DecayCurveChart';
import AdherenceRing from '../../components/charts/AdherenceRing';

const SITE_LABELS: Record<string, string> = {
  abdomen_left: 'L Abdomen', abdomen_right: 'R Abdomen',
  thigh_left: 'L Thigh', thigh_right: 'R Thigh',
  deltoid_left: 'L Deltoid', deltoid_right: 'R Deltoid',
  glute_left: 'L Glute', glute_right: 'R Glute',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // 0-indexed for expo weekday 1..7

export default function ProtocolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [peptide, setPeptide] = useState<Peptide | null>(null);
  const [summary, setSummary] = useState<{ total_doses: number; first_dose: string | null; last_dose: string | null }>({ total_doses: 0, first_dose: null, last_dose: null });
  const [interactions, setInteractions] = useState<PeptideInteraction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderPickerOpen, setReminderPickerOpen] = useState(false);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerWeekday, setPickerWeekday] = useState<number | null>(null);
  const toast = useToast();

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!id) return;
        const proto = await getProtocolById(parseInt(id));
        setProtocol(proto);
        if (proto) {
          const [doseLogs, pep, summ] = await Promise.all([
            getDoseLogsForProtocol(proto.id, 100),
            getPeptideByName(proto.peptide_name),
            getProtocolDoseSummary(proto.id),
          ]);
          setLogs(doseLogs);
          setPeptide(pep);
          setSummary(summ);
          // Check interactions with other active protocols
          const allActive = await getActiveProtocols();
          const otherActive = allActive.filter(p => p.id !== proto.id);
          const ixns = checkNewProtocolInteractions(proto.peptide_name, otherActive);
          setInteractions(ixns);
          const rems = await getRemindersForProtocol(proto.id);
          setReminders(rems);
        }
      }
      load();
    }, [id])
  );

  if (!protocol) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textTertiary, marginTop: Spacing.sm }}>Loading protocol...</Text>
      </View>
    );
  }

  const reconResult = protocol.vial_mg && protocol.water_ml
    ? calculateReconstitution({
        vialMg: protocol.vial_mg,
        waterMl: protocol.water_ml,
        desiredDoseMcg: protocol.dose_mcg,
        syringeType: protocol.syringe_type as SyringeType,
      })
    : null;

  const toggleActive = async () => {
    await updateProtocol(protocol.id, { is_active: protocol.is_active ? 0 : 1 });
    setProtocol({ ...protocol, is_active: protocol.is_active ? 0 : 1 });
  };

  const handleDelete = () => {
    Alert.alert('Delete Protocol', 'This will delete all dose logs too. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteProtocol(protocol.id); router.back(); },
      },
    ]);
  };

  const handleDeleteLog = (log: DoseLog) => {
    Alert.alert(
      'Delete Dose',
      `Delete this ${log.dose_mcg >= 1000 ? `${(log.dose_mcg / 1000).toFixed(2)} mg` : `${log.dose_mcg} mcg`} entry from ${new Date(log.logged_at).toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoseLog(log.id);
              setLogs((prev) => prev.filter((l) => l.id !== log.id));
              toast.show({ message: 'Dose deleted', type: 'info' });
            } catch {
              toast.show({ message: 'Failed to delete', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const openReminderPicker = () => {
    // Pre-pick "weekly" if protocol is ~weekly
    if (protocol && protocol.frequency_days >= 6.5) {
      setPickerWeekday(2); // Monday default
    } else {
      setPickerWeekday(null);
    }
    setPickerHour(9);
    setPickerMinute(0);
    setReminderPickerOpen(true);
  };

  const confirmReminder = async () => {
    if (!protocol) return;
    try {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permissions Required', 'Please enable notifications in Settings to set reminders.');
        return;
      }
      const notifId = pickerWeekday != null
        ? await scheduleWeeklyReminder(protocol.name, protocol.peptide_name, pickerHour, pickerMinute, pickerWeekday)
        : await scheduleDailyReminder(protocol.name, protocol.peptide_name, pickerHour, pickerMinute);
      await createReminder(protocol.id, pickerHour, pickerMinute, notifId, pickerWeekday);
      const rems = await getRemindersForProtocol(protocol.id);
      setReminders(rems);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const timeStr = formatTime(pickerHour, pickerMinute);
      const freqStr = pickerWeekday != null ? `${WEEKDAY_LABELS[pickerWeekday - 1]} at ${timeStr}` : `Daily at ${timeStr}`;
      toast.show({ message: `Reminder set for ${freqStr}`, type: 'success' });
      setReminderPickerOpen(false);
    } catch (e) {
      toast.show({ message: 'Failed to create reminder', type: 'error' });
    }
  };

  const handleDeleteReminder = async (rem: Reminder) => {
    try {
      if (rem.notification_id) {
        await cancelReminder(rem.notification_id);
      }
      await deleteReminderDB(rem.id);
      setReminders(prev => prev.filter(r => r.id !== rem.id));
      toast.show({ message: 'Reminder removed', type: 'info' });
    } catch (e) {
      toast.show({ message: 'Failed to delete reminder', type: 'error' });
    }
  };

  const formatTime = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{protocol.name}</Text>
        <Text style={styles.subtitle}>{protocol.peptide_name}</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity style={styles.statusBtn} onPress={toggleActive}>
            <View style={[styles.statusDot, { backgroundColor: protocol.is_active ? colors.success : colors.textTertiary }]} />
            <Text style={styles.statusText}>{protocol.is_active ? 'Active' : 'Inactive'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/protocol/edit', params: { id: protocol.id.toString() } })}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Interaction Warnings */}
      {interactions.length > 0 && <InteractionWarning interactions={interactions} />}

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dose</Text>
          <Text style={styles.detailValue}>
            {protocol.dose_mcg >= 1000 ? `${(protocol.dose_mcg / 1000).toFixed(2)} mg` : `${protocol.dose_mcg} mcg`}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Frequency</Text>
          <Text style={styles.detailValue}>{formatFrequency(protocol.frequency_days)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Route</Text>
          <Text style={styles.detailValue}>{protocol.route}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Started</Text>
          <Text style={styles.detailValue}>{protocol.start_date}</Text>
        </View>
        {protocol.end_date && (() => {
          const endDate = new Date(protocol.end_date);
          const now = new Date();
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isExpired = daysLeft <= 0;
          return (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End Date</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.detailValue}>{protocol.end_date}</Text>
                <View style={[styles.endBadge, { backgroundColor: isExpired ? colors.dangerLight : colors.warningLight }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isExpired ? colors.danger : colors.warning }}>
                    {isExpired ? 'Complete' : `${daysLeft}d left`}
                  </Text>
                </View>
              </View>
            </View>
          );
        })()}
        {protocol.notes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={[styles.detailValue, { flex: 1 }]}>{protocol.notes}</Text>
          </View>
        )}
      </View>

      {/* Reconstitution Info */}
      {reconResult && (
        <View style={[styles.card, { borderColor: colors.primary, borderWidth: 1.5 }]}>
          <Text style={styles.cardTitle}>Reconstitution</Text>
          <View style={styles.reconGrid}>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Draw</Text>
              <Text style={styles.reconValue}>{formatMl(reconResult.injectionMl)} mL</Text>
            </View>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Units</Text>
              <Text style={styles.reconValue}>{formatSyringeUnits(reconResult.syringeUnits)}</Text>
            </View>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Conc.</Text>
              <Text style={styles.reconValue}>{reconResult.concentrationMcgPerMl.toFixed(0)} mcg/mL</Text>
            </View>
            <View style={styles.reconItem}>
              <Text style={styles.reconLabel}>Doses/Vial</Text>
              <Text style={styles.reconValue}>{reconResult.dosesPerVial}</Text>
            </View>
          </View>
          <Text style={styles.reconNote}>
            {protocol.vial_mg}mg vial + {protocol.water_ml}mL BAC water · {SYRINGE_TYPES[protocol.syringe_type as SyringeType]?.label || protocol.syringe_type}
          </Text>
        </View>
      )}

      {/* Decay Curve */}
      {peptide?.half_life_hours != null && peptide.half_life_hours > 0 && (
        <DecayCurveChart
          doseMcg={protocol.dose_mcg}
          halfLifeHours={peptide.half_life_hours}
          doseLogs={logs}
        />
      )}

      {/* Analytics */}
      {summary.total_doses > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analytics</Text>
          <View style={styles.analyticsRow}>
            <AdherenceRing
              percentage={calculateAdherence(logs, protocol.frequency_days, 30)}
              size={70}
              label="30-day"
            />
            <View style={styles.analyticsStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.total_doses}</Text>
                <Text style={styles.statLabel}>Total Doses</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{calculateStreak(logs, protocol.frequency_days).current}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{calculateStreak(logs, protocol.frequency_days).longest}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Reminders */}
      {protocol.is_active && (
        <View style={styles.card}>
          <View style={styles.reminderHeader}>
            <Text style={styles.cardTitle}>Reminders</Text>
            <TouchableOpacity
              onPress={openReminderPicker}
              accessibilityRole="button"
              accessibilityLabel="Add reminder"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {reminders.length === 0 ? (
            <Text style={styles.emptyText}>No reminders set. Tap + to add one.</Text>
          ) : (
            reminders.map((rem) => (
              <View key={rem.id} style={styles.reminderItem}>
                <Ionicons name="notifications-outline" size={18} color={colors.accent} />
                <Text style={styles.reminderTime}>{formatTime(rem.hour, rem.minute)}</Text>
                <Text style={styles.reminderLabel}>
                  {rem.weekday != null ? WEEKDAY_LABELS[rem.weekday - 1] : 'Daily'}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteReminder(rem)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete reminder"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {reminderPickerOpen && (
            <View style={styles.reminderPicker}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.pickerChip, pickerHour === h && styles.pickerChipActive]}
                    onPress={() => setPickerHour(h)}
                  >
                    <Text style={[styles.pickerChipText, pickerHour === h && styles.pickerChipTextActive]}>
                      {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.pickerLabel}>Minute</Text>
              <View style={styles.pickerRow}>
                {[0, 15, 30, 45].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerChip, pickerMinute === m && styles.pickerChipActive]}
                    onPress={() => setPickerMinute(m)}
                  >
                    <Text style={[styles.pickerChipText, pickerMinute === m && styles.pickerChipTextActive]}>
                      :{m.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.pickerLabel}>Repeat</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={[styles.pickerChip, pickerWeekday == null && styles.pickerChipActive]}
                  onPress={() => setPickerWeekday(null)}
                >
                  <Text style={[styles.pickerChipText, pickerWeekday == null && styles.pickerChipTextActive]}>
                    Daily
                  </Text>
                </TouchableOpacity>
                {WEEKDAY_LABELS.map((label, idx) => {
                  const wd = idx + 1; // 1..7
                  return (
                    <TouchableOpacity
                      key={wd}
                      style={[styles.pickerChip, pickerWeekday === wd && styles.pickerChipActive]}
                      onPress={() => setPickerWeekday(wd)}
                    >
                      <Text style={[styles.pickerChipText, pickerWeekday === wd && styles.pickerChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.pickerActions}>
                <TouchableOpacity
                  style={styles.pickerCancel}
                  onPress={() => setReminderPickerOpen(false)}
                >
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerConfirm}
                  onPress={confirmReminder}
                >
                  <Text style={styles.pickerConfirmText}>Set Reminder</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Log Dose Button */}
      {protocol.is_active && (
        <TouchableOpacity style={styles.logBtn} onPress={() => router.push(`/log/${protocol.id}`)}>
          <Ionicons name="add-circle" size={22} color="#ffffff" />
          <Text style={styles.logBtnText}>Log Dose</Text>
        </TouchableOpacity>
      )}

      {/* Dose History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dose History ({logs.length})</Text>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No doses logged yet.</Text>
        ) : (
          logs.map((log) => (
            <TouchableOpacity
              key={log.id}
              style={styles.logItem}
              onLongPress={() => handleDeleteLog(log)}
              accessibilityLabel="Long-press to delete"
            >
              <View style={styles.logDot} />
              <View style={{ flex: 1 }}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDose}>
                    {log.dose_mcg >= 1000 ? `${(log.dose_mcg / 1000).toFixed(1)}mg` : `${log.dose_mcg}mcg`}
                  </Text>
                  <Text style={styles.logDate}>{formatDate(log.logged_at)}</Text>
                </View>
                {log.injection_site && (
                  <Text style={styles.logSite}>{SITE_LABELS[log.injection_site] || log.injection_site}</Text>
                )}
                {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteBtnText}>Delete Protocol</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg },
    header: { marginBottom: Spacing.lg },
    title: { fontSize: FontSize.title, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: FontSize.lg, color: colors.textSecondary, marginTop: 2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
    statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full, backgroundColor: colors.primaryLight,
    },
    editBtnText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: FontSize.sm, color: colors.textSecondary },
    card: {
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: colors.cardBorder,
      padding: Spacing.lg, marginBottom: Spacing.lg,
      ...Shadows.sm,
    },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
    endBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 2 },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    detailLabel: { fontSize: FontSize.sm, color: colors.textSecondary },
    detailValue: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text },
    reconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    reconItem: {
      flex: 1, minWidth: '40%', backgroundColor: colors.primaryLight,
      borderRadius: BorderRadius.md, padding: Spacing.md,
    },
    reconLabel: { fontSize: FontSize.xs, color: colors.textSecondary },
    reconValue: { fontSize: FontSize.lg, fontWeight: '700', color: colors.primary, marginTop: 2 },
    reconNote: { fontSize: FontSize.xs, color: colors.textTertiary, marginTop: Spacing.sm },
    analyticsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
    analyticsStats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    statItem: { minWidth: '30%' },
    statValue: { fontSize: FontSize.lg, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: FontSize.xs, color: colors.textTertiary },
    reminderHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    reminderItem: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    reminderTime: { fontSize: FontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
    reminderLabel: { fontSize: FontSize.xs, color: colors.textTertiary },
    reminderPicker: {
      marginTop: Spacing.md, paddingTop: Spacing.md,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    pickerLabel: {
      fontSize: FontSize.xs, fontWeight: '700', color: colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: Spacing.md, marginBottom: Spacing.sm,
    },
    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    pickerChip: {
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      marginRight: Spacing.sm, marginBottom: Spacing.sm,
      minWidth: 44, alignItems: 'center',
    },
    pickerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pickerChipText: { fontSize: FontSize.sm, color: colors.text, fontWeight: '600' },
    pickerChipTextActive: { color: '#ffffff' },
    pickerActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    pickerCancel: {
      flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
      backgroundColor: colors.surface, alignItems: 'center',
    },
    pickerCancelText: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: '600' },
    pickerConfirm: {
      flex: 2, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
      backgroundColor: colors.primary, alignItems: 'center',
    },
    pickerConfirmText: { fontSize: FontSize.sm, color: '#ffffff', fontWeight: '700' },
    logBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    logBtnText: { color: '#ffffff', fontSize: FontSize.lg, fontWeight: '700' },
    logItem: { flexDirection: 'row', marginBottom: Spacing.md },
    logDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
      marginTop: 5, marginRight: Spacing.md,
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    logDose: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
    logDate: { fontSize: FontSize.xs, color: colors.textTertiary },
    logSite: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
    logNotes: { fontSize: FontSize.xs, color: colors.textTertiary, fontStyle: 'italic', marginTop: 2 },
    emptyText: { fontSize: FontSize.sm, color: colors.textTertiary, textAlign: 'center', padding: Spacing.lg },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.lg,
    },
    deleteBtnText: { fontSize: FontSize.md, color: colors.danger, fontWeight: '600' },
  });
}
