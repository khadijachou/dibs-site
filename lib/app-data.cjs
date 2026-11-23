'use strict';
const vm = require('node:vm');

// Only the public, data-only literals are evaluated, inside an empty sandbox.
// The app's import statements, UI code and other exports are never evaluated.
function literal(source, marker, end) {
  const start = source.indexOf(marker);
  if (start < 0) throw Error(`Source missing ${marker}`);
  const stop = source.indexOf(end, start + marker.length);
  if (stop < 0) throw Error(`Source missing terminator for ${marker}`);
  const expression = source.slice(start + marker.length, stop + end.length).trim();
  return vm.runInNewContext(`(${expression})`, Object.create(null), { timeout: 250 });
}
function parseNews(source) {
  const entries = literal(source, 'export const NEWS = ', '\n]') ;
  return entries;
}
function parseBrands(source) {
  return literal(source, 'export const BRANDS = ', '\n]');
}
function parseI18n(source) {
  const start = source.indexOf('const en = {');
  const end = source.indexOf('export const DICTS', start);
  if (start < 0 || end < 0) throw Error('i18n language dictionaries not found');
  return vm.runInNewContext(source.slice(start, end).replace(/\bconst (en|fr|es)\s*=/g, 'var $1 =') + ';\n({ en, fr, es })', Object.create(null), { timeout: 500 });
}
function normalizedNotes(key, lang, value) {
  // Website rule: never print country names. One historical release names account regions.
  // Keep the feature as released but use a region-neutral sentence on the public website.
  if (key === 'news_3') {
    const generic = {
      en: 'Choose the version of a card that works with your account. Check the shop\'s notes before you pick.',
      fr: 'Choisissez une carte compatible avec votre compte. Vérifiez les indications de la boutique.',
      es: 'Elige una tarjeta compatible con tu cuenta. Revisa las indicaciones de la tienda.'
    };
    const lines = String(value || '').split('\n');
    lines[0] = generic[lang] || generic.en;
    return lines.join('\n');
  }
  return String(value || '');
}
function releaseData(news, dict, lang='en') {
  const strings = dict[lang] || dict.en;
  const rows = news.filter(e => e && e.v && e.key).map(e => {
    const notes = normalizedNotes(e.key, lang, strings[e.key]);
    if (!notes) throw Error(`Missing ${lang} release note: ${e.key}`);
    return { v: String(e.v), date: e.date, key: e.key, big: e.big === true,
      title: e.sum ? String(strings[e.sum] || '').replace(/\{n\}/g, String(e.n || '')) : null,
      items: notes.split('\n').map(x=>x.trim()).filter(Boolean) };
  });
  if (!rows.length) throw Error('Empty versioned release history');
  return rows;
}
module.exports = { parseNews, parseBrands, parseI18n, releaseData };
