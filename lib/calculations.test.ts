import {
  calculateReconstitution,
  calculateDecay,
  generateDecayCurve,
  mcgToMg,
  mgToMcg,
  formatSyringeUnits,
  formatMl,
  SYRINGE_TYPES,
  type SyringeType,
} from './calculations';

describe('calculateReconstitution', () => {
  test('standard BPC-157 calculation: 5mg vial, 2mL BAC, 250mcg dose, U-100', () => {
    const result = calculateReconstitution({
      vialMg: 5,
      waterMl: 2,
      desiredDoseMcg: 250,
      syringeType: 'U100',
    });

    expect(result.concentrationMgPerMl).toBe(2.5);
    expect(result.concentrationMcgPerMl).toBe(2500);
    expect(result.injectionMl).toBe(0.1);
    expect(result.syringeUnits).toBe(10);
    expect(result.dosesPerVial).toBe(20);
    expect(result.isValid).toBe(true);
    expect(result.warningMessage).toBeNull();
  });

  test('semaglutide calculation: 5mg vial, 1.5mL BAC, 500mcg dose, U-100', () => {
    const result = calculateReconstitution({
      vialMg: 5,
      waterMl: 1.5,
      desiredDoseMcg: 500,
      syringeType: 'U100',
    });

    expect(result.concentrationMgPerMl).toBeCloseTo(3.3333, 3);
    expect(result.injectionMl).toBeCloseTo(0.15, 2);
    expect(result.syringeUnits).toBe(15);
    expect(result.dosesPerVial).toBe(10);
    expect(result.isValid).toBe(true);
  });

  test('U-40 syringe calculation', () => {
    const result = calculateReconstitution({
      vialMg: 5,
      waterMl: 2,
      desiredDoseMcg: 250,
      syringeType: 'U40',
    });

    // Same concentration and mL, but different unit count
    expect(result.concentrationMgPerMl).toBe(2.5);
    expect(result.injectionMl).toBe(0.1);
    // U-40: 40 units per mL, so 0.1mL = 4 units
    expect(result.syringeUnits).toBe(4);
    expect(result.isValid).toBe(true);
  });

  test('U-30 syringe (0.3mL) calculation', () => {
    const result = calculateReconstitution({
      vialMg: 5,
      waterMl: 2,
      desiredDoseMcg: 250,
      syringeType: 'U30',
    });

    // U-30 is 30 units in 0.3mL = 100 units/mL
    expect(result.syringeUnits).toBe(10);
    expect(result.isValid).toBe(true);
  });

  test('dose exceeding syringe capacity warns', () => {
    const result = calculateReconstitution({
      vialMg: 5,
      waterMl: 0.5, // highly concentrated
      desiredDoseMcg: 5000, // large dose
      syringeType: 'U30', // small syringe (0.3mL)
    });

    // 5mg/0.5mL = 10mg/mL = 10000mcg/mL
    // 5000mcg / 10000mcg/mL = 0.5mL, but U-30 only holds 0.3mL
    expect(result.isValid).toBe(false);
    expect(result.warningMessage).toContain('exceeds syringe capacity');
  });

  test('very small dose warns about accuracy', () => {
    const result = calculateReconstitution({
      vialMg: 10,
      waterMl: 2,
      desiredDoseMcg: 1,
      syringeType: 'U100',
    });

    // 10mg/2mL = 5mg/mL = 5000mcg/mL
    // 1mcg / 5000mcg/mL = 0.0002mL = 0.02 units
    expect(result.syringeUnits).toBeLessThan(1);
    expect(result.warningMessage).toContain('very small');
  });

  test('dose equal to full vial warns', () => {
    // 5mg vial, 2mL water, dose = entire vial (5000mcg = 5mg)
    // This needs a syringe big enough: U-100 1mL can hold 2mL worth = exceeds
    // Use tuberculin which is also 1mL but the dose = 2mL which exceeds too
    // So test with enough water that it fits: 5mg/5mL = 1mg/mL, 5000mcg dose = 5mL = still too big
    // The syringe capacity warning fires first. Let's just test a case where it fits.
    const result = calculateReconstitution({
      vialMg: 5,
      waterMl: 0.5,   // 5mg/0.5mL = 10mg/mL
      desiredDoseMcg: 5000, // 5000mcg = 0.5mL = 50 units on U-100 — fits!
      syringeType: 'U100',
    });

    expect(result.warningMessage).toContain('entire vial');
    expect(result.syringeUnits).toBe(50);
    expect(result.isValid).toBe(true);
  });

  test('all syringe types produce valid results for standard calc', () => {
    const syringeTypes: SyringeType[] = ['U100', 'U50', 'U40', 'U30', 'U20', 'tuberculin'];
    for (const st of syringeTypes) {
      const result = calculateReconstitution({
        vialMg: 5,
        waterMl: 2,
        desiredDoseMcg: 250,
        syringeType: st,
      });
      expect(result.concentrationMgPerMl).toBe(2.5);
      expect(result.injectionMl).toBe(0.1);
      expect(result.isValid).toBe(true);
    }
  });

  test('consistency: same concentration regardless of syringe', () => {
    const types: SyringeType[] = ['U100', 'U40', 'tuberculin'];
    const results = types.map(t =>
      calculateReconstitution({ vialMg: 10, waterMl: 3, desiredDoseMcg: 500, syringeType: t })
    );

    // All should have same concentration and injection volume
    const conc = results[0].concentrationMgPerMl;
    const ml = results[0].injectionMl;
    for (const r of results) {
      expect(r.concentrationMgPerMl).toBe(conc);
      expect(r.injectionMl).toBe(ml);
    }
  });
});

describe('calculateDecay', () => {
  test('at t=0, level equals initial concentration', () => {
    expect(calculateDecay(100, 4, 0)).toBe(100);
  });

  test('at t=halfLife, level is approximately half', () => {
    const result = calculateDecay(100, 4, 4);
    expect(result).toBeCloseTo(50, 1);
  });

  test('at t=2*halfLife, level is approximately quarter', () => {
    const result = calculateDecay(100, 4, 8);
    expect(result).toBeCloseTo(25, 1);
  });

  test('decay is always positive', () => {
    const result = calculateDecay(100, 4, 100);
    expect(result).toBeGreaterThan(0);
  });
});

describe('generateDecayCurve', () => {
  test('generates correct number of points', () => {
    const curve = generateDecayCurve(100, 4, 24, 50);
    expect(curve).toHaveLength(51); // 0 to 50 inclusive
  });

  test('first point is at full dose', () => {
    const curve = generateDecayCurve(250, 4, 24);
    expect(curve[0].hour).toBe(0);
    expect(curve[0].level).toBe(250);
  });

  test('curve is monotonically decreasing', () => {
    const curve = generateDecayCurve(100, 4, 48);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].level).toBeLessThanOrEqual(curve[i - 1].level);
    }
  });
});

describe('unit conversions', () => {
  test('mcgToMg', () => {
    expect(mcgToMg(1000)).toBe(1);
    expect(mcgToMg(250)).toBe(0.25);
    expect(mcgToMg(500)).toBe(0.5);
  });

  test('mgToMcg', () => {
    expect(mgToMcg(1)).toBe(1000);
    expect(mgToMcg(0.25)).toBe(250);
    expect(mgToMcg(5)).toBe(5000);
  });

  test('roundtrip conversion', () => {
    expect(mcgToMg(mgToMcg(2.5))).toBe(2.5);
    expect(mgToMcg(mcgToMg(750))).toBe(750);
  });
});

describe('formatting', () => {
  test('formatSyringeUnits', () => {
    expect(formatSyringeUnits(10)).toBe('10');
    expect(formatSyringeUnits(5.5)).toBe('5.5');
    expect(formatSyringeUnits(0.5)).toBe('0.50');
  });

  test('formatMl', () => {
    expect(formatMl(1.5)).toBe('1.50');
    expect(formatMl(0.15)).toBe('0.150');
    expect(formatMl(0.002)).toBe('0.0020');
  });
});

describe('SYRINGE_TYPES constants', () => {
  test('all syringe types have required fields', () => {
    for (const [key, info] of Object.entries(SYRINGE_TYPES)) {
      expect(info.type).toBe(key);
      expect(info.label).toBeTruthy();
      expect(info.totalUnits).toBeGreaterThan(0);
      expect(info.totalMl).toBeGreaterThan(0);
      expect(info.description).toBeTruthy();
    }
  });

  test('U-100 1mL has 100 units', () => {
    expect(SYRINGE_TYPES.U100.totalUnits).toBe(100);
    expect(SYRINGE_TYPES.U100.totalMl).toBe(1.0);
  });

  test('U-40 has 40 units per mL', () => {
    expect(SYRINGE_TYPES.U40.totalUnits).toBe(40);
    expect(SYRINGE_TYPES.U40.totalMl).toBe(1.0);
  });
});
