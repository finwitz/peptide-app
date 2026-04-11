import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../constants/theme';
import AnimatedPressable from '../components/AnimatedPressable';
import { useToast } from '../components/Toast';
import { usePremium } from '../lib/PremiumContext';
import { getOfferings, purchasePlan, restorePurchases, type PlanOption } from '../lib/revenue';

const FEATURES = [
  { icon: 'flask', title: 'Unlimited Protocols', desc: 'Create as many as you need' },
  { icon: 'book', title: 'Full Peptide Library', desc: '150+ compounds with dosing data' },
  { icon: 'copy', title: 'Protocol Templates', desc: 'Expert-designed starting points' },
  { icon: 'chatbubble-ellipses', title: 'AI Assistant', desc: 'Ask anything about peptides' },
  { icon: 'download', title: 'Data Export', desc: 'CSV & JSON export of all logs' },
  { icon: 'notifications', title: 'Smart Reminders', desc: 'Never miss a dose' },
];

export default function PaywallScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { refresh } = usePremium();
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getOfferings().then((p) => {
      setPlans(p);
      setLoading(false);
      // Default to yearly if available
      if (p.find(x => x.id === 'yearly')) setSelectedPlan('yearly');
      else if (p.length > 0) setSelectedPlan(p[0].id);
    });
  }, []);

  const handlePurchase = async () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setPurchasing(true);
    const result = await purchasePlan(plan);
    setPurchasing(false);

    if (result.success) {
      await refresh();
      toast.show({ message: 'Welcome to Premium!', type: 'success' });
      router.back();
    } else if (result.error) {
      toast.show({ message: result.error, type: 'error' });
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);

    if (restored) {
      await refresh();
      toast.show({ message: 'Purchases restored!', type: 'success' });
      router.back();
    } else {
      toast.show({ message: 'No previous purchases found', type: 'info' });
    }
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Close button */}
      <AnimatedPressable
        style={styles.closeBtn}
        onPress={() => router.back()}
        haptic="light" scaleDown={0.9}
      >
        <Ionicons name="close" size={22} color={colors.textSecondary} />
      </AnimatedPressable>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="diamond" size={32} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>PeptideCalc Pro</Text>
        <Text style={styles.heroSubtitle}>
          Unlock the full toolkit for serious peptide research.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featureGrid}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Plans */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xxxl }} />
      ) : plans.length > 0 ? (
        <View style={styles.plans}>
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlan;
            return (
              <AnimatedPressable
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(plan.id)}
                haptic="selection" scaleDown={0.97}
              >
                {plan.badge && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={styles.planRadio}>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, isSelected && { color: colors.primary }]}>{plan.title}</Text>
                  {plan.pricePerMonth && (
                    <Text style={styles.planPerMonth}>{plan.pricePerMonth}</Text>
                  )}
                </View>
                <Text style={[styles.planPrice, isSelected && { color: colors.primary }]}>{plan.price}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.noPlans}>
          <Text style={styles.noPlansText}>
            Subscriptions are being set up. Check back soon!
          </Text>
        </View>
      )}

      {/* CTA */}
      <AnimatedPressable
        style={[styles.ctaBtn, (purchasing || plans.length === 0) && { opacity: 0.5 }]}
        onPress={handlePurchase}
        disabled={purchasing || plans.length === 0}
        haptic="medium" scaleDown={0.97}
      >
        {purchasing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.ctaText}>
            {selectedPlan === 'lifetime' ? 'Purchase Lifetime Access' : 'Subscribe Now'}
          </Text>
        )}
      </AnimatedPressable>

      {/* Restore */}
      <AnimatedPressable
        style={styles.restoreBtn}
        onPress={handleRestore}
        disabled={restoring}
        haptic="light" scaleDown={0.95}
      >
        <Text style={styles.restoreText}>
          {restoring ? 'Restoring...' : 'Restore Purchases'}
        </Text>
      </AnimatedPressable>

      {/* Legal */}
      <Text style={styles.legal}>
        Payment is charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
        Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.xxl },
    // Close
    closeBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
      alignSelf: 'flex-end',
    },
    // Hero
    hero: { alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xxxl },
    heroIcon: {
      width: 72, height: 72, borderRadius: 22,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    heroTitle: {
      fontSize: FontSize.title, fontWeight: '800', color: colors.text,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: FontSize.md, color: colors.textSecondary,
      textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22,
    },
    // Features
    featureGrid: { marginBottom: Spacing.xxxl },
    featureItem: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    featureIcon: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    featureTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    featureDesc: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 1 },
    // Plans
    plans: { gap: Spacing.sm, marginBottom: Spacing.xxl },
    planCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: BorderRadius.lg,
      padding: Spacing.lg, borderWidth: 2, borderColor: colors.cardBorder,
      ...Shadows.sm,
    },
    planCardSelected: {
      borderColor: colors.primary, backgroundColor: colors.cardHighlight,
    },
    planBadge: {
      position: 'absolute', top: -10, right: Spacing.lg,
      backgroundColor: colors.accent, borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 2,
    },
    planBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
    planRadio: { marginRight: Spacing.md },
    radioOuter: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    radioOuterSelected: { borderColor: colors.primary },
    radioInner: {
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: colors.primary,
    },
    planTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    planPerMonth: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 },
    planPrice: { fontSize: FontSize.lg, fontWeight: '800', color: colors.text },
    noPlans: { paddingVertical: Spacing.xxxl, alignItems: 'center' },
    noPlansText: { fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center' },
    // CTA
    ctaBtn: {
      backgroundColor: colors.primary, borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.lg, alignItems: 'center',
      ...Shadows.glow(colors.primary),
    },
    ctaText: { fontSize: FontSize.lg, fontWeight: '800', color: '#ffffff' },
    // Restore
    restoreBtn: { paddingVertical: Spacing.lg, alignItems: 'center' },
    restoreText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
    // Legal
    legal: {
      fontSize: FontSize.xs, color: colors.textTertiary,
      textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.lg,
    },
  });
}
