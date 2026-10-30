// Structured data (schema.org JSON-LD) and plain-text summaries for search engines and AI assistants.
import { paras } from './util.mjs';

export const siteUrl = s => (s.siteUrl || 'https://www.neilsmithconstruction.com').replace(/\/$/, '');
export const abs = (s, p) => `${siteUrl(s)}/${String(p || '').replace(/^(\.\.\/)+|^\//g, '')}`;
export const orgId = s => `${siteUrl(s)}/#organization`;

function postal(addr) {
  const [street = '', rest = ''] = String(addr || '').split('\n');
  const m = rest.match(/^\s*([^,]+),\s*([A-Z]{2})\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)?/i);
  return { '@type': 'PostalAddress', streetAddress: street.trim(), addressLocality: m?.[1]?.trim(), addressRegion: m?.[2] || 'BC', postalCode: m?.[3], addressCountry: 'CA' };
}

export function organization(c) {
  const { settings: s, home: h, markets, projects } = c;
  const offices = s.offices || [];
  return {
    '@context': 'https://schema.org',
    '@type': ['GeneralContractor', 'Organization'],
    '@id': orgId(s),
    name: s.companyName,
    alternateName: 'NSC',
    url: siteUrl(s) + '/',
    logo: abs(s, 'nsc-logo.jpg'),
    image: h.featureImage?.local ? abs(s, `media/${h.featureImage.local}-2560.webp`) : undefined,
    description: s.description,
    telephone: s.phone,
    email: s.email,
    address: offices[0] ? postal(offices[0].address) : undefined,
    location: offices.map(o => ({ '@type': 'Place', name: `${s.companyName} ${o.label.toLowerCase()}`, address: postal(o.address), hasMap: o.mapUrl })),
    areaServed: (s.serviceAreas?.length ? s.serviceAreas : ['Metro Vancouver', 'Fraser Valley', 'Lower Mainland, British Columbia']).map(n => ({ '@type': 'AdministrativeArea', name: n })),
    knowsAbout: [...new Set([...(h.serviceTiles || []).map(t => t.title), ...markets.flatMap(m => m.deliver || [])])],
    slogan: [h.heroTitle, h.heroHighlight].filter(Boolean).join(' '),
    foundingDate: '2018',
    founder: [{ '@type': 'Person', name: 'Neil Smith' }, { '@type': 'Person', name: 'Dennis Frederickson' }],
    hasCredential: { '@type': 'EducationalOccupationalCredential', name: 'Certificate of Recognition (COR)', recognizedBy: { '@type': 'Organization', name: 'BC Construction Safety Alliance' } },
    sameAs: [s.linkedin, s.instagram].filter(Boolean),
    hasOfferCatalog: (() => { const sv = servicesOf(c.pages.find(p => p.slug.current === 'services')); return sv.length ? { '@type': 'OfferCatalog', name: 'Heavy civil construction services', itemListElement: sv.map(x => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: x.name, description: x.description } })) } : undefined; })(),
    subjectOf: projects.slice(0, 30).map(p => ({ '@type': 'CreativeWork', name: p.name, url: abs(s, `projects/${p.slug.current}.html`) })),
  };
}

const plain = t => String(t || '').replace(/\*\*|__|##+\s*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
export function faqLd(blocks) {
  const qs = blocks.filter(b => b._type === 'faq').flatMap(b => b.items || []).filter(x => x.q && x.a);
  return qs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qs.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: plain(x.a) } })) } : null;
}
/** Services described on a page (each "Photo with text" section), as schema.org Service items. */
export function servicesOf(page) {
  return (page?.blocks || []).filter(b => b._type === 'imageText' && b.title).map(b => ({ name: b.title, description: plain(b.body).split('\n')[0] }));
}
export function servicesLd(s, page) {
  return servicesOf(page).map(x => ({ '@context': 'https://schema.org', '@type': 'Service', name: x.name, serviceType: x.name, description: x.description,
    provider: { '@id': orgId(s) }, areaServed: (s.serviceAreas || []).map(n => ({ '@type': 'AdministrativeArea', name: n })), url: abs(s, `${page.slug.current}.html`) }));
}
export const projectTitle = (s, p) => p.seoTitle || `${p.name} | ${String(p.city || '').replace(/\s*\(.*\)/, '')} Civil Project | NSC`;
export function projectDescription(p) {
  if (p.description) return p.description;
  const d = p.lede || '';
  if (d.length >= 120) return d;
  return `${d} ${p.type ? p.type + ' in ' : 'Civil works in '}${p.city}, BC, delivered by Neil Smith Construction.`.trim();
}

export function breadcrumbs(s, trail) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(s, path) })) };
}

export function projectLd(s, p) {
  const client = (p.details || []).find(d => /^client$/i.test(d.label))?.value;
  return {
    '@context': 'https://schema.org', '@type': 'CreativeWork', '@id': abs(s, `projects/${p.slug.current}.html#project`),
    name: p.name, headline: p.name, description: projectDescription(p), url: abs(s, `projects/${p.slug.current}.html`),
    image: [p.heroImage, ...(p.gallery || [])].filter(i => i?.local).slice(0, 6).map(i => abs(s, `media/${i.local}-2560.webp`)),
    genre: p.type, keywords: [p.type, p.sector, p.city, ...(p.scope || []).slice(0, 6)].filter(Boolean).join(', '),
    creator: { '@id': orgId(s) }, provider: { '@id': orgId(s) },
    sponsor: client ? { '@type': 'Organization', name: client } : undefined,
    locationCreated: { '@type': 'Place', name: p.city, address: { '@type': 'PostalAddress', addressLocality: p.city?.replace(/\s*\(.*\)/, ''), addressRegion: 'BC', addressCountry: 'CA' } },
    temporalCoverage: p.year, creativeWorkStatus: p.live ? 'In progress' : 'Completed',
    dateModified: p._updatedAt,
  };
}

const EMP = { 'Full-time': 'FULL_TIME', 'Part-time': 'PART_TIME', Contract: 'CONTRACTOR', Seasonal: 'TEMPORARY', Temporary: 'TEMPORARY' };
function salary(t) {
  const n = String(t || '').replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)\s*(k)?(?:\s*(?:to|-|–)\s*\$?\s*(\d+(?:\.\d+)?)\s*(k)?)?/i);
  if (!n) return undefined;
  const v = (x, k) => x ? +x * (k ? 1000 : 1) : undefined;
  const lo = v(n[1], n[2]), hi = v(n[3], n[4]);
  const unit = /hour|hr/i.test(t) ? 'HOUR' : /month/i.test(t) ? 'MONTH' : /week/i.test(t) ? 'WEEK' : 'YEAR';
  return { '@type': 'MonetaryAmount', currency: 'CAD', value: { '@type': 'QuantitativeValue', ...(hi ? { minValue: lo, maxValue: hi } : { value: lo }), unitText: unit } };
}
export function jobLd(s, j) {
  const loc = (j.location || 'Greater Vancouver').replace(/^Greater\s+/i, '');
  const desc = j.description
    ? paras(j.description).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('')
    : `<p>${j.summary || `${s.companyName} is hiring a ${j.title} for heavy civil projects (underground utilities, earthworks, roadworks and site servicing) across ${j.location || 'Greater Vancouver'}.`}</p><p>Apply by email to ${s.email} with “${j.title}” in the subject line.</p>`;
  const posted = j.datePosted || (j._updatedAt || new Date().toISOString()).slice(0, 10);
  return {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: j.title, description: desc, datePosted: posted,
    validThrough: new Date(new Date(posted).getTime() + 120 * 864e5).toISOString().slice(0, 10),
    employmentType: EMP[j.employment] || 'FULL_TIME',
    hiringOrganization: { '@type': 'Organization', '@id': orgId(s), name: s.companyName, sameAs: siteUrl(s), logo: abs(s, 'nsc-logo.jpg') },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: loc, addressRegion: 'BC', addressCountry: 'CA' } },
    baseSalary: salary(j.salary), directApply: false,
  };
}

/** Plain-text company profile for AI assistants (llms-full.txt). */
export function fullText(c) {
  const { settings: s, home: h, markets, projects, people, jobs, pages } = c;
  const L = [];
  const u = p => abs(s, p);
  L.push(`# ${s.companyName}`, '', `> ${s.description}`, '');
  if (s.aiSummary) L.push(s.aiSummary.trim(), '');
  L.push('## Company facts', '',
    `- Name: ${s.companyName} (NSC)`, `- Type: heavy civil contractor (general contractor for civil and infrastructure works)`,
    `- Head office: ${String(s.offices?.[0]?.address || '').replace(/\n/g, ', ')}`,
    ...(s.offices || []).slice(1).map(o => `- ${o.label}: ${String(o.address).replace(/\n/g, ', ')}`),
    `- Phone: ${s.phone}`, `- Email: ${s.email}`, s.safetyEmail ? `- Safety: ${s.safetyEmail}` : '',
    `- Service area: ${(s.serviceAreas?.length ? s.serviceAreas : ['Metro Vancouver', 'Fraser Valley']).join(', ')}, British Columbia, Canada`,
    `- Safety: COR certified (Certificate of Recognition, BC Construction Safety Alliance)`,
    `- Website: ${siteUrl(s)}/`, s.linkedin ? `- LinkedIn: ${s.linkedin}` : '', '');
  L.push('## About', '', h.heroText || '', '', ...paras(h.storyText), '');
  L.push('## Services', '');
  const svc = pages.find(p => p.slug.current === 'services');
  const svcBlocks = (svc?.blocks || []).filter(b => b._type === 'imageText' && b.title);
  if (svcBlocks.length) for (const b of svcBlocks) L.push(`### ${b.title}`, '', plain(b.body), '');
  else for (const t of h.serviceTiles || []) L.push(`- **${t.title}**${t.text ? ': ' + t.text : ''}${t.tags?.length ? ` (${t.tags.join(', ')})` : ''}`);
  L.push('');
  const faqs = pages.flatMap(p => (p.blocks || []).filter(b => b._type === 'faq').flatMap(b => b.items || [])).filter(x => x.q && x.a);
  if (faqs.length) { L.push('## Frequently asked questions', ''); for (const x of faqs) L.push(`### ${x.q}`, '', plain(x.a), ''); }
  L.push('## Markets', '');
  for (const m of markets) {
    L.push(`### ${m.title}`, '', m.description || '', '', ...(m.deliver || []).map(x => `- ${x}`), '');
    if (m.owners?.length) L.push(`Owners and partners: ${m.owners.join(', ')}.`, '');
  }
  L.push('## How projects are delivered', '', ...(h.deliverSteps || []).map(x => `- **${x.title}**: ${x.text}`), '');
  L.push('## Projects', '');
  for (const p of projects) {
    L.push(`### ${p.name}`, '', `- Page: ${u(`projects/${p.slug.current}.html`)}`, `- Status: ${p.status}${p.year ? ` (${p.year})` : ''}`, `- Location: ${p.city}, BC`, `- Type of work: ${p.type}`,
      ...(p.details || []).filter(d => !/^status$/i.test(d.label)).map(d => `- ${d.label}: ${d.value}`), '', p.lede || '', '', ...paras(p.body), '');
    if (p.scope?.length) L.push('Scope of work:', ...p.scope.map(x => `- ${x}`), '');
    if (p.facts?.length) L.push('Key facts:', ...p.facts.map(f => `- ${f.value}: ${f.label}`), '');
  }
  if (people.length) {
    L.push('## Leadership and team', '');
    for (const p of people) L.push(`- **${p.name}**, ${p.role}${p.bio ? ': ' + p.bio : ''}`);
    L.push('');
  }
  L.push('## Careers', '', jobs.length ? `Open positions (apply to ${s.email}):` : 'No open positions listed right now.', ...jobs.map(j => `- ${j.title} (${[j.location, j.employment].filter(Boolean).join(', ')})${j.summary ? ': ' + j.summary : ''}`), '', `Careers page: ${u('careers.html')}`, '');
  const extra = pages.filter(p => !['markets', 'safety', 'about', 'careers', 'contact', 'services'].includes(p.slug.current));
  if (extra.length) { L.push('## More pages', ''); for (const p of extra) L.push(`- [${p.title}](${u(p.slug.current + '.html')})${p.description ? ': ' + p.description : ''}`); L.push(''); }
  L.push('## Contact', '', `To request a bid or prequalification, send drawings or a tender package to ${s.email} or call ${s.phone}. Contact page: ${u('contact.html')}`, '');
  return L.filter(x => x !== undefined && x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}
