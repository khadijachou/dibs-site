// Reads the app's own public release list (What's new) from its GitHub repository and hands the page
// the live version, the release count and every big release (x.y) with its What's new lines.
// No secret, no user data. Cached by Vercel for one hour.
const RAW = 'https://raw.githubusercontent.com/khadijachou/dibs/main/app/src/lib/';
const get = async (f) => {
  const r = await fetch(RAW + f, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(f + ' ' + r.status);
  return r.text();
};
// i18n.js holds en, then fr, then es: the nth match of a key is that language.
const LANGS = { en: 0, fr: 1, es: 2 };
const str = (src, key, nth = 0) => {
  const all = [...src.matchAll(new RegExp(key + ': "((?:[^"\\\\]|\\\\.)*)"', 'g'))];
  const m = all[nth] || all[0];
  if (!m) return null;
  try { return JSON.parse('"' + m[1] + '"'); } catch (e) { return null; }
};

module.exports = async (req, res) => {
  try {
    const nth = LANGS[String((req.query && req.query.lang) || 'en')] || 0;
    const [news, i18n] = await Promise.all([get('news.js'), get('i18n.js')]);
    const rows = [...news.matchAll(/\{\s*date:\s*'([\d-]+)',\s*key:\s*'(news_\d+)'(?:,\s*v:\s*'([\d.]+)')?/g)]
      .map((m) => ({ date: m[1], key: m[2], v: m[3] || null }))
      .filter((r) => r.v);
    if (!rows.length) throw new Error('shape');
    const big = rows
      .filter((r) => /^\d+\.\d+(\.0)?$/.test(r.v))
      .map((r) => ({ v: r.v.split('.').length === 3 ? r.v.replace(/\.0$/, '') : r.v, date: r.date, items: (str(i18n, r.key, nth) || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4) }));
    const lines = (k) => (str(i18n, k, nth) || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const all = rows.map((r) => ({ v: r.v, date: r.date, items: lines(r.key) }));
    const out = { live: rows[0].v, lastDate: rows[0].date, releases: rows.length, firstDate: rows[rows.length - 1].date, big, all };
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(out);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'unavailable' });
  }
};
