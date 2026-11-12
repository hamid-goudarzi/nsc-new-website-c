// "Areas we serve": one page per city where NSC has built projects, generated from the projects' city field.
// The University Endowment Lands are grouped with Vancouver.
import { projectServices } from './seo.mjs';

export const areaName = city => String(city || '').replace(/\s*\(UEL\)\s*/, '').trim();
export const areaSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function areasOf(projects) {
  const map = new Map();
  for (const p of projects) {
    const name = areaName(p.city);
    if (!name) continue;
    if (!map.has(name)) map.set(name, { name, slug: areaSlug(name), projects: [] });
    map.get(name).projects.push(p);
  }
  return [...map.values()].sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
}

const list = xs => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1);
const uniq = xs => [...new Set(xs.filter(Boolean))];
export const clientOf = p => (p.details || []).find(d => /^client$/i.test(d.label))?.value || '';

/** Plain facts about NSC's work in one area, written from the project records. */
export function areaFacts(a) {
  const ps = a.projects;
  const clients = uniq(ps.map(clientOf));
  const types = uniq(ps.map(p => String(p.type || '').replace(/^[A-Z](?=[a-z])/, ch => ch.toLowerCase())));
  const services = uniq(ps.flatMap(p => projectServices(p).map(s => s.label)));
  const live = ps.filter(p => p.live);
  const uel = ps.some(p => /\(UEL\)/.test(p.city));
  return { clients, types, services, live, uel };
}
export function areaIntro(a, s) {
  const f = areaFacts(a);
  const where = a.name + (f.uel ? ' and the University Endowment Lands' : '');
  const parts = [
    `Neil Smith Construction is a heavy civil contractor working in ${where}, BC, from our head office in Richmond and our equipment yard in Langley.`,
    f.types.length ? `Our work in ${a.name} includes ${list(f.types)}${f.clients.length ? `, for ${list(f.clients)}` : ''}.` : '',
    f.live.length ? `Underway now: ${list(f.live.map(p => p.name))}.` : '',
  ];
  return parts.filter(Boolean).join(' ');
}
