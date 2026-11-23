# Dibs website

The public website for Dibs, a savings Mini App for Nimiq Pay.

**Website:** https://calldibs-ashen.vercel.app/  
**App:** https://dibs-sepia.vercel.app/ (separate app; do not change its address).

## Site structure

- `index.html`, `how.html`, `catalog.html`, `safety.html`, `updates.html`, `litepaper.html`, `about.html`, `faq.html`, `privacy.html`, and `terms.html`: generated English pages at the repository root.
- `fr/` and `es/`: the same ten pages in French and Spanish, respectively. The page switcher and footer language links keep the reader on the equivalent page. No automatic language redirect is used.
- `templates/en/`, `templates/fr/`, `templates/es/`: source HTML templates for all three languages. Edit templates, not generated HTML.
- `build.mjs`: dependency-free Node.js 18+ generator for all 30 HTML pages and the bundled release-data snapshot.
- `lib/app-data.cjs`: reads the app's official news, language dictionaries and brand catalog.
- `sources/app/`: approved v1.7.7 reference snapshot used if the public app repository is unavailable.
- `data/stats-snapshot.json`: precise dated public-statistics fallback (November 22, 2026). Live figures are still read from `/api/stats` in the browser.
- `data/updates-snapshot.json`: localized fallback for the hourly live release API; major releases and titles are derived from the app's official release data.
- `api/stats.js`, `api/updates.js`: Vercel serverless functions. `/api/updates` supports `?lang=fr` and `?lang=es`.
- `assets/screens/`: the owner's real v1.7.7 screenshots, resized and converted to WebP, not redrawn.
- `assets/logos/`: approved official brand assets and existing website assets. The app address and logos are preserved.
- `assets/js/`: localized live statistics, homepage releases and all-releases rendering.
- `styles.css` and `litepaper.css`: existing design preserved; Litepaper styling unchanged. Fonts are self-hosted under `assets/fonts/`.
- `assets/og-dibs-v177.png`: social card for the three languages, using the approved wordmark.

## Build

From the repository root:

```sh
node build.mjs
node -e "require('./api/updates.js')"
python tools/audit_site.py
node tools/test_api.cjs
```

The generator fetches `app/package.json`, `app/src/lib/news.js`, `app/src/lib/i18n.js`, and `app/src/lib/brands.js` from the public Dibs app source, then regenerates all three locales. If the source is temporarily inaccessible, the bundled reference is used.

To reproduce the approved version with no network access:

```sh
node build.mjs --offline
```

**Do not run an automatic build as part of Vercel deployment.** The generated HTML is committed and served directly from the repository root. No npm dependencies, Vercel configuration changes, secrets, trackers, or external runtime fonts/scripts are required. When the app releases a newer version, regenerate all pages, review the copy and screenshots, and commit the generated HTML and updated snapshots together.

## Translation editing

English is the approved source copy. French uses Québec-style **vous** and guillemets; Spanish uses a neutral register. App release notes and major-update summaries come directly from the app's French and Spanish `i18n.js` dictionaries.

To change page copy, edit `templates/en/` and adjust the corresponding entries in `translations/fr.tsv` and `translations/es.tsv`. These indexed translation catalogs refer to `translations/english-text-inventory.txt`. Page metadata and image alternatives are translated by `translations/attrs-fr.tsv` and `translations/attrs-es.tsv`.

The optional one-time authoring helper `python tools/localize_templates.py` regenerates the localized templates from the English source. It uses BeautifulSoup (Python authoring-time only), **not** the website's Node.js generator. After using it, run `node build.mjs --offline`, inspect the generated text, and run the audits. Never replace an official app screen with a mockup.

## Copy and accessibility rules

Preserve the site design and approved text. No named countries, implied sponsorship, guaranteed staking return, urgency claims, changed wallet addresses, fabricated statistics, app-screen redraws, or third-party runtime trackers. Rewards are not guaranteed. The normal release wait is **12 to 24 hours**. One main heading per page, keyboard focus styles, localized screenshot alt text, and reduced-motion preferences must continue to work. Check a real browser at narrow mobile widths before deploying any future visual changes.

Fonts: Poppins and Inter, under the SIL Open Font License 1.1, served locally from `assets/fonts/`.
