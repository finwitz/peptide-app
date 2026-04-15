import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ── Constants ────────────────────────────────────────────────────────
// RevenueCat requires DIFFERENT API keys per platform:
//   Android (Google Play): key starts with "goog_"
//   iOS (App Store):       key starts with "appl_"
// Configure via EAS secrets:
//   eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_...
//   eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_...
//
// Fallback to EXPO_PUBLIC_REVENUECAT_API_KEY is provided for backwards
// compatibility only — using one key for both platforms WILL fail in production.
const REVENUECAT_API_KEY: string =
  (Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) ??
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
  '';

// This must match the entitlement ID in your RevenueCat dashboard EXACTLY
// (case-sensitive, spaces matter). Check Dashboard → Project → Entitlements.
export const ENTITLEMENT_ID = 'Peptide Pro';

// Log a clear warning at module init if key shape looks wrong for the platform.
if (__DEV__) {
  if (!REVENUECAT_API_KEY) {
    console.warn(
      '[revenue] No RevenueCat key found. Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ' +
      'and EXPO_PUBLIC_REVENUECAT_IOS_KEY (or EXPO_PUBLIC_REVENUECAT_API_KEY) via EAS secrets.'
    );
  } else if (Platform.OS === 'android' && REVENUECAT_API_KEY.startsWith('appl_')) {
    console.warn('[revenue] iOS key ("appl_") detected on Android build — offerings will be empty.');
  } else if (Platform.OS === 'ios' && REVENUECAT_API_KEY.startsWith('goog_')) {
    console.warn('[revenue] Android key ("goog_") detected on iOS build — offerings will be empty.');
  }
}

// Product identifiers — match RevenueCat dashboard
export const PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
};

// ── Free tier limits ─────────────────────────────────────────────────
export const FREE_LIMITS = {
  maxProtocols: 2,
  maxLibraryViews: 5,         // per session
  templatesEnabled: false,
  assistantEnabled: false,
  exportEnabled: false,
};

// ── Initialize ───────────────────────────────────────────────────────
let isConfigured = false;

export async function configureRevenueCat(): Promise<void> {
  if (isConfigured) return;

  // Don't initialize if no key or using a test key in production
  if (!REVENUECAT_API_KEY || (!__DEV__ && REVENUECAT_API_KEY.startsWith('test_'))) {
    if (__DEV__) {
      console.warn('[revenue] configureRevenueCat skipped — empty/test key. Free tier only.');
    }
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    isConfigured = true;
    if (__DEV__) console.log('[revenue] RevenueCat configured for', Platform.OS);
  } catch (e) {
    if (__DEV__) console.error('[revenue] configureRevenueCat failed:', e);
  }
}

// ── Entitlement check ────────────────────────────────────────────────
export async function checkPremiumStatus(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    const isActive = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    if (__DEV__ && !isActive && Object.keys(info.entitlements.active).length > 0) {
      console.warn(
        `[revenue] Entitlement "${ENTITLEMENT_ID}" not in active set. ` +
        `Active entitlements: ${Object.keys(info.entitlements.active).join(', ')}. ` +
        `Check ENTITLEMENT_ID in lib/revenue.ts matches your RC dashboard exactly.`
      );
    }
    return isActive;
  } catch (e) {
    if (__DEV__) console.error('[revenue] checkPremiumStatus failed:', e);
    return false;
  }
}

// ── Get offerings ────────────────────────────────────────────────────
export interface PlanOption {
  id: string;
  title: string;
  price: string;
  pricePerMonth?: string;
  period: 'monthly' | 'yearly' | 'lifetime';
  package: PurchasesPackage;
  badge?: string;
}

export async function getOfferings(): Promise<PlanOption[]> {
  if (!isConfigured) {
    if (__DEV__) console.warn('[revenue] getOfferings called before configure — returning empty');
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      if (__DEV__) {
        console.warn(
          '[revenue] No "current" offering. Check RC dashboard → Offerings: ' +
          'make sure one offering is marked "Current" and contains at least one package. ' +
          'On Android, also verify: (a) Play Console products are "Active", ' +
          '(b) product IDs match RC dashboard exactly, ' +
          '(c) app was installed via a Play Store testing track, not sideloaded, ' +
          '(d) your test account is in Play Console License Testers.'
        );
      }
      return [];
    }

    const plans: PlanOption[] = [];

    if (current.monthly) {
      plans.push({
        id: 'monthly',
        title: 'Monthly',
        price: current.monthly.product.priceString,
        period: 'monthly',
        package: current.monthly,
      });
    }

    if (current.annual) {
      const monthlyPrice = current.annual.product.price / 12;
      plans.push({
        id: 'yearly',
        title: 'Yearly',
        price: current.annual.product.priceString,
        pricePerMonth: `${current.annual.product.currencyCode} ${monthlyPrice.toFixed(2)}/mo`,
        period: 'yearly',
        package: current.annual,
        badge: 'Best Value',
      });
    }

    if (current.lifetime) {
      plans.push({
        id: 'lifetime',
        title: 'Lifetime',
        price: current.lifetime.product.priceString,
        period: 'lifetime',
        package: current.lifetime,
        badge: 'One-Time',
      });
    }

    return plans;
  } catch (e) {
    if (__DEV__) console.error('[revenue] getOfferings failed:', e);
    return [];
  }
}

// ── Purchase ─────────────────────────────────────────────────────────
export async function purchasePlan(plan: PlanOption): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.package);
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: isPremium };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false };
    }
    return { success: false, error: e.message || 'Purchase failed' };
  }
}

// ── Restore ──────────────────────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    if (__DEV__) console.error('[revenue] restorePurchases failed:', e);
    return false;
  }
}

// ── Dev diagnostics ──────────────────────────────────────────────────
/**
 * Returns a human-readable diagnostic snapshot for the Settings screen's
 * "Debug RevenueCat" action. Only meant to be exposed in dev builds or
 * behind a hidden gesture in production.
 */
export async function getRevenueCatDiagnostics(): Promise<string> {
  const lines: string[] = [];
  lines.push(`Platform: ${Platform.OS}`);
  lines.push(`Key present: ${REVENUECAT_API_KEY ? 'yes' : 'NO'}`);
  if (REVENUECAT_API_KEY) {
    lines.push(`Key prefix: ${REVENUECAT_API_KEY.slice(0, 5)}…`);
    const expected = Platform.OS === 'android' ? 'goog_' : 'appl_';
    lines.push(`Key matches platform: ${REVENUECAT_API_KEY.startsWith(expected) ? 'yes' : 'NO (wrong platform key!)'}`);
  }
  lines.push(`Configured: ${isConfigured ? 'yes' : 'no'}`);
  lines.push(`Entitlement ID: "${ENTITLEMENT_ID}"`);

  if (isConfigured) {
    try {
      const info = await Purchases.getCustomerInfo();
      const active = Object.keys(info.entitlements.active);
      lines.push(`Active entitlements: ${active.length ? active.join(', ') : '(none)'}`);
      lines.push(`User ID: ${info.originalAppUserId}`);
    } catch (e) {
      lines.push(`getCustomerInfo error: ${(e as Error).message}`);
    }

    try {
      const offerings = await Purchases.getOfferings();
      lines.push(`Offerings total: ${Object.keys(offerings.all).length}`);
      lines.push(`Current offering: ${offerings.current?.identifier ?? '(none)'}`);
      if (offerings.current) {
        lines.push(`Packages: ${offerings.current.availablePackages.map(p => p.identifier).join(', ') || '(none)'}`);
      }
    } catch (e) {
      lines.push(`getOfferings error: ${(e as Error).message}`);
    }
  }

  return lines.join('\n');
}
