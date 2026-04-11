import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, Spacing, FontSize, BorderRadius, Shadows } from '../constants/theme';
import AnimatedPressable from './AnimatedPressable';
import { useIsPremium } from '../lib/PremiumContext';

interface Props {
  children: React.ReactNode;
  feature: string;
  /** If true, shows the gate inline instead of replacing children */
  inline?: boolean;
}

/**
 * Wraps content that requires premium.
 * Free users see an upgrade prompt instead.
 */
export default function PremiumGate({ children, feature, inline }: Props) {
  const isPremium = useIsPremium();
  const colors = useThemeColors();
  const router = useRouter();
  const glowStyle = useMemo(() => ({
    backgroundColor: colors.primary,
    ...Shadows.glow(colors.primary),
  }), [colors.primary]);

  if (isPremium) return <>{children}</>;

  if (inline) {
    return (
      <AnimatedPressable
        style={[styles.inlineBanner, { backgroundColor: colors.primaryLight }]}
        onPress={() => router.push('/paywall')}
        haptic="light" scaleDown={0.98}
      >
        <Ionicons name="diamond-outline" size={16} color={colors.primary} />
        <Text style={[styles.inlineText, { color: colors.primary }]}>
          Upgrade to unlock {feature}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.fullGate, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="diamond" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Premium Feature</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        {feature} is available with PeptideCalc Pro.
      </Text>
      <AnimatedPressable
        style={[styles.upgradeBtn, glowStyle]}
        onPress={() => router.push('/paywall')}
        haptic="medium" scaleDown={0.95}
      >
        <Text style={styles.upgradeBtnText}>View Plans</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Inline banner
  inlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
  },
  inlineText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  // Full gate
  fullGate: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.3,
  },
  desc: {
    fontSize: FontSize.md, textAlign: 'center', lineHeight: 22,
    marginTop: Spacing.sm,
  },
  upgradeBtn: {
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg, marginTop: Spacing.xxl,
  },
  upgradeBtnText: { fontSize: FontSize.md, fontWeight: '800', color: '#ffffff' },
});
