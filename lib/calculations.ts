/**
 * Pure functions for peptide reconstitution and dosing calculations.
 * These are the core value prop — they must be perfectly accurate.
 * All functions are pure (no side effects) and exhaustively tested.
 */

export type SyringeType = 'U100' | 'U50' | 'U40' | 'U30' | 'U20' | 'tuberculin';

export interface SyringeInfo {
  type: SyringeType;
  label: string;
  totalUnits: number;
  totalMl: number;
  ticksPerUnit: number;
  description: string;
}

export const SYRINGE_TYPES: Record<SyringeType, SyringeInfo> = {
  U100: {
    type: 'U100',
    label: 'U-100 (1mL)',
    totalUnits: 100,
    totalMl: 1.0,
    ticksPerUnit: 1,
    description: '100 units per mL — most common insulin syringe',
  },
  U50: {
    type: 'U50',
    label: 'U-100 (0.5mL)',
    totalUnits: 50,
    totalMl: 0.5,
    ticksPerUnit: 1,
    description: '50 units in 0.5mL — half-size U-100',
  },
  U40: {
    type: 'U40',
    label: 'U-40 (1mL)',
    totalUnits: 40,
    totalMl: 1.0,
    ticksPerUnit: 1,
    description: '40 units per mL — used for pet insulin',
  },
  U30: {
    type: 'U30',
    label: 'U-100 (0.3mL)',
    totalUnits: 30,
    totalMl: 0.3,
    ticksPerUnit: 1,
    description: '30 units in 0.3mL — small U-100',
  },
  U20: {
    type: 'U20',
    label: 'U-100 (0.2mL)',
    totalUnits: 20,
    totalMl: 0.2,
    ticksPerUnit: 1,
    description: '20 units in 0.2mL — micro dose syringe',
  },
  tuberculin: {
    type: 'tuberculin',
    label: 'Tuberculin (1mL)',
    totalUnits: 100,
    totalMl: 1.0,
    ticksPerUnit: 1,
    description: '1mL non-insulin syringe with 0.01mL graduations',
  },
};

export interface ReconstitutionInput {
  vialMg: number;          // mg of peptide in vial
  waterMl: number;         // mL of BAC water added
  desiredDoseMcg: number;  // desired dose in mcg
  syringeType: SyringeType;
}

export interface ReconstitutionResult {
  concentrationMgPerMl: number;   // mg per mL after reconstitution
  concentrationMcgPerMl: number;  // mcg per mL
  injectionMl: number;            // mL to draw
  syringeUnits: number;           // units/tick marks on syringe
  dosesPerVial: number;           // total doses from this vial
  isValid: boolean;               // whether the dose fits in the syringe
  warningMessage: string | null;  // any warnings
}

/**
 * Calculate reconstitution values.
 * This is the most important function in the app — accuracy is critical.
 */
export function calculateReconstitution(input: ReconstitutionInput): ReconstitutionResult {
  const { vialMg, waterMl, desiredDoseMcg, syringeType } = input;
  const syringe = SYRINGE_TYPES[syringeType];

  // Concentration after mixing
  const concentrationMgPerMl = vialMg / waterMl;
  const concentrationMcgPerMl = concentrationMgPerMl * 1000;

  // Volume to inject
  const injectionMl = desiredDoseMcg / concentrationMcgPerMl;

  // Convert to syringe units
  const syringeUnits = injectionMl * (syringe.totalUnits / syringe.totalMl);

  // How many doses from this vial
  const dosesPerVial = Math.floor(waterMl / injectionMl);

  // Validation
  const isValid = syringeUnits <= syringe.totalUnits && syringeUnits > 0;

  let warningMessage: string | null = null;
  if (syringeUnits > syringe.totalUnits) {
    warningMessage = `Dose exceeds syringe capacity (${syringe.totalUnits} units). Use a larger syringe or reduce dose.`;
  } else if (syringeUnits < 1) {
    warningMessage = 'Dose is very small and may be difficult to measure accurately. Consider using less water for reconstitution.';
  } else if (desiredDoseMcg >= vialMg * 1000) {
    warningMessage = 'Dose equals or exceeds the entire vial content. Please verify.';
  }

  return {
    concentrationMgPerMl: round(concentrationMgPerMl, 4),
    concentrationMcgPerMl: round(concentrationMcgPerMl, 2),
    injectionMl: round(injectionMl, 4),
    syringeUnits: round(syringeUnits, 1),
    dosesPerVial,
    isValid,
    warningMessage,
  };
}

/**
 * Convert between mcg and mg.
 */
export function mcgToMg(mcg: number): number {
  return mcg / 1000;
}

export function mgToMcg(mg: number): number {
  return mg * 1000;
}

/**
 * Calculate half-life decay at time t.
 * C(t) = C0 * e^(-0.693 * t / t_half)
 */
export function calculateDecay(
  initialConcentration: number,
  halfLifeHours: number,
  elapsedHours: number
): number {
  return initialConcentration * Math.exp(-0.693 * elapsedHours / halfLifeHours);
}

/**
 * Generate decay curve data points for charting.
 */
export function generateDecayCurve(
  doseMcg: number,
  halfLifeHours: number,
  totalHours: number,
  pointsCount: number = 100
): Array<{ hour: number; level: number }> {
  const points: Array<{ hour: number; level: number }> = [];
  const step = totalHours / pointsCount;

  for (let i = 0; i <= pointsCount; i++) {
    const hour = i * step;
    const level = calculateDecay(doseMcg, halfLifeHours, hour);
    points.push({ hour: round(hour, 1), level: round(level, 2) });
  }

  return points;
}

/**
 * Round to specified decimal places.
 */
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format syringe units for display.
 */
export function formatSyringeUnits(units: number): string {
  if (units >= 10) return units.toFixed(0);
  if (units >= 1) return units.toFixed(1);
  return units.toFixed(2);
}

/**
 * Format volume in mL for display.
 */
export function formatMl(ml: number): string {
  if (ml >= 1) return ml.toFixed(2);
  if (ml >= 0.1) return ml.toFixed(3);
  return ml.toFixed(4);
}

/**
 * Format a frequency in days as a human label.
 * Handles all the common presets (daily, EOD, 3x/week, 2x/week, weekly, biweekly, monthly).
 */
export function formatFrequency(days: number): string {
  if (days === 1) return 'Daily';
  if (days === 2) return 'EOD';
  if (Math.abs(days - 7 / 3) < 0.01) return '3x/week';
  if (days === 3.5) return '2x/week';
  if (days === 7) return 'Weekly';
  if (days === 14) return 'Biweekly';
  if (days === 30) return 'Monthly';
  if (Number.isInteger(days)) return `Every ${days} days`;
  return `Every ${days.toFixed(1)} days`;
}

/**
 * Format a dose in mcg as mg or mcg depending on magnitude.
 */
export function formatDose(mcg: number): string {
  if (mcg >= 1000) return `${(mcg / 1000).toFixed(mcg >= 10000 ? 1 : 2)} mg`;
  return `${mcg} mcg`;
}
