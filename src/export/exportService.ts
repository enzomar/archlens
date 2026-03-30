import { saveAs } from 'file-saver';
import type { ArchEntity, Relationship, ArchLensProject } from '../domain/types';
import { KIND_TO_ZOOM } from '../domain/types';

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

export function exportProjectAs(project: ArchLensProject, fileName: string): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const safeName = fileName.replace(/\s+/g, '-').toLowerCase();
  saveAs(blob, safeName.endsWith('.archlens') ? safeName : `${safeName}.archlens`);
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

// ─── SVG EXPORT ──────────────────────────────────────────────────

export function exportSvg(svgElement: SVGSVGElement, projectName: string): void {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  // Remove interactive-only elements
  clone.querySelectorAll('.space-pan-overlay, .canvas-hud').forEach((el) => el.remove());
  // Set explicit dimensions from viewBox or bounding box
  const bbox = svgElement.getBBox();
  const pad = 40;
  clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
  clone.setAttribute('width', String(bbox.width + pad * 2));
  clone.setAttribute('height', String(bbox.height + pad * 2));
  // Inline computed styles for standalone rendering
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const styles = document.createElement('style');
  styles.textContent = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try { return Array.from(sheet.cssRules).map((r) => r.cssText); }
      catch { return []; }
    })
    .filter((rule) => rule.includes('canvas') || rule.includes('edge') || rule.includes('entity') || rule.includes('node') || rule.includes('kind-'))
    .join('\n');
  clone.insertBefore(styles, clone.firstChild);
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${projectName.replace(/\s+/g, '-').toLowerCase()}.svg`);
}

// ─── PNG EXPORT ──────────────────────────────────────────────────

export function exportPng(svgElement: SVGSVGElement, projectName: string, scale = 2): void {
  const bbox = svgElement.getBBox();
  const pad = 40;
  const w = bbox.width + pad * 2;
  const h = bbox.height + pad * 2;

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('.space-pan-overlay, .canvas-hud').forEach((el) => el.remove());
  clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${w} ${h}`);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const styles = document.createElement('style');
  styles.textContent = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try { return Array.from(sheet.cssRules).map((r) => r.cssText); }
      catch { return []; }
    })
    .filter((rule) => rule.includes('canvas') || rule.includes('edge') || rule.includes('entity') || rule.includes('node') || rule.includes('kind-'))
    .join('\n');
  clone.insertBefore(styles, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `${projectName.replace(/\s+/g, '-').toLowerCase()}.png`);
    }, 'image/png');
  };
  img.src = url;
}

// ─── PLANTUML EXPORT ─────────────────────────────────────────────

export function exportPlantUml(entities: ArchEntity[], relationships: Relationship[], projectName: string): void {
  const lines: string[] = ['@startuml', `title ${projectName}`, ''];

  const alias = (e: ArchEntity) => e.id.replace(/[^a-zA-Z0-9_]/g, '_');
  const level = (e: ArchEntity) => KIND_TO_ZOOM[e.kind];

  // Group entities by zoom level
  const contextEntities = entities.filter((e) => level(e) === 'context');
  const containerEntities = entities.filter((e) => level(e) === 'container');
  const componentEntities = entities.filter((e) => level(e) === 'component');

  const c4Type = (e: ArchEntity): string => {
    if (e.kind === 'person') return 'Person';
    if (level(e) === 'context') return 'System';
    if (level(e) === 'container') return 'Container';
    return 'Component';
  };

  const renderEntity = (e: ArchEntity) => {
    const tech = e.metadata.technology ? `, "${e.metadata.technology}"` : '';
    const desc = e.description ? `, "${e.description.replace(/"/g, "'")}"` : '';
    return `${c4Type(e)}(${alias(e)}, "${e.name}"${tech}${desc})`;
  };

  // Context level
  for (const e of contextEntities) {
    const children = containerEntities.filter((c) => c.parentId === e.id);
    if (children.length > 0 && e.kind !== 'person') {
      lines.push(`System_Boundary(${alias(e)}_boundary, "${e.name}") {`);
      for (const c of children) lines.push(`  ${renderEntity(c)}`);
      lines.push('}');
    } else {
      lines.push(renderEntity(e));
    }
  }
  // Standalone containers (no parent)
  for (const e of containerEntities.filter((c) => !c.parentId || !entities.some((p) => p.id === c.parentId))) {
    lines.push(renderEntity(e));
  }
  // Components
  for (const e of componentEntities) lines.push(renderEntity(e));

  lines.push('');
  // Relationships
  for (const r of relationships) {
    const src = entities.find((e) => e.id === r.sourceId);
    const tgt = entities.find((e) => e.id === r.targetId);
    if (!src || !tgt) continue;
    const tech = r.protocol ? `, "${r.protocol}"` : '';
    lines.push(`Rel(${alias(src)}, ${alias(tgt)}, "${r.label}"${tech})`);
  }

  lines.push('', '@enduml');
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${projectName.replace(/\s+/g, '-').toLowerCase()}.puml`);
}

// ─── STRUCTURIZR DSL EXPORT ──────────────────────────────────────

export function exportStructurizrDsl(entities: ArchEntity[], relationships: Relationship[], projectName: string): void {
  const lines: string[] = [];
  const indent = (n: number) => '    '.repeat(n);
  const alias = (e: ArchEntity) => e.shortName.replace(/[^a-zA-Z0-9_]/g, '_') || e.id.replace(/[^a-zA-Z0-9_]/g, '_');
  const aliasMap = new Map<string, string>();
  entities.forEach((e) => aliasMap.set(e.id, alias(e)));

  lines.push('workspace {', `${indent(1)}model {`);

  // People
  for (const e of entities.filter((e) => e.kind === 'person')) {
    lines.push(`${indent(2)}${alias(e)} = person "${e.name}" "${e.description}"`);
  }

  // Software systems with containers
  const systems = entities.filter((e) => e.kind === 'system');
  for (const sys of systems) {
    const containers = entities.filter((c) => c.parentId === sys.id && KIND_TO_ZOOM[c.kind] === 'container');
    if (containers.length > 0) {
      lines.push(`${indent(2)}${alias(sys)} = softwareSystem "${sys.name}" "${sys.description}" {`);
      for (const c of containers) {
        const components = entities.filter((comp) => comp.parentId === c.id && KIND_TO_ZOOM[comp.kind] === 'component');
        if (components.length > 0) {
          lines.push(`${indent(3)}${alias(c)} = container "${c.name}" "${c.description}" "${c.metadata.technology ?? ''}" {`);
          for (const comp of components) {
            lines.push(`${indent(4)}${alias(comp)} = component "${comp.name}" "${comp.description}" "${comp.metadata.technology ?? ''}"`);
          }
          lines.push(`${indent(3)}}`);
        } else {
          lines.push(`${indent(3)}${alias(c)} = container "${c.name}" "${c.description}" "${c.metadata.technology ?? ''}"`);
        }
      }
      lines.push(`${indent(2)}}`);
    } else {
      lines.push(`${indent(2)}${alias(sys)} = softwareSystem "${sys.name}" "${sys.description}"`);
    }
  }

  // Relationships
  lines.push('');
  for (const r of relationships) {
    const sa = aliasMap.get(r.sourceId);
    const ta = aliasMap.get(r.targetId);
    if (!sa || !ta) continue;
    const tech = r.protocol ? ` "${r.protocol}"` : '';
    lines.push(`${indent(2)}${sa} -> ${ta} "${r.label}"${tech}`);
  }

  lines.push(`${indent(1)}}`, '', `${indent(1)}views {`);
  lines.push(`${indent(2)}systemContext * {`, `${indent(3)}include *`, `${indent(3)}autolayout lr`, `${indent(2)}}`);
  for (const sys of systems) {
    lines.push(`${indent(2)}container ${alias(sys)} {`, `${indent(3)}include *`, `${indent(3)}autolayout lr`, `${indent(2)}}`);
  }
  lines.push(`${indent(1)}}`, '}');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${projectName.replace(/\s+/g, '-').toLowerCase()}.dsl`);
}
