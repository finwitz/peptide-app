import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import { getAllProtocols, createProtocol, logDose, type DoseLog, type Protocol } from './database';
import * as SQLite from 'expo-sqlite';

async function getDb() {
  return SQLite.openDatabaseAsync('peptidecalc.db');
}

export async function exportDoseLogsCSV(): Promise<void> {
  const db = await getDb();
  const logs = await db.getAllAsync<DoseLog & { protocol_name: string; peptide_name: string }>(
    `SELECT dl.*, p.name as protocol_name, p.peptide_name
     FROM dose_logs dl JOIN protocols p ON dl.protocol_id = p.id
     ORDER BY dl.logged_at DESC`
  );

  const header = 'Date,Protocol,Peptide,Dose (mcg),Injection Site,Notes,Side Effects\n';
  const rows = logs.map(l =>
    [
      l.logged_at,
      csvEscape(l.protocol_name),
      csvEscape(l.peptide_name),
      l.dose_mcg,
      l.injection_site ?? '',
      csvEscape(l.notes ?? ''),
      csvEscape(l.side_effects ?? ''),
    ].join(',')
  ).join('\n');

  const csv = header + rows;
  const file = new File(Paths.cache, `peptidecalc_doses_${dateStamp()}.csv`);
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Dose Logs' });
}

export async function exportProtocolsJSON(): Promise<void> {
  const protocols = await getAllProtocols();
  const db = await getDb();

  const data = await Promise.all(protocols.map(async (p) => {
    const logs = await db.getAllAsync<DoseLog>(
      'SELECT * FROM dose_logs WHERE protocol_id = ? ORDER BY logged_at DESC',
      p.id
    );
    return { ...p, dose_logs: logs };
  }));

  const json = JSON.stringify({ exported_at: new Date().toISOString(), protocols: data }, null, 2);
  const file = new File(Paths.cache, `peptidecalc_backup_${dateStamp()}.json`);
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Protocols' });
}

export interface ImportResult {
  protocolsCreated: number;
  dosesCreated: number;
  errors: string[];
}

/**
 * Import protocols and dose logs from a JSON string produced by exportProtocolsJSON.
 * Creates new rows (non-destructive). Existing data is preserved.
 */
export async function importProtocolsJSON(json: string): Promise<ImportResult> {
  const result: ImportResult = { protocolsCreated: 0, dosesCreated: 0, errors: [] };
  let parsed: { protocols?: Array<Protocol & { dose_logs?: DoseLog[] }> };
  try {
    parsed = JSON.parse(json);
  } catch {
    result.errors.push('Invalid JSON file');
    return result;
  }
  if (!parsed || !Array.isArray(parsed.protocols)) {
    result.errors.push('File does not look like a PeptideCalc backup');
    return result;
  }

  for (const p of parsed.protocols) {
    try {
      const newId = await createProtocol({
        name: p.name,
        peptide_id: p.peptide_id ?? null,
        peptide_name: p.peptide_name,
        dose_mcg: p.dose_mcg,
        frequency_days: p.frequency_days,
        vial_mg: p.vial_mg ?? null,
        water_ml: p.water_ml ?? null,
        syringe_type: p.syringe_type,
        route: p.route,
        notes: p.notes ?? null,
        start_date: p.start_date,
        end_date: p.end_date ?? null,
      });
      result.protocolsCreated++;

      const logs = p.dose_logs ?? [];
      for (const log of logs) {
        try {
          await logDose(
            newId,
            log.dose_mcg,
            log.injection_site ?? undefined,
            log.notes ?? undefined,
            log.side_effects ?? undefined,
            undefined,
            log.logged_at,
          );
          result.dosesCreated++;
        } catch (e) {
          result.errors.push(`Dose log for "${p.name}": ${(e as Error).message}`);
        }
      }
    } catch (e) {
      result.errors.push(`Protocol "${p.name}": ${(e as Error).message}`);
    }
  }
  return result;
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function dateStamp(): string {
  return new Date().toISOString().split('T')[0];
}
