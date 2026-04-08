export type TemplateCategory =
  'healing' | 'weight_loss' | 'growth_hormone' | 'cognitive' |
  'longevity' | 'performance' | 'sexual_health' | 'immune';

export interface TemplatePeptide {
  peptideName: string;
  doseMcg: number;
  frequencyDays: number;
  route: string;
  vialMg?: number;
  waterMl?: number;
  syringeType?: string;
  notes?: string;
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  peptides: TemplatePeptide[];
  durationWeeks: number;
  notes: string;
  tags: string[];
}

const CATEGORY_INFO: Record<TemplateCategory, { label: string; icon: string }> = {
  healing: { label: 'Healing', icon: 'bandage-outline' },
  weight_loss: { label: 'Weight Loss', icon: 'trending-down-outline' },
  growth_hormone: { label: 'Growth Hormone', icon: 'arrow-up-outline' },
  cognitive: { label: 'Cognitive', icon: 'brain-outline' },
  longevity: { label: 'Longevity', icon: 'hourglass-outline' },
  performance: { label: 'Performance', icon: 'fitness-outline' },
  sexual_health: { label: 'Sexual Health', icon: 'heart-outline' },
  immune: { label: 'Immune', icon: 'shield-checkmark-outline' },
};

export function getCategoryInfo(cat: TemplateCategory) { return CATEGORY_INFO[cat]; }

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  // ── Healing ──
  {
    id: 'bpc157-tb500-healing',
    name: 'BPC-157 + TB-500 Healing Stack',
    description: 'Classic injury recovery stack combining two synergistic healing peptides. BPC-157 for localized tissue repair, TB-500 for systemic healing.',
    category: 'healing',
    icon: 'bandage-outline',
    durationWeeks: 6,
    notes: 'Inject BPC-157 near injury site. TB-500 can be injected SubQ anywhere. Separate injection sites.',
    tags: ['injury', 'recovery', 'tissue', 'tendon', 'joint'],
    peptides: [
      { peptideName: 'BPC-157', doseMcg: 500, frequencyDays: 1, route: 'SubQ', vialMg: 5, waterMl: 2, syringeType: 'U100' },
      { peptideName: 'TB-500', doseMcg: 5000, frequencyDays: 3.5, route: 'SubQ', vialMg: 5, waterMl: 2, syringeType: 'U100' },
    ],
  },
  {
    id: 'bpc157-solo',
    name: 'BPC-157 Solo Healing',
    description: 'Simple single-peptide healing protocol. Great for beginners. Targets gut health, tendons, ligaments, and general tissue repair.',
    category: 'healing',
    icon: 'bandage-outline',
    durationWeeks: 4,
    notes: 'Inject SubQ near the injury site for best results. Can also be taken orally for gut healing.',
    tags: ['beginner', 'injury', 'gut', 'tendon'],
    peptides: [
      { peptideName: 'BPC-157', doseMcg: 250, frequencyDays: 1, route: 'SubQ', vialMg: 5, waterMl: 2, syringeType: 'U100' },
    ],
  },
  {
    id: 'performance-recovery',
    name: 'Performance Recovery Stack',
    description: 'Post-training joint and tissue recovery. BPC-157 for healing + GHK-Cu for connective tissue remodeling.',
    category: 'performance',
    icon: 'fitness-outline',
    durationWeeks: 8,
    notes: 'Best used during intense training blocks or post-injury rehab.',
    tags: ['training', 'joint', 'recovery', 'connective tissue'],
    peptides: [
      { peptideName: 'BPC-157', doseMcg: 500, frequencyDays: 1, route: 'SubQ' },
      { peptideName: 'GHK-Cu', doseMcg: 1000, frequencyDays: 1, route: 'SubQ' },
    ],
  },

  // ── Weight Loss ──
  {
    id: 'semaglutide-titration',
    name: 'Semaglutide Titration',
    description: 'Standard GLP-1 weight loss protocol. Starts low and escalates over 16 weeks to minimize side effects.',
    category: 'weight_loss',
    icon: 'trending-down-outline',
    durationWeeks: 16,
    notes: 'Start at 0.25mg weekly. Increase to 0.5mg at week 5, 1.0mg at week 9, 1.7mg at week 13, 2.4mg at week 17. Adjust based on tolerance.',
    tags: ['glp-1', 'weight', 'fat loss', 'ozempic', 'wegovy'],
    peptides: [
      { peptideName: 'Semaglutide', doseMcg: 250, frequencyDays: 7, route: 'SubQ', vialMg: 5, waterMl: 1.5, syringeType: 'U100', notes: 'Start at 0.25mg. Titrate up every 4 weeks.' },
    ],
  },
  {
    id: 'tirzepatide-titration',
    name: 'Tirzepatide Titration',
    description: 'Dual GIP/GLP-1 protocol for significant weight loss. 15-22% body weight reduction in clinical trials.',
    category: 'weight_loss',
    icon: 'trending-down-outline',
    durationWeeks: 20,
    notes: 'Start 2.5mg weekly. Increase by 2.5mg every 4 weeks. Max 15mg. GI side effects most common at each dose increase.',
    tags: ['glp-1', 'gip', 'weight', 'mounjaro', 'fat loss'],
    peptides: [
      { peptideName: 'Tirzepatide', doseMcg: 2500, frequencyDays: 7, route: 'SubQ', vialMg: 10, waterMl: 2, syringeType: 'U100', notes: 'Start 2.5mg. Escalate 2.5mg every 4 weeks to max 15mg.' },
    ],
  },
  {
    id: 'fat-loss-stack',
    name: 'AOD + 5-Amino Fat Loss Stack',
    description: 'Non-GLP-1 fat loss approach. AOD 9604 targets fat cells directly while 5-Amino-1MQ boosts NAD+ and fat metabolism.',
    category: 'weight_loss',
    icon: 'flame-outline',
    durationWeeks: 12,
    notes: 'AOD 9604 on empty stomach in the morning. 5-Amino-1MQ with breakfast.',
    tags: ['fat loss', 'non-glp1', 'metabolic'],
    peptides: [
      { peptideName: 'AOD 9604', doseMcg: 300, frequencyDays: 1, route: 'SubQ', notes: 'Morning, fasted, abdominal injection' },
      { peptideName: '5-Amino-1MQ', doseMcg: 100000, frequencyDays: 1, route: 'Oral', notes: '100mg daily with breakfast' },
    ],
  },

  // ── Growth Hormone ──
  {
    id: 'gh-stack',
    name: 'GH Secretagogue Stack',
    description: 'CJC-1295 (no DAC) + Ipamorelin: the gold standard GH stack. Synergistic GHRH + GHRP pairing for clean GH pulses.',
    category: 'growth_hormone',
    icon: 'arrow-up-outline',
    durationWeeks: 12,
    notes: 'Inject on empty stomach, ideally at bedtime. Do not eat for 30 minutes after. Both in same injection is fine.',
    tags: ['gh', 'growth hormone', 'anti-aging', 'recovery', 'sleep'],
    peptides: [
      { peptideName: 'CJC-1295 (no DAC)', doseMcg: 100, frequencyDays: 1, route: 'SubQ', vialMg: 2, waterMl: 2, syringeType: 'U100', notes: 'Evening dose on empty stomach' },
      { peptideName: 'Ipamorelin', doseMcg: 200, frequencyDays: 1, route: 'SubQ', vialMg: 5, waterMl: 2, syringeType: 'U100', notes: 'Same time as CJC, can combine in syringe' },
    ],
  },
  {
    id: 'gh-beginner',
    name: 'GH Beginner (Ipamorelin)',
    description: 'Gentle intro to GH peptides. Ipamorelin is the most selective — no cortisol or prolactin spikes. Well-tolerated.',
    category: 'growth_hormone',
    icon: 'arrow-up-outline',
    durationWeeks: 8,
    notes: 'Take at bedtime on empty stomach. Start with 1x daily, can increase to 2-3x after 2 weeks.',
    tags: ['beginner', 'gh', 'sleep', 'recovery'],
    peptides: [
      { peptideName: 'Ipamorelin', doseMcg: 200, frequencyDays: 1, route: 'SubQ', vialMg: 5, waterMl: 2, syringeType: 'U100' },
    ],
  },

  // ── Cognitive ──
  {
    id: 'cognitive-stack',
    name: 'Cognitive Enhancement Stack',
    description: 'Semax for BDNF + Selank for GABA/serotonin balance. Covers focus, memory, and anxiety reduction.',
    category: 'cognitive',
    icon: 'brain-outline',
    durationWeeks: 4,
    notes: 'Both administered as nasal spray. Morning dosing. 4 weeks on, 2 weeks off cycling.',
    tags: ['focus', 'memory', 'anxiety', 'nootropic', 'brain'],
    peptides: [
      { peptideName: 'Semax', doseMcg: 600, frequencyDays: 1, route: 'Nasal', notes: 'Morning dose, 2-3 sprays per nostril' },
      { peptideName: 'Selank', doseMcg: 500, frequencyDays: 1, route: 'Nasal', notes: 'Morning dose, can combine with Semax' },
    ],
  },
  {
    id: 'cognitive-solo',
    name: 'Semax Focus Protocol',
    description: 'Single nootropic peptide for cognitive enhancement. Increases BDNF for learning and memory.',
    category: 'cognitive',
    icon: 'brain-outline',
    durationWeeks: 4,
    notes: 'Nasal spray, morning administration. 4 weeks on, 1-2 weeks off.',
    tags: ['focus', 'bdnf', 'nootropic'],
    peptides: [
      { peptideName: 'Semax', doseMcg: 400, frequencyDays: 1, route: 'Nasal' },
    ],
  },

  // ── Longevity ──
  {
    id: 'longevity-stack',
    name: 'Longevity Stack',
    description: 'Epitalon for telomerase activation + MOTS-c for mitochondrial optimization. Addresses two key aging pathways.',
    category: 'longevity',
    icon: 'hourglass-outline',
    durationWeeks: 3,
    notes: 'Epitalon: 20-day course, 1-2x per year. MOTS-c: 4-12 week cycles. Evening dosing for Epitalon.',
    tags: ['anti-aging', 'telomere', 'mitochondria'],
    peptides: [
      { peptideName: 'Epitalon', doseMcg: 5000, frequencyDays: 1, route: 'SubQ', notes: '20-day course. Repeat every 4-6 months.' },
      { peptideName: 'MOTS-c', doseMcg: 5000, frequencyDays: 2.33, route: 'SubQ', notes: '3x/week for 4-12 weeks' },
    ],
  },

  // ── Immune ──
  {
    id: 'immune-support',
    name: 'Immune Support Protocol',
    description: 'Thymosin Alpha-1 for T-cell and immune system support. Used for chronic infections, post-illness recovery, and immune modulation.',
    category: 'immune',
    icon: 'shield-checkmark-outline',
    durationWeeks: 12,
    notes: 'SubQ in abdomen. 2x weekly (e.g. Monday/Thursday). Generally well-tolerated.',
    tags: ['immune', 'recovery', 'infection', 't-cell'],
    peptides: [
      { peptideName: 'Thymosin Alpha-1', doseMcg: 1600, frequencyDays: 3.5, route: 'SubQ' },
    ],
  },

  // ── Sleep ──
  {
    id: 'sleep-optimization',
    name: 'Sleep Optimization',
    description: 'DSIP for deep, restorative sleep. Modulates GABA, dopamine, and serotonin pathways to improve sleep architecture.',
    category: 'cognitive',
    icon: 'moon-outline',
    durationWeeks: 4,
    notes: '30-60 minutes before bed. Start at lower dose (100mcg) and increase if needed. 4 weeks on, 1-2 weeks off.',
    tags: ['sleep', 'recovery', 'dsip'],
    peptides: [
      { peptideName: 'DSIP', doseMcg: 200, frequencyDays: 1, route: 'SubQ', notes: '30-60 min before bed' },
    ],
  },

  // ── Sexual Health ──
  {
    id: 'pt141-protocol',
    name: 'PT-141 As-Needed',
    description: 'Melanocortin agonist for sexual function. Works through central nervous system (brain), not vascular like PDE5 inhibitors.',
    category: 'sexual_health',
    icon: 'heart-outline',
    durationWeeks: 0,
    notes: '1.75mg SubQ 45 minutes before activity. Max 8 doses per month. Peak effects at 2-3 hours. Nausea is common (~40%).',
    tags: ['sexual function', 'libido', 'as-needed'],
    peptides: [
      { peptideName: 'PT-141 (Bremelanotide)', doseMcg: 1750, frequencyDays: 7, route: 'SubQ', notes: 'As-needed. Max 8x/month.' },
    ],
  },
];

export function getTemplatesByCategory(): { title: string; icon: string; data: ProtocolTemplate[] }[] {
  const grouped = new Map<TemplateCategory, ProtocolTemplate[]>();
  for (const t of PROTOCOL_TEMPLATES) {
    const existing = grouped.get(t.category) ?? [];
    existing.push(t);
    grouped.set(t.category, existing);
  }
  return Array.from(grouped.entries()).map(([cat, templates]) => ({
    title: CATEGORY_INFO[cat].label,
    icon: CATEGORY_INFO[cat].icon,
    data: templates,
  }));
}
