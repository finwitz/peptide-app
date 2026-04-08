import type { Peptide } from './database';
import { getInteractionsForPeptide } from './interactionChecker';
import { checkInteractions } from './interactionChecker';

export interface AssistantResponse {
  type: 'peptide_info' | 'dosing' | 'comparison' | 'interaction' | 'general' | 'not_found';
  title: string;
  sections: AssistantSection[];
  relatedPeptides: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AssistantSection {
  heading: string;
  body: string;
  type: 'text' | 'warning' | 'tip' | 'data';
}

type Intent = 'dosing' | 'side_effects' | 'cycling' | 'comparison' | 'interaction' | 'storage' | 'general';

const PEPTIDE_ALIASES: Record<string, string> = {
  bpc: 'BPC-157', 'bpc157': 'BPC-157', 'bpc-157': 'BPC-157', '157': 'BPC-157',
  tb: 'TB-500', 'tb500': 'TB-500', 'tb-500': 'TB-500', 'tb4': 'TB-500', '500': 'TB-500',
  sema: 'Semaglutide', semaglutide: 'Semaglutide', ozempic: 'Semaglutide', wegovy: 'Semaglutide',
  tirz: 'Tirzepatide', tirzepatide: 'Tirzepatide', mounjaro: 'Tirzepatide',
  ipa: 'Ipamorelin', ipamorelin: 'Ipamorelin',
  cjc: 'CJC-1295 (no DAC)', 'cjc-1295': 'CJC-1295 (no DAC)', 'cjc1295': 'CJC-1295 (no DAC)',
  'cjc dac': 'CJC-1295 (with DAC)', 'cjc-dac': 'CJC-1295 (with DAC)',
  mk677: 'MK-677 (Ibutamoren)', 'mk-677': 'MK-677 (Ibutamoren)', ibutamoren: 'MK-677 (Ibutamoren)',
  ghk: 'GHK-Cu', 'ghk-cu': 'GHK-Cu',
  pt141: 'PT-141 (Bremelanotide)', 'pt-141': 'PT-141 (Bremelanotide)', bremelanotide: 'PT-141 (Bremelanotide)',
  mt2: 'Melanotan II', 'melanotan': 'Melanotan II', 'melanotan2': 'Melanotan II',
  igf: 'IGF-1 LR3', 'igf1': 'IGF-1 LR3', 'igf-1': 'IGF-1 LR3',
  sermorelin: 'Sermorelin',
  semax: 'Semax', selank: 'Selank', dihexa: 'Dihexa',
  'ghrp6': 'GHRP-6', 'ghrp-6': 'GHRP-6', 'ghrp2': 'GHRP-2', 'ghrp-2': 'GHRP-2',
  hexarelin: 'Hexarelin', tesamorelin: 'Tesamorelin',
  aod: 'AOD 9604', 'aod9604': 'AOD 9604', 'aod-9604': 'AOD 9604',
  dsip: 'DSIP', epitalon: 'Epitalon', 'mots-c': 'MOTS-c', motsc: 'MOTS-c',
  thymosin: 'Thymosin Alpha-1', 'ta1': 'Thymosin Alpha-1',
  liraglutide: 'Liraglutide', saxenda: 'Liraglutide',
  retatrutide: 'Retatrutide', reta: 'Retatrutide',
  'hcg': 'HCG', hgh: 'HGH Fragment 176-191',
  'yk11': 'YK-11', 'yk-11': 'YK-11', 's23': 'S23',
  glutathione: 'Glutathione', 'nad': 'NAD+ (NMN/NR)', 'nad+': 'NAD+ (NMN/NR)',
  'nmn': 'NAD+ (NMN/NR)', 'nsi189': 'NSI-189', 'nsi-189': 'NSI-189',
  'snap8': 'SNAP-8', 'snap-8': 'SNAP-8',
  'll37': 'LL-37', 'll-37': 'LL-37',
  kisspeptin: 'Kisspeptin-10',
  follistatin: 'Follistatin 344',
  'ru58841': 'RU-58841', 'ru-58841': 'RU-58841',
};

function classifyIntent(query: string): Intent {
  const q = query.toLowerCase();
  if (/dose|dosage|dosing|how much|how many|mcg|mg|take|inject|administer/.test(q)) return 'dosing';
  if (/side effect|sides|risk|danger|safe|safety|adverse|warning/.test(q)) return 'side_effects';
  if (/cycle|cycling|how long|duration|break|pct|on.off|weeks? on/.test(q)) return 'cycling';
  if (/vs|versus|compare|comparison|difference|or\b|better/.test(q)) return 'comparison';
  if (/combine|stack|together|mix|interaction|with\b|conflict/.test(q)) return 'interaction';
  if (/store|storage|refrigerat|expire|expir|shelf life|reconstitut|bac water/.test(q)) return 'storage';
  return 'general';
}

function extractPeptideNames(query: string, allPeptides: Peptide[]): Peptide[] {
  const q = query.toLowerCase().replace(/[?!.,]/g, '');
  const tokens = q.split(/\s+/);
  const matched = new Map<number, Peptide>();

  // Check aliases first
  for (const token of tokens) {
    const alias = PEPTIDE_ALIASES[token];
    if (alias) {
      const pep = allPeptides.find(p => p.name === alias);
      if (pep) matched.set(pep.id, pep);
    }
    // Try multi-token aliases
    for (const [key, val] of Object.entries(PEPTIDE_ALIASES)) {
      if (q.includes(key)) {
        const pep = allPeptides.find(p => p.name === val);
        if (pep) matched.set(pep.id, pep);
      }
    }
  }

  // Direct name matching
  for (const pep of allPeptides) {
    const pepLower = pep.name.toLowerCase();
    if (q.includes(pepLower)) {
      matched.set(pep.id, pep);
    }
    // Partial match for longer names
    const simplified = pepLower.replace(/[^a-z0-9]/g, '');
    for (const token of tokens) {
      const tokenSimplified = token.replace(/[^a-z0-9]/g, '');
      if (tokenSimplified.length >= 3 && simplified.includes(tokenSimplified)) {
        matched.set(pep.id, pep);
      }
    }
  }

  return Array.from(matched.values());
}

function formatDose(mcg: number): string {
  return mcg >= 1000 ? `${(mcg / 1000).toFixed(1)} mg` : `${mcg} mcg`;
}

function formatHalfLife(hours: number | null): string {
  if (hours === null) return 'Unknown';
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`;
  if (hours >= 1) return `${hours} hours`;
  return `${(hours * 60).toFixed(0)} minutes`;
}

function buildPeptideInfoResponse(peptide: Peptide): AssistantResponse {
  const sections: AssistantSection[] = [];

  if (peptide.description) {
    sections.push({ heading: 'Overview', body: peptide.description, type: 'text' });
  }

  if (peptide.typical_dose_mcg_low) {
    const doseRange = peptide.typical_dose_mcg_high && peptide.typical_dose_mcg_high !== peptide.typical_dose_mcg_low
      ? `${formatDose(peptide.typical_dose_mcg_low)} — ${formatDose(peptide.typical_dose_mcg_high)}`
      : formatDose(peptide.typical_dose_mcg_low);
    sections.push({
      heading: 'Dosing',
      body: `Typical dose: ${doseRange}\nFrequency: ${peptide.frequency ?? 'N/A'}\nRoute: ${peptide.route ?? 'N/A'}\nHalf-life: ${formatHalfLife(peptide.half_life_hours)}`,
      type: 'data',
    });
  }

  if (peptide.cycle_info) {
    sections.push({ heading: 'Cycling', body: peptide.cycle_info, type: 'tip' });
  }
  if (peptide.side_effects) {
    sections.push({ heading: 'Side Effects', body: peptide.side_effects, type: 'warning' });
  }
  if (peptide.storage_info) {
    sections.push({ heading: 'Storage', body: peptide.storage_info, type: 'data' });
  }

  const interactions = getInteractionsForPeptide(peptide.name);
  if (interactions.length > 0) {
    const ixnText = interactions.map(i => {
      const other = i.peptideA === peptide.name ? i.peptideB : i.peptideA;
      return `• ${other} (${i.severity}): ${i.description}`;
    }).join('\n');
    sections.push({ heading: 'Known Interactions', body: ixnText, type: 'warning' });
  }

  return {
    type: 'peptide_info',
    title: peptide.name,
    sections,
    relatedPeptides: [],
    confidence: 'high',
  };
}

function buildDosingResponse(peptide: Peptide): AssistantResponse {
  const sections: AssistantSection[] = [];

  if (peptide.typical_dose_mcg_low) {
    const doseRange = peptide.typical_dose_mcg_high && peptide.typical_dose_mcg_high !== peptide.typical_dose_mcg_low
      ? `${formatDose(peptide.typical_dose_mcg_low)} — ${formatDose(peptide.typical_dose_mcg_high)}`
      : formatDose(peptide.typical_dose_mcg_low);
    sections.push({
      heading: 'Recommended Dose',
      body: `${doseRange}\n\nFrequency: ${peptide.frequency ?? 'N/A'}\nRoute: ${peptide.route ?? 'N/A'}`,
      type: 'data',
    });
  }

  if (peptide.description) {
    sections.push({ heading: 'Details', body: peptide.description, type: 'text' });
  }

  if (peptide.cycle_info) {
    sections.push({ heading: 'Cycling', body: peptide.cycle_info, type: 'tip' });
  }

  sections.push({
    heading: 'Disclaimer',
    body: 'Dosing information is for reference only. Always consult a qualified healthcare professional.',
    type: 'warning',
  });

  return {
    type: 'dosing',
    title: `${peptide.name} Dosing`,
    sections,
    relatedPeptides: [],
    confidence: 'high',
  };
}

function buildComparisonResponse(peptides: Peptide[]): AssistantResponse {
  const a = peptides[0];
  const b = peptides[1];

  const rows = [
    ['Category', a.category, b.category],
    ['Dose Range', a.typical_dose_mcg_low ? `${formatDose(a.typical_dose_mcg_low)}${a.typical_dose_mcg_high ? ` — ${formatDose(a.typical_dose_mcg_high)}` : ''}` : 'N/A',
      b.typical_dose_mcg_low ? `${formatDose(b.typical_dose_mcg_low)}${b.typical_dose_mcg_high ? ` — ${formatDose(b.typical_dose_mcg_high)}` : ''}` : 'N/A'],
    ['Half-Life', formatHalfLife(a.half_life_hours), formatHalfLife(b.half_life_hours)],
    ['Frequency', a.frequency ?? 'N/A', b.frequency ?? 'N/A'],
    ['Route', a.route ?? 'N/A', b.route ?? 'N/A'],
  ];

  const table = rows.map(r => `${r[0]}:\n  ${a.name}: ${r[1]}\n  ${b.name}: ${r[2]}`).join('\n\n');

  const sections: AssistantSection[] = [
    { heading: 'Comparison', body: table, type: 'data' },
  ];

  if (a.description) sections.push({ heading: a.name, body: a.description, type: 'text' });
  if (b.description) sections.push({ heading: b.name, body: b.description, type: 'text' });

  const ixns = checkInteractions([a.name, b.name]);
  if (ixns.length > 0) {
    sections.push({
      heading: 'Interaction Warning',
      body: ixns.map(i => `${i.severity.toUpperCase()}: ${i.description}\n→ ${i.recommendation}`).join('\n\n'),
      type: 'warning',
    });
  }

  return {
    type: 'comparison',
    title: `${a.name} vs ${b.name}`,
    sections,
    relatedPeptides: [a.name, b.name],
    confidence: 'high',
  };
}

function buildInteractionResponse(peptides: Peptide[]): AssistantResponse {
  const names = peptides.map(p => p.name);
  const ixns = checkInteractions(names);

  const sections: AssistantSection[] = [];

  if (ixns.length > 0) {
    for (const ixn of ixns) {
      sections.push({
        heading: `${ixn.peptideA} + ${ixn.peptideB}`,
        body: `Severity: ${ixn.severity.toUpperCase()}\n\n${ixn.description}\n\nRecommendation: ${ixn.recommendation}`,
        type: ixn.severity === 'contraindicated' || ixn.severity === 'major' ? 'warning' : 'tip',
      });
    }
  } else {
    sections.push({
      heading: 'No Known Interactions',
      body: `No documented interactions found between ${names.join(' and ')}. This does not guarantee safety — always consult a healthcare professional.`,
      type: 'text',
    });
  }

  return {
    type: 'interaction',
    title: `Interaction Check: ${names.join(' + ')}`,
    sections,
    relatedPeptides: names,
    confidence: ixns.length > 0 ? 'high' : 'medium',
  };
}

export function processQuery(query: string, allPeptides: Peptide[]): AssistantResponse {
  const intent = classifyIntent(query);
  const matched = extractPeptideNames(query, allPeptides);

  // Comparison: need exactly 2 peptides
  if (intent === 'comparison' && matched.length >= 2) {
    return buildComparisonResponse(matched.slice(0, 2));
  }

  // Interaction: need 2+ peptides
  if (intent === 'interaction' && matched.length >= 2) {
    return buildInteractionResponse(matched);
  }

  // Single peptide queries
  if (matched.length >= 1) {
    const peptide = matched[0];
    switch (intent) {
      case 'dosing':
        return buildDosingResponse(peptide);
      case 'side_effects': {
        const sections: AssistantSection[] = [];
        if (peptide.side_effects) {
          sections.push({ heading: 'Side Effects', body: peptide.side_effects, type: 'warning' });
        } else {
          sections.push({ heading: 'Side Effects', body: 'No specific side effect data available for this compound.', type: 'text' });
        }
        if (peptide.description) sections.push({ heading: 'About', body: peptide.description, type: 'text' });
        return { type: 'peptide_info', title: `${peptide.name} Side Effects`, sections, relatedPeptides: [peptide.name], confidence: 'high' };
      }
      case 'cycling': {
        const sections: AssistantSection[] = [];
        if (peptide.cycle_info) {
          sections.push({ heading: 'Cycling Protocol', body: peptide.cycle_info, type: 'tip' });
        } else {
          sections.push({ heading: 'Cycling', body: 'No specific cycling data available. Consult a healthcare professional.', type: 'text' });
        }
        return { type: 'peptide_info', title: `${peptide.name} Cycling`, sections, relatedPeptides: [peptide.name], confidence: 'high' };
      }
      case 'storage': {
        const sections: AssistantSection[] = [];
        if (peptide.storage_info) {
          sections.push({ heading: 'Storage', body: peptide.storage_info, type: 'data' });
        } else {
          sections.push({ heading: 'Storage', body: 'No specific storage data available. General rule: refrigerate 2-8°C.', type: 'text' });
        }
        return { type: 'peptide_info', title: `${peptide.name} Storage`, sections, relatedPeptides: [peptide.name], confidence: 'high' };
      }
      default:
        return buildPeptideInfoResponse(peptide);
    }
  }

  // Category search fallback
  const q = query.toLowerCase();
  const categoryMatches = allPeptides.filter(p =>
    p.category.toLowerCase().includes(q) ||
    (p.description?.toLowerCase().includes(q) ?? false)
  );

  if (categoryMatches.length > 0) {
    const top = categoryMatches.slice(0, 5);
    return {
      type: 'general',
      title: `Results for "${query}"`,
      sections: [{
        heading: `Found ${categoryMatches.length} peptides`,
        body: top.map(p => `• ${p.name} (${p.category}) — ${p.description?.split('.')[0] ?? ''}`).join('\n'),
        type: 'data',
      }],
      relatedPeptides: top.map(p => p.name),
      confidence: 'medium',
    };
  }

  return {
    type: 'not_found',
    title: 'No results found',
    sections: [{
      heading: 'Try a different query',
      body: 'I can help with peptide dosing, side effects, cycling, storage, comparisons, and interaction checks. Try asking about a specific peptide by name, or browse the Library tab.',
      type: 'tip',
    }],
    relatedPeptides: [],
    confidence: 'low',
  };
}

export const SUGGESTED_QUERIES = [
  'How to dose BPC-157?',
  'Semaglutide vs Tirzepatide',
  'GH stack side effects',
  'Can I combine Ipamorelin + CJC-1295?',
];
