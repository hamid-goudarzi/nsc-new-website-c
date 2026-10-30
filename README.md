# Neil Smith Construction Ltd. website

Live site: <https://www.neilsmithconstruction.com> · Admin: <https://www.neilsmithconstruction.com/admin/>

A fast static website (built with [Astro](https://astro.build), hosted on Vercel) with its own admin.
Staff sign in with email and password, edit pages, projects, jobs and photos, and click **Save**.
Each save is stored as a commit in this GitHub repo and the live site rebuilds itself in about a minute.
There is no outside content service: the content, photos and full history all live in this repo.

## How it fits together

```
content/            all website text, as one JSON file per item (edited through /admin)
  home/ page/ project/ market/ person/ job/ projectsPage/ siteSettings/
public/media/       photos (every photo at 1280 px and 2560 px wide, WebP) and videos
public/admin/       the admin app (plain JavaScript; forms are defined in schema.js)
public/assets/      site styles and scripts
api/admin.js        the admin's server side on Vercel: sign-in, users, saving to GitHub
src/pages/          page templates (home, pages built from blocks, projects, sitemap, llms.txt …)
src/components/     shared parts: navigation, footer, page blocks, the "Where we work" map
src/lib/            loading content, image and text helpers, search-engine structured data
scripts/            build check, and a local server for testing the admin offline
.admin/users.enc    admin accounts (passwords hashed with scrypt, file encrypted with AES-256-GCM)
```

Page addresses never change shape: `about.html`, `projects/<name>.html`, so old links keep working.

## Settings in Vercel (Project → Settings → Environment Variables)

| Name | What it is |
| --- | --- |
| `GITHUB_TOKEN` | A fine-grained GitHub token for this repo only, with **Contents: Read and write**. Lets the admin save. |
| `ADMIN_SECRET` | 32+ random characters. Encrypts the user list and signs sign-in cookies. **Never change it** (everyone would be locked out). Keep a copy in the company password manager. |
| `ADMIN_SETUP_CODE` | Any code, used once to create the first owner account at `/admin`. |
| `GITHUB_BRANCH` | Optional. Defaults to the branch the deployment was built from. |

The GitHub token expires on the date chosen when it was made. Before it does, create a new one and
replace `GITHUB_TOKEN` in Vercel, then redeploy. Saving in the admin stops working if it expires; the website itself keeps running.

## Search engines and AI assistants

Built in and updated automatically on every save:

- `sitemap.xml` with every page, project and its photos; `robots.txt` that welcomes Google, Bing and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others) and keeps them out of `/admin`.
- `llms.txt` and `llms-full.txt`: plain-text company profile for AI assistants (see llmstxt.org). Edit the summary in **Admin → Site settings → Summary for AI assistants**.
- schema.org structured data: GeneralContractor organisation (address, phone, area served, COR), breadcrumbs, project pages, the projects list, and JobPosting for jobs that have a full description.
- Per-page search title and description, canonical links, Open Graph and Twitter cards for link previews.
- Google Search Console and Bing verification codes go in **Admin → Site settings**. After verifying, submit `https://www.neilsmithconstruction.com/sitemap.xml` in both.

## Keeping it healthy

- Every push is built by the **Check site** workflow (`.github/workflows/check.yml`). The build also runs
  `scripts/check-build.mjs`, which fails if any page links to a missing page or photo, so Vercel keeps the last good version online.
- Dependabot (`.github/dependabot.yml`) opens a pull request once a month when Astro or other packages have updates. Each one gets a Vercel preview link: check it, then merge.
- Commits starting with `[media]` (photo uploads) or `[admin]` (user changes) don't trigger a rebuild (`ignoreCommand` in `vercel.json`); the next content save publishes them.

## Working on the code

```bash
npm ci
npm run dev            # site at http://localhost:4321 (no admin)
npm run build          # what Vercel runs: build + link check

# The full site and admin on your computer, saving to this folder instead of GitHub:
npm run build
ADMIN_SECRET=local-test-secret-local-test-secret ADMIN_SETUP_CODE=1234 npm run admin:local
# then open http://localhost:4321/admin/ and create an owner with setup code 1234
```

To add a field to a form, add it to `public/admin/schema.js` and use it in the matching template in `src/`.
To add a new kind of page section, add it to `BLOCKS` in `schema.js` and render it in `src/components/Blocks.astro`.

## Content rules

NSC crews only, everyone in hard hats and vests. Paving is done by our asphalt subcontractor, so their crews are not shown.
No invented figures, awards or partnerships, and no "jobs on record" counts.
