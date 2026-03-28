import { saveAs } from 'file-saver';
import type { ArchEntity, Relationship, ArchLensProject } from '../domain/types';

// ─── CSV EXPORT ──────────────────────────────────────────────────

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportEntitiesCsv(entities: ArchEntity[]): void {
  const headers = ['ID', 'Name', 'Kind', 'Description', 'ParentID', 'Maturity', 'Size', 'AppType', 'DeploymentStage', 'Technology', 'Tags'];
  const rows = entities.map((e) => [
    e.id,
    e.name,
    e.kind,
    e.description,
    e.parentId ?? '',
    e.metadata.maturity ?? '',
    e.metadata.size ?? '',
    e.metadata.appType ?? '',
    e.metadata.deploymentStage ?? '',
    e.metadata.technology ?? '',
    e.metadata.tags.join('; '),
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, 'archlens-entities.csv');
}

export function exportRelationshipsCsv(relationships: Relationship[]): void {
  const headers = ['ID', 'Source', 'Target', 'Type', 'Label', 'Protocol', 'Description'];
  const rows = relationships.map((r) => [
    r.id,
    r.sourceId,
    r.targetId,
    r.type,
    r.label,
    r.protocol ?? '',
    r.description ?? '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, 'archlens-relationships.csv');
}

// ─── JSON / ARCHLENS FILE ────────────────────────────────────────

export function exportProject(project: ArchLensProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${project.name.replace(/\s+/g, '-').toLowerCase()}.archlens`);
}

export function importProject(file: File): Promise<ArchLensProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        // Accept v2 (tabs array) or v1 (flat entities array) formats
        if (!data.version || (!data.tabs && !data.entities)) {
          reject(new Error('Invalid ArchLens file format'));
          return;
        }
        resolve(data as ArchLensProject);
      } catch {
        reject(new Error('Failed to parse ArchLens file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ─── EXCEL-STYLE EXPORT (TSV for easy Excel import) ──────────────

export function exportExcel(entities: ArchEntity[], relationships: Relationship[]): void {
  // Sheet 1: Entities
  const entHeaders = ['Name', 'Kind', 'Description', 'Parent', 'Maturity', 'Size', 'AppType', 'Stage', 'Technology', 'Tags'];
  const entRows = entities.map((e) => {
    const parent = entities.find((p) => p.id === e.parentId);
    return [
      e.name, e.kind, e.description, parent?.name ?? '',
      e.metadata.maturity ?? '', e.metadata.size ?? '', e.metadata.appType ?? '',
      e.metadata.deploymentStage ?? '', e.metadata.technology ?? '',
      e.metadata.tags.join('; '),
    ];
  });
  const sheet1 = [entHeaders, ...entRows].map((r) => r.join('\t')).join('\n');

  // Sheet 2: Relationships
  const relHeaders = ['Label', 'Type', 'Source', 'Target', 'Protocol', 'Description'];
  const relRows = relationships.map((r) => {
    const src = entities.find((e) => e.id === r.sourceId);
    const tgt = entities.find((e) => e.id === r.targetId);
    return [r.label, r.type, src?.name ?? r.sourceId, tgt?.name ?? r.targetId, r.protocol ?? '', r.description ?? ''];
  });
  const sheet2 = [relHeaders, ...relRows].map((r) => r.join('\t')).join('\n');

  const content = `=== ENTITIES ===\n${sheet1}\n\n=== RELATIONSHIPS ===\n${sheet2}`;
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  saveAs(blob, 'archlens-export.tsv');
}
