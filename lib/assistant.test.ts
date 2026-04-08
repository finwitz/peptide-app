import { processQuery, SUGGESTED_QUERIES, type AssistantResponse } from './assistant';
import type { Peptide } from './database';

const mockPeptides: Peptide[] = [
  {
    id: 1, name: 'BPC-157', category: 'Healing',
    typical_dose_mcg_low: 250, typical_dose_mcg_high: 500,
    frequency: 'Daily', route: 'SubQ', half_life_hours: 4,
    description: 'Body Protection Compound for tissue repair.',
    storage_info: 'Store 2-8°C after reconstitution.',
    cycle_info: '4-6 weeks on, 2 weeks off.',
    side_effects: 'Generally well tolerated. Mild nausea possible.',
  } as Peptide,
  {
    id: 2, name: 'Semaglutide', category: 'Weight Loss',
    typical_dose_mcg_low: 250, typical_dose_mcg_high: 2400,
    frequency: 'Weekly', route: 'SubQ', half_life_hours: 168,
    description: 'GLP-1 receptor agonist for weight management.',
    storage_info: 'Refrigerate 2-8°C.',
    cycle_info: null, side_effects: 'Nausea, vomiting, diarrhea common.',
  } as Peptide,
  {
    id: 3, name: 'Tirzepatide', category: 'Weight Loss',
    typical_dose_mcg_low: 2500, typical_dose_mcg_high: 15000,
    frequency: 'Weekly', route: 'SubQ', half_life_hours: 120,
    description: 'Dual GIP/GLP-1 agonist for weight loss.',
    storage_info: null, cycle_info: null, side_effects: 'GI side effects.',
  } as Peptide,
  {
    id: 4, name: 'Ipamorelin', category: 'Growth Hormone',
    typical_dose_mcg_low: 200, typical_dose_mcg_high: 300,
    frequency: 'Daily', route: 'SubQ', half_life_hours: 2,
    description: 'Selective GHRP for growth hormone release.',
    storage_info: null, cycle_info: null, side_effects: null,
  } as Peptide,
];

describe('processQuery', () => {
  it('returns peptide info for a name query', () => {
    const result = processQuery('Tell me about BPC-157', mockPeptides);
    expect(result.type).toBe('peptide_info');
    expect(result.title).toBe('BPC-157');
    expect(result.confidence).toBe('high');
  });

  it('returns dosing info for dose query', () => {
    const result = processQuery('How much BPC-157 should I take?', mockPeptides);
    expect(result.type).toBe('dosing');
    expect(result.title).toContain('BPC-157');
    expect(result.sections.some(s => s.heading === 'Recommended Dose')).toBe(true);
  });

  it('returns comparison for two peptides', () => {
    const result = processQuery('Semaglutide vs Tirzepatide', mockPeptides);
    expect(result.type).toBe('comparison');
    expect(result.title).toContain('vs');
    expect(result.relatedPeptides).toHaveLength(2);
  });

  it('returns interaction check for combine queries', () => {
    const result = processQuery('Can I combine Semaglutide with Tirzepatide?', mockPeptides);
    expect(result.type).toBe('interaction');
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('returns side effects info', () => {
    const result = processQuery('BPC-157 side effects', mockPeptides);
    expect(result.title).toContain('Side Effects');
    expect(result.sections.some(s => s.heading === 'Side Effects')).toBe(true);
  });

  it('returns cycling info', () => {
    const result = processQuery('How long should I cycle BPC-157?', mockPeptides);
    expect(result.title).toContain('Cycling');
    expect(result.sections.some(s => s.heading === 'Cycling Protocol')).toBe(true);
  });

  it('returns storage info', () => {
    const result = processQuery('How to store BPC-157?', mockPeptides);
    expect(result.title).toContain('Storage');
    expect(result.sections.some(s => s.heading === 'Storage')).toBe(true);
  });

  it('handles aliases (ozempic -> Semaglutide)', () => {
    const result = processQuery('Tell me about ozempic', mockPeptides);
    expect(result.title).toBe('Semaglutide');
  });

  it('returns not_found for unknown queries', () => {
    const result = processQuery('xyznotapeptide', mockPeptides);
    expect(result.type).toBe('not_found');
    expect(result.confidence).toBe('low');
  });

  it('handles empty query gracefully', () => {
    const result = processQuery('', mockPeptides);
    expect(result).toBeDefined();
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('returns category matches as fallback', () => {
    const result = processQuery('weight loss', mockPeptides);
    expect(result.type).toBe('general');
    expect(result.relatedPeptides.length).toBeGreaterThan(0);
  });
});

describe('SUGGESTED_QUERIES', () => {
  it('has at least 3 suggestions', () => {
    expect(SUGGESTED_QUERIES.length).toBeGreaterThanOrEqual(3);
  });

  it('all produce valid responses', () => {
    for (const q of SUGGESTED_QUERIES) {
      const result = processQuery(q, mockPeptides);
      expect(result).toBeDefined();
      expect(result.sections.length).toBeGreaterThan(0);
    }
  });
});
