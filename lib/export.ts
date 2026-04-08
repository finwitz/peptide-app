import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import { getAllProtocols, type DoseLog } from './database';
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

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function dateStamp(): string {
  return new Date().toISOString().split('T')[0];
}
