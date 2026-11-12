// Reads the public Dibs numbers (the same ones shown on "Dibs in numbers") and hands them to the page.
// No secret, no user data: the source is a public, anonymous total. Cached by Vercel for one hour.
const SOURCE = 'https://dibs-qi5y.onrender.com/api/stats';
const KEYS = ['people', 'savers', 'goalsCreated', 'goalsActive', 'goalsReached', 'cardsBought', 'nimAddedVerified', 'updatedAt'];

module.exports = async (req, res) => {
  try {
    const r = await fetch(SOURCE, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) throw new Error('source ' + r.status);
    const j = await r.json();
    const out = {};
    for (const k of KEYS) out[k] = j[k] == null ? null : j[k];
    if (typeof out.people !== 'number' || typeof out.nimAddedVerified !== 'number') throw new Error('shape');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(out);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'unavailable' });
  }
};
