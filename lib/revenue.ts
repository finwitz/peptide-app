import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ── Constants ────────────────────────────────────────────────────────
// API key loaded from .env (EXPO_PUBLIC_REVENUECAT_API_KEY)
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

// This must match the entitlement ID in your RevenueCat dashboard
export const ENTITLEMENT_ID = 'Peptide Pro';

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
    // Subscriptions silently disabled — app works as free tier
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    isConfigured = true;
  } catch {
    // Configuration failed — silently fall back to free tier
  }
}

// ── Entitlement check ────────────────────────────────────────────────
export async function checkPremiumStatus(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
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
  if (!isConfigured) return [];

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];

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
  } catch {
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
  } catch {
    return false;
  }
}
