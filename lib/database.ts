import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('peptidecalc.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
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

  // Seed peptides if empty
  const peptideCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM peptides'
  );
  if (peptideCount && peptideCount.count === 0) {
    await seedPeptides(database);
  }
}

async function seedPeptides(database: SQLite.SQLiteDatabase): Promise<void> {
  const peptides = [
    // GLP-1 / Weight Loss
    ['Semaglutide', 'GLP-1', 250, 2000, 168, 'Weekly', 'SubQ', 'Refrigerate 2-8°C', 'GLP-1 receptor agonist for weight management'],
    ['Tirzepatide', 'GLP-1', 2500, 15000, 120, 'Weekly', 'SubQ', 'Refrigerate 2-8°C', 'Dual GIP/GLP-1 receptor agonist'],
    ['Retatrutide', 'GLP-1', 1000, 12000, 168, 'Weekly', 'SubQ', 'Refrigerate 2-8°C', 'Triple agonist (GLP-1/GIP/glucagon)'],
    ['Cagrilintide', 'GLP-1', 300, 4500, 168, 'Weekly', 'SubQ', 'Refrigerate 2-8°C', 'Amylin analogue for weight loss'],

    // Healing / Recovery
    ['BPC-157', 'Healing', 200, 500, 4, 'Daily', 'SubQ', 'Refrigerate. Stable 7-10 days reconstituted', 'Body Protection Compound for tissue repair'],
    ['TB-500', 'Healing', 2000, 5000, 72, '2x/week', 'SubQ', 'Refrigerate 2-8°C', 'Thymosin Beta-4 fragment for healing'],
    ['GHK-Cu', 'Healing', 200, 600, 0.5, 'Daily', 'SubQ', 'Refrigerate. Light-sensitive', 'Copper peptide for tissue remodeling'],
    ['KPV', 'Healing', 200, 500, 2, 'Daily', 'SubQ/Oral', 'Refrigerate 2-8°C', 'Anti-inflammatory tripeptide'],

    // Growth Hormone
    ['CJC-1295 (no DAC)', 'Growth Hormone', 100, 300, 0.5, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'GHRH analog for GH release'],
    ['Ipamorelin', 'Growth Hormone', 100, 300, 2, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Selective GH secretagogue'],
    ['Tesamorelin', 'Growth Hormone', 1000, 2000, 0.43, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'GHRH analog, FDA-approved for lipodystrophy'],
    ['MK-677 (Ibutamoren)', 'Growth Hormone', 10000, 25000, 24, 'Daily', 'Oral', 'Room temperature', 'Oral GH secretagogue'],
    ['Sermorelin', 'Growth Hormone', 100, 300, 0.2, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'GHRH analog for GH release'],
    ['Hexarelin', 'Growth Hormone', 100, 300, 1.1, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'GH secretagogue peptide'],
    ['GHRP-6', 'Growth Hormone', 100, 300, 0.33, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Growth hormone releasing peptide'],
    ['GHRP-2', 'Growth Hormone', 100, 300, 0.25, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Growth hormone releasing peptide'],
    ['IGF-1 LR3', 'Growth Hormone', 20, 100, 20, 'Daily', 'SubQ/IM', 'Refrigerate. Acetic acid reconstitution', 'Long-acting IGF-1 analog'],

    // Cognitive / Neuro
    ['Semax', 'Cognitive', 200, 600, 0.5, 'Daily', 'Nasal', 'Refrigerate 2-8°C', 'Neuropeptide for cognitive enhancement'],
    ['Selank', 'Cognitive', 200, 600, 0.25, 'Daily', 'Nasal', 'Refrigerate 2-8°C', 'Anxiolytic neuropeptide'],
    ['Dihexa', 'Cognitive', 10, 20, 2, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Angiotensin IV analog for cognition'],

    // Immune / Longevity
    ['Thymosin Alpha 1', 'Immune', 900, 1600, 2, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Immune modulator peptide'],
    ['MOTS-c', 'Longevity', 5000, 10000, 24, '3x/week', 'SubQ', 'Refrigerate 2-8°C', 'Mitochondrial-derived peptide'],
    ['Epitalon', 'Longevity', 5000, 10000, 2, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Telomerase activating peptide'],
    ['NAD+', 'Longevity', 50000, 250000, 4, 'Daily', 'SubQ/IV', 'Refrigerate 2-8°C', 'Nicotinamide adenine dinucleotide'],
    ['SS-31 (Elamipretide)', 'Longevity', 40000, 40000, 4, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Mitochondrial-targeted peptide'],

    // Tanning / Sexual
    ['Melanotan 2', 'Tanning', 250, 500, 1, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'Melanocortin agonist for tanning'],
    ['PT-141 (Bremelanotide)', 'Sexual Health', 500, 2000, 2.7, 'As needed', 'SubQ', 'Refrigerate 2-8°C', 'Melanocortin agonist for sexual function'],
    ['Kisspeptin-10', 'Sexual Health', 1000, 6400, 0.47, 'As needed', 'SubQ/IV', 'Refrigerate 2-8°C', 'GnRH stimulating peptide'],

    // Anti-inflammatory
    ['5-Amino-1MQ', 'Metabolic', 50000, 150000, 6, 'Daily', 'Oral', 'Room temperature', 'NNMT inhibitor for fat metabolism'],
    ['AOD 9604', 'Metabolic', 300, 600, 1, 'Daily', 'SubQ', 'Refrigerate 2-8°C', 'HGH fragment for fat loss'],

    // Energy / Performance
    ['SLU-PP-332', 'Performance', 250, 500, 6, 'Daily', 'Oral', 'Room temperature', 'Exercise mimetic ERR agonist'],
    ['Tesofensine', 'Metabolic', 250, 500, 220, 'Daily', 'Oral', 'Room temperature', 'Triple monoamine reuptake inhibitor'],
  ];

  for (const p of peptides) {
    await database.runAsync(
      `INSERT INTO peptides (name, category, typical_dose_mcg_low, typical_dose_mcg_high, half_life_hours, frequency, route, storage_info, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO dose_logs (protocol_id, dose_mcg, injection_site, notes, side_effects)
     VALUES (?, ?, ?, ?, ?)`,
    protocolId, doseMcg, injectionSite ?? null, notes ?? null, sideEffects ?? null,
  );

  // Update injection site usage
  if (injectionSite) {
    await db.runAsync(
      `UPDATE injection_sites SET last_used = datetime('now'), use_count = use_count + 1
       WHERE site_key = ?`,
      injectionSite
    );
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
