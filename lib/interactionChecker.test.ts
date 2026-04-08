import { checkInteractions, checkNewProtocolInteractions, getInteractionsForPeptide, getSeverityInfo } from './interactionChecker';
import type { Protocol } from './database';

describe('checkInteractions', () => {
  it('finds interaction between known pair', () => {
    const result = checkInteractions(['Semaglutide', 'Tirzepatide']);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].peptideA.toLowerCase()).toContain('semaglutide');
  });

  it('returns empty for unrelated peptides', () => {
    const result = checkInteractions(['BPC-157', 'Semax']);
    expect(result).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const result = checkInteractions(['semaglutide', 'tirzepatide']);
    expect(result.length).toBeGreaterThan(0);
  });

  it('sorts by severity (most severe first)', () => {
    const result = checkInteractions(['Semaglutide', 'Tirzepatide', 'Liraglutide']);
    if (result.length >= 2) {
      const severityOrder = { contraindicated: 0, major: 1, moderate: 2, minor: 3, timing: 4 };
      for (let i = 1; i < result.length; i++) {
        expect(severityOrder[result[i].severity]).toBeGreaterThanOrEqual(severityOrder[result[i - 1].severity]);
      }
    }
  });

  it('returns empty for single peptide', () => {
    const result = checkInteractions(['BPC-157']);
    expect(result).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    const result = checkInteractions([]);
    expect(result).toHaveLength(0);
  });
});

describe('checkNewProtocolInteractions', () => {
  it('checks new peptide against active protocols', () => {
    const activeProtocols = [
      { peptide_name: 'Semaglutide' } as Protocol,
    ];
    const result = checkNewProtocolInteractions('Tirzepatide', activeProtocols);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty when no conflicts', () => {
    const activeProtocols = [
      { peptide_name: 'BPC-157' } as Protocol,
    ];
    const result = checkNewProtocolInteractions('Semax', activeProtocols);
    expect(result).toHaveLength(0);
  });
});

describe('getInteractionsForPeptide', () => {
  it('returns all interactions involving a peptide', () => {
    const result = getInteractionsForPeptide('Semaglutide');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(i => {
      const involves = i.peptideA.toLowerCase() === 'semaglutide' || i.peptideB.toLowerCase() === 'semaglutide';
      expect(involves).toBe(true);
    });
  });

  it('returns empty for peptide with no interactions', () => {
    const result = getInteractionsForPeptide('Glutathione');
    expect(result).toHaveLength(0);
  });
});

describe('getSeverityInfo', () => {
  it('returns correct info for each severity', () => {
    expect(getSeverityInfo('contraindicated').label).toBe('Contraindicated');
    expect(getSeverityInfo('major').label).toBe('Major');
    expect(getSeverityInfo('moderate').label).toBe('Moderate');
    expect(getSeverityInfo('minor').label).toBe('Minor');
    expect(getSeverityInfo('timing').label).toBe('Timing');
  });

  it('returns icon for each severity', () => {
    expect(getSeverityInfo('contraindicated').icon).toBeTruthy();
    expect(getSeverityInfo('timing').icon).toBeTruthy();
  });
});
