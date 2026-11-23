/**
 * Dibs website generator. Node.js 18+, no dependencies or build service.
 *
 * node build.mjs           fetch main branch, fall back to bundled references
 * node build.mjs --offline use reviewed v1.7.7 reference only
 *
 * Writes 10 localized HTML files in each of: /, /fr, /es.
 * All generated files are committed to the repository for static Vercel hosting.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseNews, parseI18n, parseBrands, releaseData } = require('./lib/app-data.cjs');
// Approved inline SVG artwork copied unchanged from the original supplied website.
const SITE_ICONS = require('./data/site-original-icons.json');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RAW = 'https://raw.githubusercontent.com/khadijachou/dibs/main/';
const INPUTS = { package:'app/package.json', news:'app/src/lib/news.js',
  i18n:'app/src/lib/i18n.js', brands:'app/src/lib/brands.js' };
const LANGS = ['en','fr','es'];
const ORDER = ['electronics','games','streaming','travel','shopping','food'];
const LABELS = {
  en: { electronics:'Electronics', games:'Games', streaming:'Streaming', travel:'Travel and rides', shopping:'Shopping', food:'Food and coffee' },
  fr: { electronics:'Électronique', games:'Jeux', streaming:'Diffusion en continu', travel:'Voyages et transport', shopping:'Magasinage', food:'Restauration et café' },
  es: { electronics:'Electrónica', games:'Juegos', streaming:'Streaming', travel:'Viajes y transporte', shopping:'Compras', food:'Comida y café' }
};
const UI = {
  en:{all:'All', brands:'brands', seeAll:'See all brands', seeAllSub:'Search and filter the full catalog.',
    new:'Latest', big:'Big release', one:'release', many:'releases',
    examples: {electronics:'Best Buy, Currys, MediaMarkt and more', games:'Steam, Fortnite, Valorant and more',
      streaming:'Netflix, Disney and Twitch',travel:'Airbnb, Uber, Bolt and more',shopping:'Amazon, Apple, H&M and Nike',food:'Uber Eats, Starbucks, DoorDash and Burger King'},
    alt:{currys:'Electronics and home tech at Currys.',mediamarkt:'Electronics and home tech at MediaMarkt.',fnacdarty:'Electronics and entertainment at FNAC Darty.',electrodepot:'Electronics and appliances at Electro Dépôt.',slot:'Phones and electronics at SLOT.',samsung:'Samsung devices and accessories.'}},
  fr:{all:'Toutes',brands:'marques',seeAll:'Voir toutes les marques',seeAllSub:'Recherchez et filtrez le catalogue complet.',
    new:'Plus récente',big:'Grande version',one:'version',many:'versions',
    examples:{electronics:'Best Buy, Currys, MediaMarkt et plus',games:'Steam, Fortnite, Valorant et plus',streaming:'Netflix, Disney et Twitch',travel:'Airbnb, Uber, Bolt et plus',shopping:'Amazon, Apple, H&M et Nike',food:'Uber Eats, Starbucks, DoorDash et Burger King'},
    alt:{bolt:'Transport et repas avec Bolt.',disney:'Abonnements Disney+ et divertissements Disney.',handm:'Vêtements H&M, en magasin et en ligne.',nike:'Chaussures, vêtements et accessoires Nike.',burgerking:'Repas dans les restaurants Burger King participants.'}},
  es:{all:'Todas',brands:'marcas',seeAll:'Ver todas las marcas',seeAllSub:'Busca y filtra el catálogo completo.',
    new:'Más reciente',big:'Lanzamiento principal',one:'lanzamiento',many:'lanzamientos',
    examples:{electronics:'Best Buy, Currys, MediaMarkt y más',games:'Steam, Fortnite, Valorant y más',streaming:'Netflix, Disney y Twitch',travel:'Airbnb, Uber, Bolt y más',shopping:'Amazon, Apple, H&M y Nike',food:'Uber Eats, Starbucks, DoorDash y Burger King'},
    alt:{bolt:'Viajes y comida con Bolt.',disney:'Suscripciones Disney+ y entretenimiento Disney.',handm:'Ropa H&M, en tienda y en línea.',nike:'Calzado, ropa y accesorios Nike.',burgerking:'Comida en restaurantes Burger King participantes.'}}
};
const locale = {en:'en-GB',fr:'fr-CA',es:'es-ES'};
const esc = v => String(v ?? '').replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const offline = process.argv.includes('--offline') || process.env.DIBS_OFFLINE === '1';
const nfmt = (number,lang) => new Intl.NumberFormat(locale[lang], { maximumFractionDigits: 5 }).format(number);
function fmtDate(value, lang, long=false) {
  const options = {day:'numeric',month:long?'long':'short',year:'numeric',timeZone:'UTC'};
  if(long)options.weekday='long';
  return new Intl.DateTimeFormat(locale[lang],options).format(new Date(`${value.slice(0,10)}T12:00:00Z`));
}
async function readInput(key) {
  const filename=key==='package'?'package.json':`${key}.js`;
  if(!offline)try {
    const response=await fetch(RAW+INPUTS[key],{signal:AbortSignal.timeout(3500)});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    return await response.text();
  }catch(e){console.warn(`Using bundled ${filename}: ${e.message}`);}
  return fs.readFile(path.join(ROOT,'sources','app',filename),'utf8');
}
function daysSince(iso){return Math.max(0,Math.floor((Date.now()-Date.parse(`${iso.slice(0,10)}T00:00:00Z`))/86400000));}
function replaceBlock(html,key,value){return html.replace(new RegExp(`<!-- BUILD:${key} -->[\\s\\S]*?<!-- /BUILD:${key} -->`,'g'),
  `<!-- BUILD:${key} -->\n${value}\n<!-- /BUILD:${key} -->`);}
function iconFor(brand){
  const image=(brand.logo||'').split('/').pop();
  const other={disney:'disney.webp',bestbuy:'bestbuy.webp',bolt:'bolt.webp',amazon:'amazon.webp',nintendo:'nintendo.webp',flightgift:'flightgift.webp',xbox:'xbox.webp'};
  return image || other[brand.key] || null;
}
function logoTile(brand,lang,small=false){
  const image=iconFor(brand),bg=brand.logoPlate==='fill'?'#FFFFFF':brand.logoPlate||'#FFFFFF';
  const css=`b-logo${small?' sm':''}${image?' contain':''}`;
  const prefix=lang==='en'?'assets/':'../assets/';
  if(image)return `<span class="${css}" style="background:${esc(bg)}"><img alt="" loading="lazy" width="52" height="52" src="${prefix}logos/${esc(image)}"></span>`;
  // Some official app brands have no logo file. Reuse the icon that already
  // appeared on the supplied website, rather than showing a fake CARD label.
  const original = SITE_ICONS.brandIcons[brand.key];
  if(original)return small ? original.replace('class="b-logo"','class="b-logo sm"') : original;
  // Future brands: the app's own letter-tile is a neutral fallback, not a logo.
  const tile=brand.tile||{};
  const safeColor=(value,fallback)=>/^#[0-9a-fA-F]{3,8}$/.test(value||'')?value:fallback;
  return `<span class="${css} b-letter" aria-hidden="true" style="background:${safeColor(tile.bg,'#36323F')};color:${safeColor(tile.fg,'#FFFFFF')}">${esc(tile.letter||brand.name?.[0]||'?')}</span>`;
}
function aboutBrand(b,lang,dict,enDescriptions){
  if(UI[lang].alt[b.key])return UI[lang].alt[b.key];
  if(lang==='en')return enDescriptions[b.key]||dict.en[`brand_about_${b.key}`]||`Gift card for ${b.name}.`;
  const about=dict[lang][`brand_about_${b.key}`];
  if(!about)throw Error(`Missing ${lang} catalog description for ${b.key}`);
  return about;
}
function catalogRows(brands,lang,dict,enDescriptions){
  return brands.map(b=>`<li class="brand" data-cat="${esc(b.chip)}" data-name="${esc(b.name.toLowerCase())}">
   ${logoTile(b,lang)}<span class="b-main"><strong>${esc(b.name)}</strong><span class="b-about">${esc(aboutBrand(b,lang,dict,enDescriptions))}</span></span><span class="b-tag">${esc(LABELS[lang][b.chip])}</span></li>`).join('\n');
}
function categoryTabs(counts,lang){
  return ['all',...ORDER].map((key,i)=>`<button type="button" class="chip" data-cat="${key}" aria-pressed="${i===0?'true':'false'}">${esc(key==='all'?UI[lang].all:LABELS[lang][key])}<span class="chip-count">${key==='all'?Object.values(counts).reduce((a,b)=>a+b,0):counts[key]||0}</span></button>`).join('\n');
}
function categoryCards(brands,counts,lang){
  const icons=category=>brands.filter(b=>b.chip===category).slice(0,3).map(b=>logoTile(b,lang,true)).join('');
  const cards=ORDER.map(key=>`<li><a class="cc" href="catalog.html#${key}"><span class="cc-top">${SITE_ICONS.categoryIcons[key]}<span class="cc-n">${counts[key]}</span></span><span class="cc-stack" aria-hidden="true">${icons(key)}</span><strong>${esc(LABELS[lang][key])}</strong><span class="cc-ex">${esc(UI[lang].examples[key])}</span><span class="cc-go" aria-hidden="true">→</span></a></li>`);
  cards.push(`<li class="cc-all-li"><a class="cc cc-all" href="catalog.html"><span class="cc-n">${brands.length}</span><strong>${esc(UI[lang].seeAll)}</strong><span class="cc-ex">${esc(UI[lang].seeAllSub)}</span><span class="cc-go" aria-hidden="true">→</span></a></li>`);
  return cards.join('\n');
}
function homeRail(releases,lang){
  return releases.filter(r=>r.big).map(r=>`<li class="up-rel" data-v="${esc(r.v)}"><div class="up-top"><span class="up-ver">v${esc(r.v)}</span><span class="up-date">${esc(fmtDate(r.date,lang))}</span></div><h4>${esc(r.title||`Dibs ${r.v}`)}</h4><p>${esc(r.items.slice(0,2).join(' '))}</p></li>`).join('\n');
}
function releaseDays(releases,lang){
  const grouped=new Map();
  for(const r of releases){if(!grouped.has(r.date))grouped.set(r.date,[]);grouped.get(r.date).push(r);}
  return [...grouped].map(([date,rows])=>`<li class="day"><p class="day-h"><time datetime="${esc(date)}">${esc(fmtDate(date,lang,true))}</time><span>${rows.length} ${esc(rows.length===1?UI[lang].one:UI[lang].many)}</span></p><ol>${rows.map(r=>`<li class="rel${r.big?' big':''}" data-big="${r.big?'true':'false'}"><div class="rel-meta"><span class="up-tag">v${esc(r.v)}</span>${r===releases[0]?`<span class="new">${esc(UI[lang].new)}</span>`:''}${r.big?`<span class="bigtag">${esc(UI[lang].big)}</span>`:''}</div>${r.big&&r.title?`<h3>${esc(r.title)}</h3>`:''}<ul>${r.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ol></li>`).join('\n');
}
async function main(){
  const [pSrc,nSrc,iSrc,bSrc,stats,enDescriptions]=await Promise.all([
    readInput('package'),readInput('news'),readInput('i18n'),readInput('brands'),
    fs.readFile(path.join(ROOT,'data','stats-snapshot.json'),'utf8').then(JSON.parse),
    fs.readFile(path.join(ROOT,'data','brand-descriptions.en.json'),'utf8').then(JSON.parse)
  ]);
  const pkg=JSON.parse(pSrc),news=parseNews(nSrc),dict=parseI18n(iSrc),brands=parseBrands(bSrc);
  const releases=Object.fromEntries(LANGS.map(lang=>[lang,releaseData(news,dict,lang)]));
  if(pkg.version!==releases.en[0].v)throw Error(`Package/news mismatch: ${pkg.version} / ${releases.en[0].v}`);
  const categories=[...new Set(brands.map(b=>b.chip))];
  if(!ORDER.every(c=>categories.includes(c)))throw Error('Untranslated catalog category');
  const counts=Object.fromEntries(categories.map(c=>[c,brands.filter(b=>b.chip===c).length]));
  const apiView=rows=>({live:rows[0].v,lastDate:rows[0].date,
    firstDate:[...rows].map(r=>r.date).sort()[0],releases:rows.length,big:rows.filter(r=>r.big),all:rows});
  await fs.writeFile(path.join(ROOT,'data','updates-snapshot.json'),JSON.stringify(Object.fromEntries(LANGS.map(l=>[l,apiView(releases[l])])),null,2)+'\n');
  const launch=[...releases.en].map(r=>r.date).sort()[0];
  for(const lang of LANGS){
    const tdir=path.join(ROOT,'templates',lang), files=(await fs.readdir(tdir)).filter(f=>f.endsWith('.html'));
    if(files.length!==10)throw Error(`Expected 10 ${lang} templates, found ${files.length}`);
    const faqTemplate=await fs.readFile(path.join(tdir,'faq.html'),'utf8');
    const faqCount=(faqTemplate.match(/<details class="qa"/g)||[]).length;
    const textRatio=lang==='fr'?' sur ':lang==='es'?' de ':' of ';
    const vars={
      LIVE_VERSION:pkg.version,RELEASE_COUNT:releases[lang].length,BRAND_COUNT:brands.length,
      CATEGORY_COUNT:categories.length,BIG_RELEASE_COUNT:releases[lang].filter(r=>r.big).length,
      DAYS_SINCE_LAUNCH:daysSince(launch),FAQ_COUNT:faqCount,LAUNCH_DATE:fmtDate(launch,lang),
      STATS_DATE:fmtDate(stats.updatedAt,lang),STAT_NIM:nfmt(stats.nimAddedVerified,lang),
      STAT_PEOPLE:nfmt(stats.people,lang),STAT_SAVERS:nfmt(stats.savers,lang),
      STAT_CREATED:nfmt(stats.goalsCreated,lang),STAT_ACTIVE:nfmt(stats.goalsActive,lang),
      STAT_REACHED:nfmt(stats.goalsReached,lang),STAT_CARDS:nfmt(stats.cardsBought,lang),
      STAT_RATIO:`${nfmt(stats.savers,lang)}${textRatio}${nfmt(stats.people,lang)}`,
      ELECTRONICS_COUNT:counts.electronics,
      RAW_NIM:stats.nimAddedVerified,RAW_PEOPLE:stats.people,RAW_SAVERS:stats.savers,
      RAW_CREATED:stats.goalsCreated,RAW_ACTIVE:stats.goalsActive,RAW_REACHED:stats.goalsReached,RAW_CARDS:stats.cardsBought
    };
    const blocks={
      'HOME-RELEASES':homeRail(releases[lang],lang),
      'ALL-RELEASES':releaseDays(releases[lang],lang),
      'BRANDS':catalogRows(brands,lang,dict,enDescriptions),
      'CATEGORY-TABS':categoryTabs(counts,lang),
      'HOME-CATEGORIES':categoryCards(brands,counts,lang)
    };
    const outdir=lang==='en'?ROOT:path.join(ROOT,lang);
    await fs.mkdir(outdir,{recursive:true});
    for(const file of files){
      let html=await fs.readFile(path.join(tdir,file),'utf8');
      for(const [k,v] of Object.entries(blocks))html=replaceBlock(html,k,v);
      html=html.replace(/\{\{([A-Z_]+)\}\}/g,(_all,key)=>{
        if(!(key in vars))throw Error(`Undefined ${lang}/${file} token: ${key}`);
        return esc(vars[key]);
      });
      if(/\{\{[A-Z_]+\}\}/.test(html))throw Error(`Unresolved token: ${lang}/${file}`);
      await fs.writeFile(path.join(outdir,file),html,'utf8');
    }
    console.log(`Built ${files.length} ${lang} pages: v${pkg.version}, ${releases[lang].length} releases, ${brands.length} brands / ${categories.length} categories, ${daysSince(launch)} days since launch`);
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
