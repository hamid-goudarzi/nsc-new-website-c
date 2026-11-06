# SEO and AI-search log

Weekly improvement runs append here: what changed, why, and what to do next. Newest at the bottom.

## Baseline (Oct 30 – Nov 4, 2026, set up by hand)
- Site launched on www.neilsmithconstruction.com (Astro on Vercel) with admin, sitemap with images, robots (AI crawlers allowed), llms.txt / llms-full.txt, GeneralContractor schema (offer catalog, founders, COR, hours, geo, sameAs LinkedIn/Instagram/Google Business Profile), FAQPage, Service, BreadcrumbList, CreativeWork, JobPosting.
- Landing pages: heavy-civil-contractor, excavation-earthworks, school-site-works, underground-utilities, tenders, equipment, fill-soil, services; areas/ city pages generated from project cities.
- Keyword-led H1s on home and main pages; AVIF + WebP images; self-hosted fonts and Lenis; inline @font-face; 0 axe violations on 10 pages; PageSpeed services page mobile 97/100/100/100, desktop 100s.
- Every old Wix URL (40 pages + 3 booking pages) has a specific 301 in vercel.json; old domain switch-over not done yet (owner will move it).
- Google Search Console + Bing Webmaster verified (company Gmail neilsmithconstructionltd@gmail.com); Google Business Profile claimed and updated (categories, description, website, services, service area).
- Competitor check: IWC Excavation, Norland/BEL/Copcan, TYBO, Jacob Bros, B&B rank for target searches; none had structured data, city pages or FAQs. Their edge: fleet/staff numbers, named client lists, news posts, directory listings.

## Nov 4, 2026 — specialty pages (by hand)
- Added 7 specialty pages built only from project records: sewer-contractor, watermain-contractor, stormwater-detention, modular-classroom-site-servicing, roadworks-curb-sidewalk, seismic-upgrade-site-works, civil-subcontractor. Each has scope, real project grid, FAQ (FAQPage schema) and CTA.
- "Explore our civil work" cards on services.html and heavy-civil-contractor.html link all specialty pages; project pages show "Related specialties"; area pages show "Specialties in <city>". Specialty titles added to Organization knowsAbout.
- 55 pages, build check clean, 0 axe violations, no horizontal scroll at 390 px.

## Nov 4, 2026 — photo and video finish (by hand)
- All 109 site photos graded for a professional look (denoise, white balance, filmic tone curve, clarity, warmth, vignette, sharpening). Same pixel sizes; WebP/AVIF file sizes kept at or below the old ones. Drawings and illustrations untouched.
- New photos from Hamid, recomposed and graded: nsc-cat-school (hero: heavy-civil-contractor), nsc-fleet (hero + gallery: equipment), nsc-valves (hero: watermain-contractor). Graduated sky filter on overcast shots.
- Large-scale heroes: gwide2 (heavy civil, now replaced by nsc-cat-school), manitoba-tanks (seismic), brig-grading (modular). 1920 px sizes added for gwide2, brig-grading, ubc-exc, stock, mhpipe.
- Home film and dig videos re-graded to match and re-encoded (AV1, HEVC, H.264) at or below previous sizes; poster regraded.
- Glowing NSC logo mark with glint on all project photo cards; stronger NSC built badge; logo hover glow. Reduced-motion respected.
- Grading pipeline: denoise → gray-world WB (60%) → levels → filmic curve + CLAHE → clarity → warmth → vibrance → vignette → unsharp. Apply to new photos only (never re-grade an already graded file).

## Nov 5, 2026 — weekly run: project depth, contact page, specialty links
- 17 thin project pages: added factual write-ups taken only from each project's scope, details and photo captions (client, year, what was built). The text also feeds llms-full.txt, so AI assistants get the same detail. Pages: agnes-supportive-housing, brighouse-elementary, brighouse-modular-addition, chilliwack-mall-redevelopment, fire-hall-12-kitsilano, florin-development, howard-debeck-secondary, james-whiteside-elementary, manitoba-yard-fuel-station, mckinney-elementary, mcroberts-secondary, north-surrey-utility-improvements, portland-loos, richmond-school-portables, tomsett-elementary, ubc-digital-design-studio, william-cook-elementary.
- Contact page: new "What to send for a bid" list and 6-question FAQ (FAQPage schema): hours, response time, locations, work bid on, safety contact, jobs. New meta description. All editable in the admin with existing block types.
- Specialty pages: added William Cook to modular-classroom-site-servicing and watermain-contractor, North Surrey to sewer-contractor, Agnes to watermain-contractor.
- Sitemap date bumped to Nov 5.
- Checks: build check clean (55 pages); no horizontal scroll at 1440/390 on 7 changed pages; axe 0 violations (contact page must be tested after its fade-in ends, otherwise axe falsely reports contrast). The sandbox blocks direct access to the live site, so live checks rely on the Vercel commit status.
- Search check: searches this week returned mostly job boards and directories (CCIB, D&B, ConstructConnect, MajorProjects, BC Hydro civil underground page), with IWC and Southwest Contracting pages. Directory and supplier listings look like a real gap for NSC.
- To confirm with Hamid: McKinney, Tomsett and James Whiteside photos show work beyond their listed scope (water services, portable pad, catch basins). The write-ups word this as "site photos also show".

## Nov 5, 2026 — professional photo finish (by hand, branch photos/pro-finish)
- Re-finished 109 real site photos from the untouched originals (commit 12c3e60~1), replacing the Nov 4 grade: calmer phone over-sharpening and noise, neutral white balance, soft highlight roll-off, gentle local contrast, tamed loud colours, light sky filter and vignette, fine output sharpening.
- Auto-levelled tilted shots (fh12-excavator, florin-excavator, jwhiteside-pad, parkcrest-crew, qe-exc) and recropped heroes to cut clutter: agnes-excavator-loading, qe-exc, ubc-shoring, tank, mhcrew.
- Not touched: drawings and illustration, film-poster, and nsc-cat-school / nsc-fleet / nsc-valves (already finished, no originals). Every file kept at or below its previous size. No generated images.

## Nov 6, 2026 — Kingston Road drone stills (by hand)
- Pulled three clean frames (no titles or overlay lines) from NSC's own Kingston drone reel (NSC_Kingston_Sewer_Separation_v6_16x9.mp4), picked the sharpest frame in each moment and gave them the Nov 5 pro finish. New hero: kingston-aerial (wide fall view of the finished road); gallery: kingston-aerial-top, kingston-aerial-street; old hero mh2 moved into the gallery. 1920 px (video resolution, not upscaled).
- Other Desktop files checked: gpss_aerial_test.jpg is a map/satellite image (not NSC's, not used); NSC_workers_preview.jpg is a 3D render (not used). Agnes, George Greenaway, Ladner and Burnaby Childcare reels are built from photos with text overlays; ask Hamid for the original photos, and confirm Burnaby Childcare (Rowan Ave, 2024) details before adding it as a project.

## Next ideas
- For big wide "hero" views of machinery, book a drone or pro photographer day on the largest active sites (Guildford Park, Kingston Road, Queen Elizabeth), or brief crews to shoot wide landscape shots from high ground.
- Ask Hamid which projects nsc-cat-school and nsc-fleet belong to, then add them to those project galleries with project-specific alt text.
- When new photos arrive, prefer wide, eye-level shots with crews and equipment; grade them with the same pipeline.
- Project pages are thin (~130–200 words): build fuller, factual summaries from existing details/scope/timeline; link to services and areas.
- Deepen the 7 specialty pages over time with more photos from their projects (galleries) and any new projects.
- School district page(s): SD36 Surrey, SD37 Delta, SD38 Richmond, SD40 New Westminster, SD41 Burnaby — only projects in the repo.
- Contact page is short (~120 words): add offices, hours, what to send for a bid, and FAQ.
- Careers page (~200 words): add what roles NSC hires for and how to apply, from existing content only.
- Careers page: remains thin. Then George Greenaway, Ladner and Parkcrest write-ups, which have medium depth.
- Schools page already lists projects by district; a separate district page is probably not needed unless searches show demand.
