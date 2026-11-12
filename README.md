# dibs-site

The website for Dibs, a savings Mini App for Nimiq Pay.

Plain HTML and CSS, no build step. Hosted on Vercel. One small function, `api/stats.js`, reads the public Dibs totals and caches them for an hour so the Proof numbers stay current; it holds no secret and no user data.

- `index.html`: the landing page
- `privacy.html`, `terms.html`: legal pages
- `styles.css`: all styles
- `assets/`: logo, icons, fonts (self-hosted), screenshot, QR code of the app address

The app itself lives in another repository: https://github.com/khadijachou/dibs
The app's address is https://dibs-sepia.vercel.app and must not change.

Upkeep: after each app release, check that the screenshot, the numbers and the wording still match the app.

Fonts: Poppins and Inter, both under the SIL Open Font License 1.1, served from `assets/fonts/`.
