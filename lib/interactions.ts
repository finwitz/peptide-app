export type InteractionSeverity = 'contraindicated' | 'major' | 'moderate' | 'minor' | 'timing';

export interface PeptideInteraction {
  peptideA: string;
  peptideB: string;
  severity: InteractionSeverity;
  category: string;
  description: string;
  recommendation: string;
}

export const INTERACTIONS: PeptideInteraction[] = [
  // ── GLP-1 Overlaps ──
  {
    peptideA: 'Semaglutide', peptideB: 'Tirzepatide',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'Both target GLP-1 receptors. Combining causes compounding GI side effects and unpredictable glycemic control.',
    recommendation: 'Use only one GLP-1 agonist at a time.',
  },
  {
    peptideA: 'Semaglutide', peptideB: 'Liraglutide',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'Same mechanism of action (GLP-1 agonism). No clinical benefit to combining.',
    recommendation: 'Choose one GLP-1 agonist. Semaglutide is once-weekly; Liraglutide is daily.',
  },
  {
    peptideA: 'Semaglutide', peptideB: 'Retatrutide',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'Retatrutide is a triple agonist that already covers GLP-1. Adding Semaglutide doubles the GLP-1 stimulation.',
    recommendation: 'Use Retatrutide alone — it already includes GLP-1 activity.',
  },
  {
    peptideA: 'Tirzepatide', peptideB: 'Retatrutide',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'Both cover GLP-1 and GIP pathways. Overlapping mechanisms with compounding side effects.',
    recommendation: 'Use only one. Retatrutide adds glucagon receptor activity.',
  },
  {
    peptideA: 'Tirzepatide', peptideB: 'Liraglutide',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'Tirzepatide already has GLP-1 activity. Adding Liraglutide doubles the effect.',
    recommendation: 'Use only one GLP-1 agonist.',
  },
  {
    peptideA: 'Liraglutide', peptideB: 'Retatrutide',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'Retatrutide includes GLP-1 agonism. Combining is redundant and risky.',
    recommendation: 'Use Retatrutide alone.',
  },
  {
    peptideA: 'Cagrilintide', peptideB: 'CagriSema',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'CagriSema already contains Cagrilintide. Adding more causes dose stacking.',
    recommendation: 'Use CagriSema alone — it includes both components.',
  },
  {
    peptideA: 'Semaglutide', peptideB: 'CagriSema',
    severity: 'contraindicated', category: 'receptor_overlap',
    description: 'CagriSema already contains Semaglutide.',
    recommendation: 'Use CagriSema alone.',
  },

  // ── Serotonergic Danger ──
  {
    peptideA: 'Methylene Blue', peptideB: 'Selank',
    severity: 'major', category: 'serotonergic',
    description: 'Methylene Blue is an MAO inhibitor. Selank modulates serotonin. Risk of serotonergic excess.',
    recommendation: 'Avoid combining. If using both, separate by at least 2 weeks.',
  },

  // ── GH Secretagogue Stacking ──
  {
    peptideA: 'CJC-1295 (with DAC)', peptideB: 'CJC-1295 (no DAC)',
    severity: 'major', category: 'receptor_saturation',
    description: 'Both target GHRH receptors. DAC version provides sustained release; adding no-DAC causes receptor saturation.',
    recommendation: 'Choose one: DAC version for weekly dosing, or no-DAC for pulsatile dosing.',
  },
  {
    peptideA: 'GHRP-6', peptideB: 'GHRP-2',
    severity: 'moderate', category: 'receptor_competition',
    description: 'Both are ghrelin mimetics competing for the same receptor. Minimal benefit to combining.',
    recommendation: 'Pick one GHRP. GHRP-6 for appetite stimulation, GHRP-2 for less appetite effect.',
  },
  {
    peptideA: 'GHRP-6', peptideB: 'Hexarelin',
    severity: 'moderate', category: 'receptor_competition',
    description: 'Both are GH secretagogue peptides targeting similar pathways.',
    recommendation: 'Use one GHRP at a time alongside a GHRH analog.',
  },
  {
    peptideA: 'GHRP-2', peptideB: 'Hexarelin',
    severity: 'moderate', category: 'receptor_competition',
    description: 'Both are GH secretagogue peptides. Combining offers diminishing returns.',
    recommendation: 'Choose one GHRP. Hexarelin has less desensitization.',
  },
  {
    peptideA: 'MK-677 (Ibutamoren)', peptideB: 'Ipamorelin',
    severity: 'moderate', category: 'gh_stacking',
    description: 'Both elevate GH. MK-677 is already a strong oral secretagogue. Adding Ipamorelin may cause excessive GH/IGF-1 elevation.',
    recommendation: 'Monitor IGF-1 levels if combining. Consider lower doses of each.',
  },
  {
    peptideA: 'MK-677 (Ibutamoren)', peptideB: 'Semaglutide',
    severity: 'moderate', category: 'metabolic_conflict',
    description: 'MK-677 raises insulin resistance and appetite. This directly counteracts Semaglutide\'s weight loss and insulin-sensitizing effects.',
    recommendation: 'Avoid combining for weight loss goals. If using both, monitor blood glucose closely.',
  },

  // ── IGF Pathway ──
  {
    peptideA: 'IGF-1 LR3', peptideB: 'IGF-1 DES',
    severity: 'major', category: 'pathway_overload',
    description: 'Both are potent IGF-1 analogs. Combining risks excessive IGF-1 signaling and hypoglycemia.',
    recommendation: 'Use one IGF-1 analog at a time. LR3 for sustained effect, DES for acute post-workout.',
  },

  // ── Hormonal Interference ──
  {
    peptideA: 'HCG', peptideB: 'Degarelix',
    severity: 'contraindicated', category: 'hormonal_opposition',
    description: 'HCG stimulates testosterone via LH mimicry. Degarelix is a GnRH antagonist designed to suppress testosterone.',
    recommendation: 'These have opposing mechanisms. Do not combine.',
  },
  {
    peptideA: 'Kisspeptin-10', peptideB: 'Degarelix',
    severity: 'contraindicated', category: 'hormonal_opposition',
    description: 'Kisspeptin stimulates GnRH release. Degarelix blocks GnRH receptors. Directly opposing.',
    recommendation: 'Do not combine — mechanisms cancel each other out.',
  },
  {
    peptideA: 'Kisspeptin-10', peptideB: 'Cetrorelix',
    severity: 'contraindicated', category: 'hormonal_opposition',
    description: 'Kisspeptin stimulates GnRH. Cetrorelix is a GnRH antagonist.',
    recommendation: 'Do not combine outside of supervised IVF protocols.',
  },

  // ── Androgen Suppression ──
  {
    peptideA: 'YK-11', peptideB: 'S23',
    severity: 'major', category: 'suppression_stacking',
    description: 'Both SARMs cause significant testosterone suppression. Combining compounds suppression dramatically.',
    recommendation: 'Do not stack. If using either, PCT is mandatory. Choose the one that fits your goals.',
  },

  // ── Fat Loss Redundancy ──
  {
    peptideA: 'AOD 9604', peptideB: 'HGH Fragment 176-191',
    severity: 'moderate', category: 'mechanism_overlap',
    description: 'AOD 9604 is a modified version of HGH Fragment 176-191. Nearly identical mechanism of action.',
    recommendation: 'Use one or the other, not both. AOD 9604 has more research backing.',
  },

  // ── Timing Interactions ──
  {
    peptideA: 'BPC-157', peptideB: 'TB-500',
    severity: 'timing', category: 'injection_timing',
    description: 'Synergistic healing compounds. Work well together but should be injected at separate sites or 30 minutes apart for optimal absorption.',
    recommendation: 'Inject at separate sites. Can use same time of day.',
  },
  {
    peptideA: 'DSIP', peptideB: 'Selank',
    severity: 'timing', category: 'timing_separation',
    description: 'Both modulate GABA pathways. DSIP is for sleep; Selank is for daytime anxiety/cognition.',
    recommendation: 'Use Selank in the morning, DSIP 30-60 minutes before bed.',
  },
  {
    peptideA: 'Semax', peptideB: 'Selank',
    severity: 'minor', category: 'synergistic',
    description: 'Both are neuropeptides with complementary mechanisms. Semax boosts BDNF; Selank modulates GABA/serotonin. Often stacked intentionally.',
    recommendation: 'Safe to combine. Use same schedule (morning/daytime nasal). Start with lower doses of each.',
  },

  // ── Cardiovascular ──
  {
    peptideA: 'Tesofensine', peptideB: 'Semaglutide',
    severity: 'moderate', category: 'cardiovascular',
    description: 'Tesofensine raises heart rate and blood pressure. Combined cardiovascular strain with GLP-1 GI effects.',
    recommendation: 'Use under medical supervision only. Monitor heart rate and blood pressure.',
  },
  {
    peptideA: 'Tesofensine', peptideB: 'Tirzepatide',
    severity: 'moderate', category: 'cardiovascular',
    description: 'Tesofensine raises heart rate. Adding another potent weight-loss agent increases cardiovascular strain.',
    recommendation: 'Medical supervision required. Monitor vitals closely.',
  },

  // ── Melanocortin ──
  {
    peptideA: 'PT-141 (Bremelanotide)', peptideB: 'Melanotan II',
    severity: 'moderate', category: 'receptor_overlap',
    description: 'Both activate melanocortin receptors (MC4R). Combining increases risk of nausea, blood pressure changes, and priapism.',
    recommendation: 'Use one at a time. Do not dose both on the same day.',
  },
];
