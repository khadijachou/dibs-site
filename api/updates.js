'use strict';
// Reads public app release data. Vercel stays in its original no-build setup.
const pinned = require('../data/updates-snapshot.json');
const { parseNews, parseI18n, releaseData } = require('../lib/app-data.cjs');
const RAW = 'https://raw.githubusercontent.com/khadijachou/dibs/main/app/src/lib/';
async function source(name) {
  const r = await fetch(RAW + name, {signal: AbortSignal.timeout(7000)});
  if (!r.ok) throw Error(`HTTP ${r.status}`);
  return r.text();
}
module.exports = async (req, res) => {
  const lang = ['en', 'fr', 'es'].includes(req.query?.lang) ? req.query.lang : 'en';
  try {
    const [newsSource, i18nSource] = await Promise.all([source('news.js'), source('i18n.js')]);
    const rows = releaseData(parseNews(newsSource), parseI18n(i18nSource), lang);
    const firstDate = [...rows].map(r => r.date).sort()[0];
    const view = r => ({ v:r.v, date:r.date, big:r.big, title:r.title, items:r.items });
    const all = rows.map(view);
    const big = rows.filter(r => r.big).map(view);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ live:rows[0].v, lastDate:rows[0].date, firstDate,
      releases:rows.length, big, all });
  } catch (error) {
    console.warn('Using bundled public release snapshot:', error.message);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(pinned[lang]);
  }
};
