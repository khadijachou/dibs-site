'use strict';
const assert = require('node:assert/strict');
const snapshot = require('../data/updates-snapshot.json');
const endpoint = require('../api/updates.js');
const {parseNews,parseI18n,parseBrands,releaseData} = require('../lib/app-data.cjs');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const app = key => fs.readFileSync(path.join(root,'sources/app',key),'utf8');

async function test(){
  const pkg=JSON.parse(app('package.json'));
  const news=parseNews(app('news.js'));
  const dict=parseI18n(app('i18n.js'));
  const brands=parseBrands(app('brands.js'));
  assert.equal(pkg.version,'1.7.7');
  assert.equal(brands.length,33);
  assert.equal(new Set(brands.map(x=>x.chip)).size,6);
  for(const lang of ['en','fr','es']){
    const releases=releaseData(news,dict,lang);
    assert.equal(releases.length,62,lang);
    assert.equal(releases.filter(x=>x.big).length,6,lang);
    assert.equal(releases[0].v,'1.7.7',lang);
    assert.equal(releases.length,snapshot[lang].all.length,lang);
    assert.equal(snapshot[lang].big.length,6,lang);
    assert.ok(releases.filter(x=>x.big).every(x=>x.title),`Major titles missing in ${lang}`);
  }
  // Force network failure, so the Vercel handler proves that it uses the
  // bundled localized snapshot and returns the correct language.
  const originalFetch=global.fetch;
  global.fetch=async()=>{throw Error('offline test');};
  try{
    for(const lang of ['en','fr','es']){
      const sent={};
      const res={setHeader(k,v){sent[k]=v;},status(c){sent.code=c;return this;},json(v){sent.body=v;return this;}};
      await endpoint({query:{lang}},res);
      assert.equal(sent.code,200,lang);
      assert.equal(sent.body.live,'1.7.7',lang);
      assert.equal(sent.body.releases,62,lang);
      assert.equal(sent.body.all.length,62,lang);
      assert.equal(sent.body.big.length,6,lang);
      assert.equal(sent.body.big[0].title,snapshot[lang].big[0].title,lang);
    }
  } finally {global.fetch=originalFetch;}
  console.log('API tests passed: three locale snapshots, 62 versioned releases, six major updates, 33 brands, six categories.');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
