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

## Nov 6, 2026 — extra run requested by Hamid: careers and medium project pages
- Careers: added a project grid (Kingston Road, Guildford Park, Queen Elizabeth), a 5-question FAQ (FAQPage schema), and descriptive alt text on the career path photos.
- George Greenaway, Ladner and Parkcrest: added a paragraph each from scope and photo captions.
- Contact page changes from Nov 5 confirmed live with WebFetch.
- Google Jobs gap: the 4 open jobs have no descriptions, so no JobPosting schema is output. Needs real descriptions from Hamid.

## Nov 6, 2026 — Kingston Road drone stills (by hand)
- Pulled three clean frames (no titles or overlay lines) from NSC's own Kingston drone reel (NSC_Kingston_Sewer_Separation_v6_16x9.mp4), picked the sharpest frame in each moment and gave them the Nov 5 pro finish. New hero: kingston-aerial (wide fall view of the finished road); gallery: kingston-aerial-top, kingston-aerial-street; old hero mh2 moved into the gallery. 1920 px (video resolution, not upscaled).
- Other Desktop files checked: gpss_aerial_test.jpg is a map/satellite image (not NSC's, not used); NSC_workers_preview.jpg is a 3D render (not used). Agnes, George Greenaway, Ladner and Burnaby Childcare reels are built from photos with text overlays; ask Hamid for the original photos, and confirm Burnaby Childcare (Rowan Ave, 2024) details before adding it as a project.

## Nov 6, 2026 — Kingston originals from NSC OneDrive (by hand)
- Source: Navid's shared Kingston folders (PROJECTS/2026/Kingston Sewer Separation: Photo by month, and UEL Drone Photos, 199 DJI stills from Oct 23 2026). Scanned ~1,000 thumbnails; downloaded 9 originals.
- Kingston hero is now the full-resolution drone still DJI_..._0876 (4032 px) instead of a video frame; kingston-aerial-top/-street replaced with full-res drone stills, new kingston-aerial-corner. New ground shots: kingston-trench-crew, kingston-shoring-crew, kingston-manholes (cropped to leave out a worker without a hard hat), kingston-trench-box, kingston-finished-road. All given the Nov 5 pro finish once.
- Skipped: paving-day shots (asphalt subcontractor crew), close-ups.
- Ideas: Google Earth "before" view with the sewer route drawn on, with Google attribution, next to the drone "after"; photos from others (school districts, GCs, cities) only with written permission and credit; short website video cut from the Kingston Video folder footage.

## Nov 6, 2026 — Kingston hero film (by hand)
- New 13 s looping film at the top of the Kingston project page, from real NSC drone material only: slow push-in on the full-res drone still, ~7 s of clean drone flight from NSC_Kingston_Sewer_Separation_v6_16x9.mp4 (the overlay-free stretch), slow glide over a straight-down drone still; crossfades and a seamless loop. Files: media/kingston-film-1080-av1.mp4 (3.9 MB) and kingston-film-720.mp4 (H.264, 6.2 MB).
- Template: projects can now have an optional heroVideo {mp4, av1} (admin: "Main video", advanced). The photo stays as the poster; the film loads after the page, fades in, and is skipped for reduced-motion and data-saver users.
- The 150 s v6 edit in the Kingston Video folder is mostly a 3D map model with labels, so it was not used beyond that. Raw drone clips (no text) would allow longer, sharper films.

## Nov 6, 2026 — hero films for six more projects (by hand)
- Looping hero films (11–14 s) built only from each project's own finished site photos (slow camera moves, dissolves, seamless loop): Guildford Park (tank, gwide2, tank3, mains), Queen Elizabeth (qe-exc, qe-manholes, qe-trench, qe-sidewalk), UBC (ubc-shoring, ubc-exc, ubc-machines, ubc-chamber), Agnes (agnes-excavator-loading, agnes-bulk-excavation, agnes-manholes), Manitoba Yard (manitoba-tanks, manitoba-excavator, manitoba-trench-drain), William Cook (cook-exc, cook-strip, cook-demo, cook-pad). Files media/<name>-film-1080-av1.mp4 and -720.mp4, 3–5 MB each (bitrate capped).
- Other projects have too few wide photos for a film; add more wide shots (or raw drone clips) first.
- Next ideas raised with Hamid: labelled cutaway illustrations of what is underground (Kingston first), Google Earth before/after sliders with attribution, Kingston corridor map from NSC's drone map, all-projects aerial map, Langley yard fleet line-up drone shoot, monthly drone flights per site, half-day pro photographer.

## Nov 6, 2026 — sharper Earthwork tile, NSC logo shine (by hand)
- Home "Earthwork & excavation" tile: replaced the soft gexc photo with agnes-excavator-loading (sharp, real NSC Kobelco with NSC logo) and linked the tile to Agnes Supportive Housing.
- New: images can carry logo {x, y, s}; a soft flash and star glint plays over a real NSC logo already in the photo every 5 s (off for reduced motion). Set on agnes-excavator-loading (boom logo) and nsc-cat-school (CAT boom logo) wherever they appear. Logos are never added to machines that do not carry one (many are rentals).
- Deploys: Vercel blocked every commit from goudarzi.hamid@gmail.com and neilsmithconstructionltd@gmail.com ("commit email could not be matched to a GitHub account"). Fixed by committing as the NSC GitHub account's own commit email (see CLAUDE.md).

## Nov 6, 2026 — Kingston "Under the street" cutaway (by hand)
- New labelled cutaway illustration (media/kingston-cutaway.svg, inline SVG with title/description, "Illustration, not to scale"): section across Kingston Road showing the new storm (250–450 mm) and sanitary (250–375 mm) mains, paired precast manholes, catch basin and storm lead, storm and sanitary services, water service, hydrant and watermain tie-in, curb, sidewalk and paving, and the replaced combined sewer. Numbered markers match an 8-item list built only from the project record.
- Template: projects can have an optional cutaway {svg, title, items} (admin: "Underground illustration", advanced). Good next candidates: Guildford Park (detention tank and flow control manholes), Queen Elizabeth (forcemain realignment), Brighouse (detention tank).

## Next ideas
- For big wide "hero" views of machinery, book a drone or pro photographer day on the largest active sites (Guildford Park, Kingston Road, Queen Elizabeth), or brief crews to shoot wide landscape shots from high ground.
- Ask Hamid which projects nsc-cat-school and nsc-fleet belong to, then add them to those project galleries with project-specific alt text.
- When new photos arrive, prefer wide, eye-level shots with crews and equipment; grade them with the same pipeline.
- Project pages are thin (~130–200 words): build fuller, factual summaries from existing details/scope/timeline; link to services and areas.
- Deepen the 7 specialty pages over time with more photos from their projects (galleries) and any new projects.
- School district page(s): SD36 Surrey, SD37 Delta, SD38 Richmond, SD40 New Westminster, SD41 Burnaby — only projects in the repo.
- Contact page is short (~120 words): add offices, hours, what to send for a bid, and FAQ.
- Careers page (~200 words): add what roles NSC hires for and how to apply, from existing content only.
- Add JobPosting descriptions once Hamid supplies them.
- Schools page already lists projects by district; a separate district page is probably not needed unless searches show demand.
