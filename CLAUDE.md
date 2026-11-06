# CLAUDE.md — Neil Smith Construction website

Context for Claude Code sessions working on this repo. Read this first, then `README.md` (how the site and admin work) and `docs/seo-log.md` (everything done for search/AI so far, and next ideas).

Owner: Hamid Goudarzi (civil engineer / project coordinator at NSC). He is not a developer: explain in plain words, show results, don't ask him to run commands unless needed.

## The company (facts you may use)
- Neil Smith Construction Ltd. (NSC), heavy civil contractor. Head office #206-6011 Westminster Hwy, Richmond, BC V7C 4R9. Equipment yard 22617 Fraser Hwy, Langley. Phone 604-644-5884 (office — use this number everywhere). Email info@nscltd.ca.
- Founded 2018 by Neil Smith and Dennis Frederickson. COR certified (BC Construction Safety Alliance).
- Work: underground utilities (sanitary, storm, water, sewer separation), excavation and earthworks, site servicing, school site works, roadworks/curb/sidewalk, stormwater detention, modular classroom sites, seismic upgrade site works; civil subcontractor for GCs/CMs.
- Clients in the repo: City of Vancouver, City of Surrey, University Endowment Lands, School Districts 36/37/38/40/41, Keller Construction, Kinetic Construction, SmartCentres, BC Housing projects. All project facts live in `content/project/*.json`.

## Content rules (strict — Hamid's standing rules)
- Only true facts from the repo or NSC's own pages. Never invent projects, numbers, clients, awards, memberships, partnerships, equipment counts, testimonials or reviews. No project totals / "jobs on record". Never use the word "in-house". Show NSC as a big, capable company with plain facts.
- Photos: NSC crews only, in hard hats; never show the asphalt subcontractor's crew. No stock photos, no AI-generated images of sites, people or equipment. Editing (grading, cropping, straightening, removing clutter) is fine.
- No keyword stuffing, hidden text or doorway pages. Titles ≤ 62 chars, descriptions ≤ 160.

## Repos and deploy
- Company repo (production): `NeilSmithConstructionLtd/nsc-new-website`, branch `master` → Vercel project "nsc" (team nsc19) → https://www.neilsmithconstruction.com. Branch `cms` mirrors `master`.
- Personal mirror: `hamid-goudarzi/nsc-new-website-c` — keep identical.
- Publish: `git push <company> HEAD:master HEAD:cms` and `git push <mirror> HEAD:master HEAD:cms`. Check deploy: `gh api repos/NeilSmithConstructionLtd/nsc-new-website/commits/<sha>/statuses` (Vercel can take 2–15 min).
- Commits starting with `[admin]` or `[media]` skip Vercel builds (admin saves use these).
- Commit identity: Vercel (Hobby team) only builds commits whose author email is a verified email on a GitHub account connected to the Vercel team. As of Nov 6 2026, commits by goudarzi.hamid@gmail.com and neilsmithconstructionltd@gmail.com show "Blocked" ("commit email could not be matched to a GitHub account") in Vercel → Deployments and never go live. Vercel's connected GitHub account is NeilSmithConstructionLtd (id 350006125); on Hamid's computer this repo commits as `Neil Smith Construction <350006125+NeilSmithConstructionLtd@users.noreply.github.com>` (that account's own GitHub commit email, chosen by Hamid on Nov 6 2026). Don't borrow any other identity. After pushing, confirm the deployment says Ready, not just that the push worked.

## Build and check
- Astro 5 static site, Node 22. `npm ci`, `npm run dev`, `npm run build` (runs `scripts/check-build.mjs` — fails on broken links/photos, bad JSON-LD, wrong canonicals; never bypass it), `npm run admin:local` (site + admin locally).
- Pages build as `.html` (`build.format: 'preserve'`); vercel.json redirects clean URLs and every old Wix URL.
- Verify visual changes with Playwright screenshots at 1440 and 390 px, axe (@axe-core/playwright) with 0 violations, and Lighthouse mobile. Last results: PageSpeed 96–100 everywhere.

## How content works
- Content JSON in `content/<type>/<id>.json` (siteSettings, home, projectsPage, page, project, market, person, job). References: `{_type:'reference', _ref}`. Page bodies are `blocks` rendered by `src/components/Blocks.astro`; the admin forms come from `public/admin/schema.js` — if you add a field or block type, add it there too.
- Images: `{_type:'image', local:'<key>', alt, focus?, tag?}` → files `public/media/<key>-{640,1280,2560}.webp` (+1920 for heroes) and AVIF copies `-{640,1280,1920}.avif`. URLs get a content-hash `?v=` automatically (`src/lib/util.mjs`), so changed files show immediately despite 7-day caching. Hard-coded media in `src/pages/index.astro` / `public/assets/home.js` (film poster, videos) use `?v=YYYYMMDD` — bump it when those files change.
- Photo finish: all photos were graded (denoise → white balance → levels → filmic curve + CLAHE → clarity → warmth → vibrance → vignette → sharpen; OpenCV/Pillow). Grade NEW photos only; never re-grade an already graded file. On Nov 5 2026 the photos were re-finished from the untouched originals (git 12c3e60~1) with a calmer, natural pro look plus straightening and hero recrops; use that look for new photos. Keep file sizes ≤ previous.

## SEO / AI search
- Automatic: sitemap.xml (with images), robots.txt (AI crawlers allowed), llms.txt, llms-full.txt, JSON-LD (GeneralContractor with hours/geo/sameAs/knowsAbout, Service, FAQPage, BreadcrumbList, CreativeWork, JobPosting), IndexNow ping on production builds.
- Landing pages: heavy-civil-contractor, services, excavation-earthworks, underground-utilities, school-site-works, tenders, equipment, fill-soil, and specialties: sewer-contractor, watermain-contractor, stormwater-detention, modular-classroom-site-servicing, roadworks-curb-sidewalk, seismic-upgrade-site-works, civil-subcontractor. City pages in `areas/`.
- Google Search Console + Bing Webmaster: company account neilsmithconstructionltd@gmail.com (backup hamid.nscltd@gmail.com). Keep `public/google*.html`, `public/BingSiteAuth.xml`, `public/07718281179c3d1bfd8ca8be13da7fe9.txt` (IndexNow key).
- Google Business Profile is owned by neilsmithconstructionltd@gmail.com (categories, description, services, service area done; photos and reviews still needed).
- A weekly scheduled task ("Weekly NSC website SEO & AI-search improvement", Thursdays 2:23 PM Vancouver) makes small factual improvements and logs them in `docs/seo-log.md`. Coordinate with it: read the log before starting, and append what you change.

## Never touch
`api/` admin backend auth logic and `.admin/users.enc` (unless fixing a bug on purpose), Vercel env vars / secrets (`GITHUB_TOKEN` expires ~Jan 28 2027; `ADMIN_SECRET` must never change), verification files above, contact details, existing redirects (you may add new ones).

## Pending (as of Nov 5 2026)
- Old Wix domain neilsmithconstructionltd.com still live and outranking the new site. Plan: add it in Vercel → Domains, point Wix DNS A/CNAME to Vercel (leave MX for email), then Search Console Change of address. All old URLs already have 301s.
- Off-site: update LinkedIn/Facebook/Instagram links, directory listings (VRCA, BCCA, BC Hydro civil contractor list, Bing Places, Apple Business Connect), fix the Tsawwassen BIA listing (wrong phone/address).
- Ask Hamid which projects the photos `nsc-cat-school` and `nsc-fleet` belong to; confirm the free fill soil offer is still current; the CAT school photo shows another trade's formwork crew in the background — crop tighter if he wants NSC crews only.

## Environment tips
- npm in sandboxes behind a proxy may need: `env -u no_proxy -u NO_PROXY npm_config_noproxy= npm ci`.
- Never run `pkill -f` with a pattern that matches your own command.
