import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('peptidecalc.db');
  await initializeDatabase(db);
  return db;
}

const SCHEMA_VERSION = 3;

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  const versionResult = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionResult?.user_version ?? 0;

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS peptides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      typical_dose_mcg_low REAL,
      typical_dose_mcg_high REAL,
      half_life_hours REAL,
      frequency TEXT,
      route TEXT DEFAULT 'SubQ',
      storage_info TEXT,
      description TEXT,
      cycle_info TEXT,
      side_effects TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS protocols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      peptide_id INTEGER,
      peptide_name TEXT NOT NULL,
      dose_mcg REAL NOT NULL,
      frequency_days REAL NOT NULL,
      vial_mg REAL,
      water_ml REAL,
      syringe_type TEXT DEFAULT 'U100',
      route TEXT DEFAULT 'SubQ',
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (peptide_id) REFERENCES peptides(id)
    );

    CREATE TABLE IF NOT EXISTS dose_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocol_id INTEGER NOT NULL,
      dose_mcg REAL NOT NULL,
      injection_site TEXT,
      notes TEXT,
      side_effects TEXT,
      logged_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS injection_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key TEXT NOT NULL,
      last_used TEXT,
      use_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocol_id INTEGER NOT NULL,
      notification_id TEXT,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peptide_name TEXT NOT NULL,
      peptide_id INTEGER,
      vial_mg REAL NOT NULL,
      mg_remaining REAL NOT NULL,
      bac_water_ml REAL,
      reconstitution_date TEXT,
      expiration_date TEXT,
      source TEXT,
      lot_number TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      protocol_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (peptide_id) REFERENCES peptides(id),
      FOREIGN KEY (protocol_id) REFERENCES protocols(id)
    );
  `);

  // Seed injection sites if empty
  const siteCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM injection_sites'
  );
  if (siteCount && siteCount.count === 0) {
    const sites = [
      'abdomen_left', 'abdomen_right',
      'thigh_left', 'thigh_right',
      'deltoid_left', 'deltoid_right',
      'glute_left', 'glute_right',
    ];
    for (const site of sites) {
      await database.runAsync(
        'INSERT INTO injection_sites (site_key) VALUES (?)',
        site
      );
    }
  }

  // Migrations
  if (currentVersion < 2) {
    try {
      await database.execAsync('ALTER TABLE peptides ADD COLUMN cycle_info TEXT');
      await database.execAsync('ALTER TABLE peptides ADD COLUMN side_effects TEXT');
    } catch { /* columns may already exist */ }
  }
  if (currentVersion < 3) {
    try {
      await database.execAsync('ALTER TABLE dose_logs ADD COLUMN inventory_id INTEGER REFERENCES inventory(id)');
    } catch { /* column may already exist */ }
  }

  // Re-seed peptides on any schema upgrade
  if (currentVersion < SCHEMA_VERSION) {
    await database.execAsync('DELETE FROM peptides');
    await seedPeptides(database);
    await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

async function seedPeptides(database: SQLite.SQLiteDatabase): Promise<void> {
  // [name, category, dose_low_mcg, dose_high_mcg, half_life_hours, frequency, route, storage, description, cycle_info, side_effects]
  const peptides: (string | number | null)[][] = [
    // ── GLP-1 / Weight Management ──
    ['Semaglutide', 'GLP-1', 250, 2400, 168, 'Weekly', 'SubQ',
      'Refrigerate 2-8°C unopened; room temp up to 56 days in use',
      'GLP-1 receptor agonist. Escalate 0.25→0.5→1.0→1.7→2.4 mg weekly over 16 weeks for weight management',
      '16-week escalation; continuous use', 'Nausea, vomiting, diarrhea, constipation; rare pancreatitis'],
    ['Tirzepatide', 'GLP-1', 2500, 15000, 120, 'Weekly', 'SubQ',
      'Refrigerate 2-8°C; room temp up to 21 days in use',
      'Dual GIP/GLP-1 receptor agonist. Escalate 2.5 mg by 2.5 mg every 4 weeks, max 15 mg weekly. 15-22% body weight loss',
      '4-week escalation steps; continuous use', 'Nausea, vomiting, diarrhea'],
    ['Retatrutide', 'GLP-1', 500, 12000, 168, 'Weekly', 'SubQ',
      'Refrigerate 2-8°C; room temp up to 21 days',
      'Triple agonist: GIP + GLP-1 + glucagon receptors. Escalate 0.5→1→2→4→8→12 mg. 17-24% body weight loss',
      'Gradual escalation; continuous use', 'Nausea (50-70%), vomiting, diarrhea'],
    ['Liraglutide', 'GLP-1', 600, 3000, 13, 'Daily', 'SubQ',
      'Refrigerate 2-8°C unopened; room temp <30°C for 30 days opened',
      'GLP-1 agonist. Weight: escalate 0.6 mg by 0.6 mg weekly to 3.0 mg daily. Diabetes: 0.6→1.2→1.8 mg daily',
      'Weekly escalation steps; continuous use', 'Nausea (up to 40%), vomiting, diarrhea'],
    ['Cagrilintide', 'GLP-1', 600, 2400, 168, 'Weekly', 'SubQ',
      'Refrigerate 2-8°C; room temp up to 21 days',
      'Amylin/calcitonin receptor agonist. Start 0.6 mg weekly, escalate to 1.2-2.4 mg',
      'Escalation protocol; continuous use', 'GI nausea/vomiting, injection site reactions'],
    ['CagriSema', 'GLP-1', null, null, 168, 'Weekly', 'SubQ',
      'Refrigerate 2-8°C; room temp up to 28 days in use',
      'Combination: Cagrilintide + Semaglutide dual amylin/GLP-1 agonist. Significant results at 12-16 weeks',
      'Dose escalation protocol; continuous use', 'Combined GI side effects of both components'],

    // ── Healing / Recovery ──
    ['BPC-157', 'Healing', 200, 1400, 4, 'Daily', 'SubQ/IM/Oral',
      'Freeze -20°C lyophilized; 2-8°C reconstituted up to 30 days',
      'Body Protection Compound. 10-20 mcg/kg/day. Modulates VEGF, NO pathway, collagen synthesis, angiogenesis. Gastric juice-derived',
      '4-8 weeks on, then break', 'Very few; mild injection site reactions, nausea if oral'],
    ['TB-500', 'Healing', 2000, 10000, 72, '2x/week', 'SubQ',
      'Freeze -20°C lyophilized (2-3 years); 2-8°C reconstituted 30 days',
      'Thymosin Beta-4 fragment. Acute: 5-10 mg/week ×4-6 weeks, then 2-5 mg maintenance. Actin regulation, angiogenesis, stem cell mobilization',
      '4-6 weeks loading, then maintenance; break between cycles', 'Mild; headache, nausea, lightheadedness'],
    ['GHK-Cu', 'Healing', 200, 5000, 0.5, 'Daily', 'SubQ/IM/Topical',
      'Refrigerate 2-8°C. Light-sensitive',
      'Copper peptide. Topical 0.05-2%; Injectable 1-5 mg daily. Modulates 4000+ genes. Stimulates collagen, elastin, VEGF',
      '8-12 weeks cosmetic; ongoing topical', 'Contraindicated in Wilson\'s disease'],
    ['KPV', 'Healing', 200, 500, 2, 'Daily', 'SubQ/Oral',
      'Refrigerate 2-8°C',
      'Anti-inflammatory tripeptide derived from alpha-MSH. Modulates NF-kB pathway',
      '4-8 weeks on, then break', 'Minimal reported side effects'],

    // ── Growth Hormone Secretagogues ──
    ['CJC-1295 (no DAC)', 'Growth Hormone', 100, 200, 0.5, '1-3x daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 2-4 weeks',
      'Modified GRF 1-29. 100-200 mcg per dose on empty stomach. Short-acting GHRH analog',
      '8-12 weeks on, 4-6 weeks off', 'Injection site reactions, headaches, dizziness'],
    ['CJC-1295 (with DAC)', 'Growth Hormone', 500, 2000, 168, 'Weekly', 'SubQ',
      'Refrigerate 2-8°C; reconstituted stable 30 days',
      'Drug Affinity Complex extends half-life to ~1 week. 1-2 mg/week (start 0.5-1 mg). Sustained GH elevation',
      '12-16 weeks on, 4-6 weeks off', 'Water retention, joint stiffness, numbness/tingling'],
    ['Ipamorelin', 'Growth Hormone', 200, 300, 2, '1-3x daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 30-60 days',
      'Selective GH secretagogue. Does not raise cortisol or prolactin. Take on empty stomach, best at bedtime',
      '8-12 weeks on, rest period', 'Mild and well-tolerated; appetite increase, headache'],
    ['Sermorelin', 'Growth Hormone', 200, 500, 0.2, 'Daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 30 days',
      'GHRH analog. 0.2-0.5 mg/day, inject at bedtime. Fewer sides than exogenous HGH',
      '3-6 months continuous, then break', 'Injection site reactions, headaches, flushing'],
    ['Tesamorelin', 'Growth Hormone', 2000, 2000, 0.43, 'Daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted use within 14 days',
      'FDA-approved GHRH analog. 2 mg/day in abdomen. Approved for HIV-associated lipodystrophy. Results in 3-6 months',
      'Continuous use under medical supervision', 'Injection site reactions, edema, arthralgia, carpal tunnel, hyperglycemia'],
    ['GHRP-6', 'Growth Hormone', 100, 300, 0.33, '1-3x daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 2-4 weeks',
      'Growth hormone releasing peptide. Take on empty stomach. Strong appetite stimulation 20-30 min post-injection',
      '8-12 weeks on, 4-6 weeks off', 'Strong appetite increase, water retention, joint discomfort'],
    ['GHRP-2', 'Growth Hormone', 100, 300, 0.25, '2-3x daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 2-4 weeks',
      'Growth hormone releasing peptide. Less appetite stimulation than GHRP-6. Take on empty stomach',
      '8-12 weeks on, 4-6 weeks off', 'Appetite increase, water retention, cortisol elevation'],
    ['Hexarelin', 'Growth Hormone', 100, 300, 1.1, '2-3x daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 7-14 days',
      'GH secretagogue. Less desensitization than other GHRPs. Potent GH release',
      '8-12 weeks on, 4-6 weeks off', 'Fluid retention, appetite increase, joint discomfort, cortisol changes'],
    ['MK-677 (Ibutamoren)', 'Growth Hormone', 10000, 25000, 24, 'Daily', 'Oral',
      'Room temperature, cool and dry',
      'Non-peptide oral GH secretagogue. Ghrelin mimetic. 10-25 mg daily. Sustained IGF-1 elevation',
      '8-12 weeks on, 4-6 weeks off', 'Appetite increase, water retention, lethargy, insulin resistance'],
    ['IGF-1 LR3', 'Growth Hormone', 20, 100, 24, 'Daily', 'SubQ/IM',
      'Refrigerate 2-8°C (2-3 years); reconstituted 30-45 days',
      'Long-acting IGF-1 analog. Half-life 20-30 hours vs 10-20 min for native. Potent muscle growth factor',
      '4-6 weeks on, then break', 'Hypoglycemia (most significant), joint pain, headaches'],
    ['IGF-1 DES', 'Growth Hormone', 20, 100, 0.5, 'Daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 2-4 weeks',
      'Truncated IGF-1 variant. Reduced IGFBP binding = enhanced bioavailability. Very short-acting, often used post-workout',
      '4-8 weeks on, then break', 'Hypoglycemia, joint pain'],
    ['PEG-MGF', 'Growth Hormone', 200, 400, 48, '2-3x/week', 'SubQ/IM',
      'Freeze -20°C (2-3 years); reconstituted 4-6 weeks at 2-8°C',
      'PEGylated Mechano Growth Factor. Often used post-exercise. Activates PI3K/Akt pathway, satellite cell activation',
      '4-6 weeks on, then break', 'Fatigue, headaches, glucose fluctuations'],
    ['Follistatin 344', 'Growth Hormone', 100, 300, 8, 'Daily', 'SubQ/IM',
      'Refrigerate 2-8°C; reconstituted 30 days',
      'Myostatin inhibitor. Blocks activin and myostatin to promote muscle growth. 100-300 mcg/day',
      '4-12 weeks on, then rest', 'Injection site reactions, fatigue'],

    // ── Fat Loss ──
    ['AOD 9604', 'Fat Loss', 300, 1000, 1, 'Daily', 'SubQ',
      'Freeze -20°C; reconstituted 14-28 days at 2-8°C',
      'HGH fragment (last 15 AAs + tyrosine). Morning dose on empty stomach, abdominal injection. Does not affect glucose/insulin',
      '12-24 weeks continuous', 'Minimal; injection site reactions, headache'],
    ['HGH Fragment 176-191', 'Fat Loss', 250, 500, 1, 'Daily', 'SubQ',
      'Reconstituted with BAC water: 28 days; sterile water: 72 hours',
      'C-terminal fragment of HGH. Divide doses before meals/exercise. Targets fat without affecting blood sugar. No PCT needed',
      '12-16 weeks continuous', 'Fewer side effects than full HGH; injection site reactions'],
    ['5-Amino-1MQ', 'Fat Loss', 50000, 300000, 6, 'Daily', 'Oral',
      'Room temperature, cool and dry. 12-24 months stability',
      'NNMT inhibitor. Preserves NAD+ biosynthesis. May convert white-to-brown fat. 50-300 mg daily oral',
      '8-12 weeks on, 4-6 weeks off', 'Mild GI, sleep disruption'],
    ['Tesofensine', 'Fat Loss', 250, 1000, 220, 'Daily', 'Oral',
      'Room temperature',
      'Triple reuptake inhibitor (dopamine, NE, serotonin). Start 0.25 mg, target 0.5 mg. 10-15% body weight loss in 6 months',
      'Continuous under medical supervision', 'Dry mouth, constipation, insomnia, cardiovascular changes'],
    ['Adipotide (FTPP)', 'Fat Loss', null, null, null, 'Variable', 'SubQ',
      'Refrigerate 2-8°C',
      'Experimental. Targets blood vessels in adipose tissue via prohibitin binding. 0.25-1.0 mg/kg. Not approved for human use',
      '4-8 weeks (research only)', 'Kidney toxicity at high doses, dehydration. Experimental only'],
    ['Lipo-C / MIC+B12', 'Fat Loss', null, null, null, 'Weekly', 'IM',
      'Refrigerate 2-8°C',
      'Methionine + Inositol + Choline + B12 lipotropic blend. 1-2 mL IM weekly or bi-weekly. Supports liver fat metabolism',
      '8-12 weeks', 'Injection site reactions, fatigue'],

    // ── Cognitive / Neuropeptides ──
    ['Semax', 'Cognitive', 200, 1000, 0.5, 'Daily', 'Nasal',
      'Refrigerate 2-8°C; reconstituted 30-60 days',
      'Neuropeptide. Increases BDNF. Nasal spray preferred. 200-1000 mcg daily for cognitive enhancement',
      '4-6 weeks on, 1-2 weeks off', 'Nasal irritation, headaches'],
    ['Selank', 'Cognitive', 250, 1000, 0.25, 'Daily', 'Nasal',
      'Refrigerate 2-8°C (2-3 years); reconstituted 30 days',
      'Anxiolytic neuropeptide. Modulates serotonin, dopamine, GABA. No dependency risk. Anxiety: 250-500 mcg; Cognitive: 500-1000 mcg',
      '4-6 weeks on, 1-2 weeks off', 'Nasal irritation, fatigue'],
    ['Dihexa', 'Cognitive', 100, 2000, 2, 'Daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 2-4 weeks',
      'Activates HGF/c-Met pathway, enhances BDNF. Angiotensin IV analog. 0.1-2 mg daily',
      '4-8 weeks on, 2-4 weeks off', 'Headaches, sleep disturbances'],
    ['P21', 'Cognitive', 1000, 10000, 48, 'Variable', 'SubQ',
      'Freeze -20°C; reconstituted 30 days at 2-8°C',
      'BDNF/NGF enhancer. Promotes dendritic spine formation. Effects persist 2-4 weeks post-dose. Onset: 24-48 hours',
      '4-8 weeks on, then break', 'Limited data; headaches reported'],
    ['Pinealon', 'Cognitive', 1000, 3000, null, 'Daily', 'SubQ/Oral',
      'Freeze -20°C; reconstituted 30 days',
      'Bioregulator peptide. SubQ 1-3 mg/day or oral 5-10 mg/day. Evening dosing. Influences gene expression and telomerase',
      '10-20 day courses, repeat every 3-6 months', 'Minimal reported side effects'],
    ['NSI-189', 'Cognitive', 40000, 80000, null, 'Daily', 'Oral',
      'Refrigerate 2-8°C',
      'Hippocampal neurogenesis promoter. 40-80 mg daily oral (start 20-40 mg). Potential 20% hippocampal volume increase',
      'Continuous; long-term safety data limited', 'Headaches, mild GI'],
    ['Cerebrolysin', 'Cognitive', null, null, null, 'Daily', 'IV',
      'Refrigerate 2-8°C (3 years). Ready-to-use solution. Must dilute in normal saline',
      'Contains neurotrophic factors (BDNF, NGF, GDNF). 10-50 mL/day IV infusion. Medical administration only',
      '10-20 day courses, repeated as needed', 'Must be administered IV under medical supervision'],

    // ── Immune ──
    ['Thymosin Alpha-1', 'Immune', 1600, 3200, 2, '2x/week', 'SubQ',
      'Refrigerate 2-8°C (2 years); reconstituted 30 days; room temp up to 72h',
      'Immune modulator. 1.6-3.2 mg SubQ 2x/week. Stimulates T-cells, dendritic cells, NK cells, IL-2, interferon-gamma',
      '3-6 months continuous', 'Injection site reactions; generally well-tolerated'],
    ['LL-37', 'Immune', 10, 100, null, 'Variable', 'SubQ/Topical',
      'Refrigerate 2-8°C; -20°C long-term',
      'Cathelicidin antimicrobial peptide. Disrupts microbial membranes; recruits immune cells; promotes angiogenesis. Topical 10-100 mcg/mL',
      'Variable; no standardized clinical protocol', 'Local irritation, inflammatory response'],

    // ── Longevity / Anti-Aging ──
    ['Epitalon', 'Longevity', 5000, 10000, 2, 'Daily', 'SubQ/IM',
      'Freeze -20°C; reconstituted 30 days at 2-8°C',
      'Tetrapeptide (Ala-Glu-Asp-Gly). Activates telomerase (up to 33% increase). 5-10 mg/day, evening injection',
      '10-20 days on, 4-6 months off (1-2x/year)', 'Minimal reported side effects'],
    ['MOTS-c', 'Longevity', 5000, 10000, 24, '2-3x/week', 'SubQ',
      'Freeze -20°C (2 years); reconstituted 2-4 weeks at 2-8°C',
      'Mitochondrial-derived peptide. Activates AMPK. 5-10 mg SubQ 2-3x/week. Enhances metabolic function',
      '4-12 weeks on, then break', 'Injection site reactions, fatigue, hypoglycemia risk'],
    ['Humanin', 'Longevity', 2000, 10000, null, '2-3x/week', 'SubQ',
      'Freeze -20°C lyophilized; reconstituted 30 days at 2-8°C',
      'Mitochondrial-derived peptide. Inhibits pro-apoptotic Bcl-2 proteins, activates PI3K/Akt. Morning administration',
      '4-12 weeks on, then break', 'Injection site reactions, fatigue, headaches'],
    ['NAD+ (NMN/NR)', 'Longevity', 250000, 1000000, 4, 'Daily', 'Oral/IV/SubQ',
      'Airtight container <25°C; refrigeration extends shelf life',
      'Nicotinamide adenine dinucleotide precursors. Oral NR 100-300 mg; NMN 250-1000 mg daily. 400+ enzymatic reactions, sirtuin activation, DNA repair',
      'Continuous daily supplementation', 'Generally well-tolerated; mild flushing at high doses'],
    ['SS-31 (Elamipretide)', 'Longevity', 250, 40000, 4, 'Daily', 'SubQ/IV',
      'Freeze -20°C; reconstituted at 2-8°C',
      'Binds cardiolipin in inner mitochondrial membrane. Investigational — no FDA approval. Clinical trials: 0.25-40 mg/kg IV',
      'Investigational; no established cycle', 'Investigational compound; limited safety data'],
    ['FOX04-DRI', 'Longevity', null, null, null, 'Intermittent', 'SubQ',
      'Freeze -20 to -80°C; reconstituted 2-8°C several days',
      'Senolytic peptide. Disrupts FOXO4-p53 interaction in senescent cells. Experimental. Not approved for human use',
      'Intermittent dosing (preclinical only)', 'Experimental — limited safety data'],
    ['Glutathione', 'Longevity', 250000, 1000000, 2, 'Daily', 'Oral/IV',
      'Cool and dry; liposomal needs refrigeration',
      'Master antioxidant tripeptide (cysteine+glutamic acid+glycine). Oral 250-1000 mg; Liposomal 100-500 mg; IV 600-2000 mg/session',
      'Continuous daily; IV sessions as needed', 'Mild GI; generally very well-tolerated'],

    // ── Sexual Health / Hormonal ──
    ['PT-141 (Bremelanotide)', 'Sexual Health', 1750, 1750, 2.7, 'As needed', 'SubQ',
      'Refrigerate 2-8°C (2-3 years); reconstituted 30 days',
      'Melanocortin MC4R/MC3R agonist. Central mechanism (brain, not vascular). 1.75 mg 45 min before activity. Max 8x/month. Peak effects 2-3 hours',
      'As needed; max 8 doses per month', 'Nausea (~40%), facial flushing'],
    ['Melanotan II', 'Sexual Health', 250, 500, 1, 'Daily', 'SubQ',
      'Freeze -20°C; reconstituted 30 days at 2-8°C',
      'Melanocortin agonist. Loading: 0.25-0.5 mg daily ×1-2 weeks; Maintenance: 0.25 mg every 2-3 days. Tanning + appetite suppression + sexual function',
      'Loading 1-2 weeks, then maintenance', 'Nausea, appetite suppression, facial flushing, mole darkening'],
    ['Kisspeptin-10', 'Sexual Health', 1000, 6400, 0.47, 'As needed', 'SubQ/IV',
      'Freeze -20°C (2 years); reconstituted 4-7 days at 2-8°C',
      'Activates GnRH neurons → LH/FSH release. Reproductive use: 6.4-12.8 nmol/kg 2x/day',
      'Variable; short reconstituted stability', 'Limited data; generally well-tolerated'],
    ['Oxytocin', 'Sexual Health', null, null, 0.05, 'As needed', 'Intranasal/IV',
      'Freeze -20°C; reconstituted use immediately. Sensitive to light/heat/pH',
      'Neurohormone. IV 1-2 milliunits/min (labor); Intranasal 12-40 IU (research). Effects persist hours despite 1-6 min IV half-life',
      'As needed; medical supervision for IV', 'Uterine hyperstimulation (IV); headache, nausea'],
    ['HCG', 'Sexual Health', null, null, 36, '2-3x/week', 'SubQ/IM',
      'Reconstituted 2-8°C, use within 30-60 days',
      'Human Chorionic Gonadotropin. Male TRT support: 500-2000 IU 2-3x/week. Female fertility: 5000-10000 IU trigger',
      'Ongoing with TRT; or as prescribed for fertility', 'Acne, gynecomastia, mood swings (male); OHSS risk (female)'],

    // ── Reproductive Medicine ──
    ['Cetrorelix', 'Reproductive', 250, 3000, 62, 'Daily/Single', 'SubQ',
      'Refrigerate 2-8°C; room temp up to 3 months',
      'GnRH antagonist for IVF. Single 3 mg dose or 0.25 mg daily protocol. Prevents premature ovulation',
      'IVF cycle use only', 'Injection site reactions, headache, nausea'],
    ['Degarelix', 'Reproductive', 80000, 240000, 53, 'Monthly', 'SubQ',
      'Refrigerate 2-8°C; reconstitute with sterile water, use immediately',
      'GnRH antagonist. Loading: 240 mg (2×120 mg); Maintenance: 80 mg every 28 days. Testosterone to castrate levels within 24-72h',
      'Continuous monthly dosing', 'Injection site pain (33%), hot flashes, weight gain, bone density loss'],

    // ── Sleep ──
    ['DSIP', 'Sleep', 50, 300, null, 'Daily', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 30-90 days',
      'Delta Sleep Inducing Peptide. 100-300 mcg (some need 50-100 mcg) SubQ 30-60 min before bed. Modulates GABA, dopamine, serotonin',
      '4-6 weeks on, 1-2 weeks off', 'Minimal; occasional morning grogginess'],

    // ── Skin / Cosmetic ──
    ['SNAP-8', 'Skin', null, null, null, '2x daily', 'Topical',
      'Store 15-25°C. Shelf life 12-24 months unopened',
      'Acetyl Octapeptide-3. Topical only at 0.5-10% concentration. Inhibits SNARE complex → reduces muscle contraction → reduces wrinkles',
      'Continuous topical use; results at 4-6 weeks, optimal 8-12', 'Minimal; mild skin irritation possible'],

    // ── Neuroprotection ──
    ['ARA-290', 'Immune', 2000, 4000, null, '3x/week', 'SubQ',
      'Refrigerate 2-8°C; reconstituted 7-14 days',
      'Innate repair receptor agonist via JAK2/STAT5. 2-4 mg SubQ; neuropathic pain: 2 mg 3x/week. No polycythemia risk (unlike EPO)',
      '4-12 weeks', 'Injection site reactions, headache, fatigue'],

    // ── Hair Loss ──
    ['RU-58841', 'Hair', null, null, null, 'Daily', 'Topical',
      'Refrigerate 2-8°C in amber containers (6-12 months)',
      'Non-steroidal androgen receptor blocker. Topical only: 1-2 mL of 5% solution daily (evening). Local DHT blocking',
      'Continuous daily; results at 3-6 months', 'Local irritation; systemic effects if absorbed'],

    // ── SARMs / Performance ──
    ['YK-11', 'Performance', 5000, 15000, 8, '2x daily', 'Oral',
      'Room temp short-term; 2-8°C long-term (2-3 years)',
      'Partial androgen receptor agonist + myostatin inhibitor. 5-15 mg/day split 2x daily. Requires PCT',
      '6-8 weeks on; PCT required', 'Testosterone suppression, liver stress, hair loss'],
    ['S23', 'Performance', 10000, 30000, 12, '2-3x daily', 'Oral',
      'Cool and dry, 2-3 years stability',
      'Most potent SARM. 10-30 mg/day oral split 2-3x. Pronounced suppression — PCT mandatory',
      '8-12 weeks on; PCT required', 'Testosterone suppression, hair loss, sleep issues, liver enzyme elevation'],
    ['SLU-PP-332', 'Performance', 250, 500, 6, 'Daily', 'Oral',
      'Room temperature',
      'Exercise mimetic ERR agonist. Activates exercise-related gene pathways without physical activity',
      'Investigational; no established cycle', 'Limited safety data'],

    // ── Metabolic ──
    ['Octreotide', 'Metabolic', 50, 500, 1.5, '2-3x daily', 'SubQ',
      'Refrigerate 2-8°C; room temp up to 14 days',
      'Somatostatin analog. Short-acting: 50-500 mcg SubQ 2-3x daily; LAR (long-acting): 10-30 mg IM monthly. Medical use',
      'Continuous under medical supervision', 'Gallstone risk 15-30% chronic use; GI, injection site reactions'],

    // ── Nootropics (non-peptide) ──
    ['Methylene Blue', 'Cognitive', 500, 4000, 6, 'Daily', 'Oral',
      'Refrigerate 2-8°C in dark containers',
      'Cognitive dose: 0.5-4 mg/kg oral. MAO inhibitor — serotonin syndrome risk with SSRIs. Per-kg dosing. Causes blue/green urine',
      'Intermittent or continuous low-dose', 'Blue/green urine, GI upset; DANGEROUS with SSRIs/serotonergic drugs'],
    ['Phenylpiracetam', 'Cognitive', 50000, 200000, 4, 'Daily', 'Oral',
      'Room temperature, cool and dry',
      'Modulates acetylcholine, dopamine, GABA, AMPA receptors. 50-200 mg daily oral. Duration of action: 4-6 hours',
      'Cycle to prevent tolerance; take early in day', 'Headaches, sleep disturbance if taken late'],
  ];

  for (const p of peptides) {
    await database.runAsync(
      `INSERT INTO peptides (name, category, typical_dose_mcg_low, typical_dose_mcg_high, half_life_hours, frequency, route, storage_info, description, cycle_info, side_effects)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...p
    );
  }
}

// ---- Query helpers ----

export interface Peptide {
  id: number;
  name: string;
  category: string;
  typical_dose_mcg_low: number | null;
  typical_dose_mcg_high: number | null;
  half_life_hours: number | null;
  frequency: string | null;
  route: string | null;
  storage_info: string | null;
  description: string | null;
  cycle_info: string | null;
  side_effects: string | null;
}

export interface Protocol {
  id: number;
  name: string;
  peptide_id: number | null;
  peptide_name: string;
  dose_mcg: number;
  frequency_days: number;
  vial_mg: number | null;
  water_ml: number | null;
  syringe_type: string;
  route: string;
  notes: string | null;
  is_active: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoseLog {
  id: number;
  protocol_id: number;
  dose_mcg: number;
  injection_site: string | null;
  notes: string | null;
  side_effects: string | null;
  logged_at: string;
  inventory_id: number | null;
}

export interface InventoryItem {
  id: number;
  peptide_name: string;
  peptide_id: number | null;
  vial_mg: number;
  mg_remaining: number;
  bac_water_ml: number | null;
  reconstitution_date: string | null;
  expiration_date: string | null;
  source: string | null;
  lot_number: string | null;
  notes: string | null;
  status: string;
  protocol_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface InjectionSite {
  id: number;
  site_key: string;
  last_used: string | null;
  use_count: number;
}

export async function getAllPeptides(): Promise<Peptide[]> {
  const db = await getDatabase();
  return db.getAllAsync<Peptide>('SELECT * FROM peptides ORDER BY category, name');
}

export async function searchPeptides(query: string): Promise<Peptide[]> {
  const db = await getDatabase();
  return db.getAllAsync<Peptide>(
    'SELECT * FROM peptides WHERE name LIKE ? OR category LIKE ? ORDER BY name',
    `%${query}%`, `%${query}%`
  );
}

export async function getPeptideById(id: number): Promise<Peptide | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Peptide>('SELECT * FROM peptides WHERE id = ?', id);
}

export async function getActiveProtocols(): Promise<Protocol[]> {
  const db = await getDatabase();
  return db.getAllAsync<Protocol>(
    'SELECT * FROM protocols WHERE is_active = 1 ORDER BY created_at DESC'
  );
}

export async function getAllProtocols(): Promise<Protocol[]> {
  const db = await getDatabase();
  return db.getAllAsync<Protocol>('SELECT * FROM protocols ORDER BY created_at DESC');
}

export async function getProtocolById(id: number): Promise<Protocol | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Protocol>('SELECT * FROM protocols WHERE id = ?', id);
}

export async function createProtocol(
  protocol: Omit<Protocol, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO protocols (name, peptide_id, peptide_name, dose_mcg, frequency_days, vial_mg, water_ml, syringe_type, route, notes, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    protocol.name,
    protocol.peptide_id,
    protocol.peptide_name,
    protocol.dose_mcg,
    protocol.frequency_days,
    protocol.vial_mg,
    protocol.water_ml,
    protocol.syringe_type,
    protocol.route,
    protocol.notes,
    protocol.start_date,
    protocol.end_date,
  );
  return result.lastInsertRowId;
}

export async function updateProtocol(id: number, updates: Partial<Protocol>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(
    `UPDATE protocols SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

export async function deleteProtocol(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM protocols WHERE id = ?', id);
}

export async function logDose(
  protocolId: number,
  doseMcg: number,
  injectionSite?: string,
  notes?: string,
  sideEffects?: string,
  inventoryId?: number,
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO dose_logs (protocol_id, dose_mcg, injection_site, notes, side_effects, inventory_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    protocolId, doseMcg, injectionSite ?? null, notes ?? null, sideEffects ?? null, inventoryId ?? null,
  );

  // Update injection site usage
  if (injectionSite) {
    await db.runAsync(
      `UPDATE injection_sites SET last_used = datetime('now'), use_count = use_count + 1
       WHERE site_key = ?`,
      injectionSite
    );
  }

  // Auto-deduct from inventory
  if (inventoryId) {
    await deductFromInventory(inventoryId, doseMcg / 1000);
  }

  return result.lastInsertRowId;
}

export async function getDoseLogsForProtocol(
  protocolId: number,
  limit: number = 50
): Promise<DoseLog[]> {
  const db = await getDatabase();
  return db.getAllAsync<DoseLog>(
    'SELECT * FROM dose_logs WHERE protocol_id = ? ORDER BY logged_at DESC LIMIT ?',
    protocolId, limit
  );
}

export async function getRecentDoseLogs(limit: number = 20): Promise<(DoseLog & { peptide_name: string })[]> {
  const db = await getDatabase();
  return db.getAllAsync<DoseLog & { peptide_name: string }>(
    `SELECT dl.*, p.peptide_name FROM dose_logs dl
     JOIN protocols p ON dl.protocol_id = p.id
     ORDER BY dl.logged_at DESC LIMIT ?`,
    limit
  );
}

export async function getInjectionSites(): Promise<InjectionSite[]> {
  const db = await getDatabase();
  return db.getAllAsync<InjectionSite>(
    'SELECT * FROM injection_sites ORDER BY site_key'
  );
}

export async function getTodaysDoseCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM dose_logs WHERE date(logged_at) = date('now')"
  );
  return result?.count ?? 0;
}

export async function getLastDoseForProtocol(protocolId: number): Promise<DoseLog | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DoseLog>(
    'SELECT * FROM dose_logs WHERE protocol_id = ? ORDER BY logged_at DESC LIMIT 1',
    protocolId
  );
}

// ---- Peptide lookup ----

export async function getPeptideByName(name: string): Promise<Peptide | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Peptide>('SELECT * FROM peptides WHERE name = ? LIMIT 1', name);
}

// ---- Inventory ----

export async function createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO inventory (peptide_name, peptide_id, vial_mg, mg_remaining, bac_water_ml, reconstitution_date, expiration_date, source, lot_number, notes, protocol_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.peptide_name, item.peptide_id, item.vial_mg, item.mg_remaining,
    item.bac_water_ml, item.reconstitution_date, item.expiration_date,
    item.source, item.lot_number, item.notes, item.protocol_id,
  );
  return result.lastInsertRowId;
}

export async function getActiveInventory(): Promise<InventoryItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryItem>(
    "SELECT * FROM inventory WHERE status = 'active' ORDER BY expiration_date ASC"
  );
}

export async function getInventoryForPeptide(peptideName: string): Promise<InventoryItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryItem>(
    "SELECT * FROM inventory WHERE peptide_name = ? AND status = 'active' ORDER BY reconstitution_date ASC",
    peptideName
  );
}

export async function getInventoryById(id: number): Promise<InventoryItem | null> {
  const db = await getDatabase();
  return db.getFirstAsync<InventoryItem>('SELECT * FROM inventory WHERE id = ?', id);
}

export async function updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await db.runAsync(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

async function deductFromInventory(id: number, doseMg: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE inventory SET mg_remaining = MAX(0, mg_remaining - ?), updated_at = datetime('now') WHERE id = ?`,
    doseMg, id
  );
  // Auto-mark empty
  await db.runAsync(
    "UPDATE inventory SET status = 'empty' WHERE id = ? AND mg_remaining <= 0",
    id
  );
}

export async function getExpiringSoonInventory(daysAhead: number = 7): Promise<InventoryItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryItem>(
    "SELECT * FROM inventory WHERE expiration_date <= date('now', '+' || ? || ' days') AND status = 'active' AND expiration_date IS NOT NULL ORDER BY expiration_date ASC",
    daysAhead
  );
}

export async function getLowStockInventory(thresholdPercent: number = 0.2): Promise<InventoryItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<InventoryItem>(
    "SELECT * FROM inventory WHERE (mg_remaining / vial_mg) <= ? AND status = 'active' ORDER BY (mg_remaining / vial_mg) ASC",
    thresholdPercent
  );
}

// ---- Analytics queries ----

export async function getDoseLogsByDateRange(
  startDate: string, endDate: string
): Promise<(DoseLog & { peptide_name: string })[]> {
  const db = await getDatabase();
  return db.getAllAsync<DoseLog & { peptide_name: string }>(
    `SELECT dl.*, p.peptide_name FROM dose_logs dl
     JOIN protocols p ON dl.protocol_id = p.id
     WHERE dl.logged_at >= ? AND dl.logged_at <= ?
     ORDER BY dl.logged_at DESC`,
    startDate, endDate
  );
}

export async function getDoseCountByDay(
  startDate: string, endDate: string
): Promise<{ date: string; count: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync<{ date: string; count: number }>(
    `SELECT date(logged_at) as date, COUNT(*) as count FROM dose_logs
     WHERE logged_at >= ? AND logged_at <= ?
     GROUP BY date(logged_at) ORDER BY date ASC`,
    startDate, endDate
  );
}

export async function getProtocolDoseSummary(protocolId: number): Promise<{
  total_doses: number;
  first_dose: string | null;
  last_dose: string | null;
}> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    total_doses: number;
    first_dose: string | null;
    last_dose: string | null;
  }>(
    `SELECT COUNT(*) as total_doses, MIN(logged_at) as first_dose, MAX(logged_at) as last_dose
     FROM dose_logs WHERE protocol_id = ?`,
    protocolId
  );
  return result ?? { total_doses: 0, first_dose: null, last_dose: null };
}

// ---- Reminders ----

export interface Reminder {
  id: number;
  protocol_id: number;
  notification_id: string | null;
  hour: number;
  minute: number;
  is_enabled: number;
}

export async function getRemindersForProtocol(protocolId: number): Promise<Reminder[]> {
  const db = await getDatabase();
  return db.getAllAsync<Reminder>(
    'SELECT * FROM reminders WHERE protocol_id = ? ORDER BY hour, minute',
    protocolId
  );
}

export async function getAllEnabledReminders(): Promise<(Reminder & { peptide_name: string; protocol_name: string })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Reminder & { peptide_name: string; protocol_name: string }>(
    `SELECT r.*, p.peptide_name, p.name as protocol_name
     FROM reminders r JOIN protocols p ON r.protocol_id = p.id
     WHERE r.is_enabled = 1 AND p.is_active = 1
     ORDER BY r.hour, r.minute`
  );
}

export async function createReminder(protocolId: number, hour: number, minute: number, notificationId: string | null): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO reminders (protocol_id, hour, minute, notification_id) VALUES (?, ?, ?, ?)',
    protocolId, hour, minute, notificationId
  );
  return result.lastInsertRowId;
}

export async function updateReminder(id: number, updates: Partial<Reminder>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  values.push(id);
  await db.runAsync(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function deleteReminder(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}
