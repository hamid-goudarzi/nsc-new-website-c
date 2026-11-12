// "Clients and partners": who NSC has built for, generated only from the project records
// (Client, Prime contractor, Construction manager fields). No counts or totals are shown.

const SD = { 36: 'Surrey', 37: 'Delta', 38: 'Richmond', 39: 'Vancouver', 40: 'New Westminster', 41: 'Burnaby' };
const NSC = /neil smith construction/i;
const val = (p, re) => (p.details || []).find(d => re.test(d.label))?.value || '';

export const clientSlug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** "School District #38" → "School District No. 38 (Richmond)" */
export function clientLabel(n) {
  const m = /^school district\s*#?\s*(\d+)$/i.exec(String(n).trim());
  return m ? `School District No. ${m[1]}${SD[m[1]] ? ` (${SD[m[1]]})` : ''}` : String(n).trim();
}
const keyOf = n => clientLabel(n).toLowerCase().replace(/\b(ltd|inc|group|llp)\.?$/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function clientsOf(projects) {
  const map = new Map();
  const add = (name, role, p) => {
    if (!name || NSC.test(name)) return;
    const k = keyOf(name);
    if (!map.has(k)) map.set(k, { name: clientLabel(name), slug: clientSlug(clientLabel(name)), roles: new Set(), projects: [] });
    const c = map.get(k);
    c.roles.add(role);
    if (!c.projects.includes(p)) c.projects.push(p);
  };
  for (const p of projects) {
    add(val(p, /^client$/i), 'owner', p);
    add(val(p, /^prime contractor$/i), 'prime', p);
    add(val(p, /^construction manager$/i), 'cm', p);
  }
  const all = [...map.values()];
  const builder = c => c.roles.has('prime') || c.roles.has('cm');
  const groups = [
    { id: 'public', title: 'Municipalities and public owners', items: all.filter(c => !builder(c) && /^(city of|university endowment|district of|township of|corporation of)/i.test(c.name)) },
    { id: 'schools', title: 'School districts', items: all.filter(c => /^school district/i.test(c.name)).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })) },
    { id: 'contractors', title: 'General contractors and construction managers', items: all.filter(builder) },
    { id: 'private', title: 'Private owners and developers', items: [] },
  ];
  const used = new Set(groups.flatMap(g => g.items));
  groups[3].items = all.filter(c => !used.has(c));
  return groups.filter(g => g.items.length);
}

/** How NSC worked with this client on one project, in plain words. */
export function roleOn(c, p) {
  const prime = val(p, /^prime contractor$/i), cm = val(p, /^construction manager$/i), owner = val(p, /^client$/i);
  const me = k => k && keyOf(k) === keyOf(c.name);
  if (me(cm)) return 'NSC as civil subcontractor to the construction manager';
  if (me(prime) && me(owner)) return 'NSC as civil subcontractor';
  if (me(prime)) return 'NSC as civil subcontractor to the prime contractor';
  if (NSC.test(val(p, /^contractor$/i))) return 'NSC as prime contractor';
  if (cm) return `NSC as civil subcontractor to ${cm}`;
  if (prime) return `NSC as civil subcontractor to ${prime}`;
  return '';
}
