# Neil Smith Construction Ltd. website

## Files
- `index.html` is the home page (styles, scripts, logo and 3D project drawings built in)
- `markets.html`, `safety.html`, `about.html`, `careers.html`, `contact.html` are the corporate pages (Markets, Safety & Environment, About with leadership and where we work, Careers, Contact with bid / subcontractor / careers paths). All pages share one navigation and footer.
- `projects/index.html` is the Projects page: every project, grouped into Underway now, Richmond School District #38, other school districts, cities and public works, and commercial development
- `projects/<name>.html` is one page per project, with scope of work, client details and photos. Photos come from the OneDrive project folders. Where a project had no usable photos, a site drawing (marked "Drawing") or an illustration (marked "Illustration") is used instead.
- `assets/project.css` styles the project pages
- `media/` holds NSC project photos in two sizes (`-1280` for phones and laptops, `-2560` for large screens) and the videos. Hero film: `film-1440-av1.mp4` / `film-1440-hevc.mp4` for desktops, `film-1080-av1.mp4` for phones, with `film-720.mp4` (H.264) as the fallback for older browsers. The excavator strip uses `dig-av1.mp4` with `dig.mp4` as the fallback. The page picks the best format each browser can play.
- `nsc-logo.jpg` is the logo and browser tab icon

Photo rules: NSC crews only, everyone in hard hats and vests. Paving is done by our asphalt subcontractor, so their crews are not shown.

Keep the folders together. Links are relative, so the site works from any folder or domain.

## Publish with GitHub Pages
**Settings → Pages →** Source: *Deploy from a branch*, branch `master`, folder `/ (root)`, **Save**.
The site is live at `https://hamid-goudarzi.github.io/nsc-new-website-c/` a minute later.
