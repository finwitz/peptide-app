import { INTERACTIONS, type PeptideInteraction, type InteractionSeverity } from './interactions';
import type { Protocol } from './database';

export function checkInteractions(peptideNames: string[]): PeptideInteraction[] {
  const found: PeptideInteraction[] = [];
  const nameSet = new Set(peptideNames.map(n => n.toLowerCase()));

  for (const interaction of INTERACTIONS) {
    const a = interaction.peptideA.toLowerCase();
    const b = interaction.peptideB.toLowerCase();
    if (nameSet.has(a) && nameSet.has(b)) {
      found.push(interaction);
    }
  }

  // Sort by severity
  const order: Record<InteractionSeverity, number> = {
    contraindicated: 0, major: 1, moderate: 2, minor: 3, timing: 4,
  };
  return found.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function checkNewProtocolInteractions(
  newPeptideName: string,
  activeProtocols: Protocol[],
): PeptideInteraction[] {
  const activeNames = activeProtocols.map(p => p.peptide_name);
  return checkInteractions([newPeptideName, ...activeNames]);
}

export function getInteractionsForPeptide(peptideName: string): PeptideInteraction[] {
  const name = peptideName.toLowerCase();
  return INTERACTIONS.filter(
    i => i.peptideA.toLowerCase() === name || i.peptideB.toLowerCase() === name
  );
}

export function getSeverityInfo(severity: InteractionSeverity): {
  label: string;
  icon: string;
} {
  switch (severity) {
    case 'contraindicated':
      return { label: 'Contraindicated', icon: 'close-circle' };
    case 'major':
      return { label: 'Major', icon: 'warning' };
    case 'moderate':
      return { label: 'Moderate', icon: 'alert-circle-outline' };
    case 'minor':
      return { label: 'Minor', icon: 'information-circle-outline' };
    case 'timing':
      return { label: 'Timing', icon: 'time-outline' };
  }
}
