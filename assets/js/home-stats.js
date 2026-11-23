(function () {
  'use strict';
  var lang = document.documentElement.lang || 'en';
  var locale = {en:'en-US',fr:'fr-CA',es:'es-ES'}[lang] || 'en-US';
  var dateLocale = {en:'en-GB',fr:'fr-CA',es:'es-ES'}[lang] || 'en-GB';
  var ui = {
    en:{ratio:' of ',live:'Live, updated hourly',date:'As of '},
    fr:{ratio:' sur ',live:'En direct, mis à jour toutes les heures',date:'En date du '},
    es:{ratio:' de ',live:'En vivo, actualizado cada hora',date:'Datos del '}
  }[lang] || {ratio:' of ',live:'Live, updated hourly',date:'As of '};
  var els = [].slice.call(document.querySelectorAll('[data-stat]'));
  if (!els.length) return;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var format = function (n) {return Number(n).toLocaleString(locale,{maximumFractionDigits:5});};
  els.forEach(function (el) {
    // data-raw holds an unformatted number so comma/space/dot grouping never breaks locales.
    el._to = Number(el.getAttribute('data-raw')) || 0;
    el._seen = false;
  });
  function animate(el) {
    if (still) { el.textContent = format(el._to); return; }
    var started=null, target=el._to;
    function frame(now) {
      if (started===null)started=now;
      var progress=Math.min(1,(now-started)/1000);
      el.textContent=format(Math.round(target*(1-Math.pow(1-progress,3))));
      if(progress<1&&target===el._to)requestAnimationFrame(frame);
      else el.textContent=format(el._to);
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window && !still) {
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(item){
        if(item.isIntersecting){item.target._seen=true;animate(item.target);observer.unobserve(item.target);}
      });
    },{threshold:0.25});
    els.forEach(function(el){observer.observe(el);});
  }else{
    els.forEach(function(el){el._seen=true;});
  }
  if(!window.fetch)return;
  function refresh() {
    fetch('/api/stats').then(function(r){if(!r.ok)throw new Error('stats unavailable');return r.json();})
    .then(function(data){
      if(Number.isFinite(data.savers)&&Number.isFinite(data.people)){
        [].forEach.call(document.querySelectorAll('[data-text="ratio"]'),function(el){
          el.textContent=format(data.savers)+ui.ratio+format(data.people);
        });
      }
      els.forEach(function(el){
        var value=data[el.getAttribute('data-stat')];
        if(typeof value!=='number'||!Number.isFinite(value)||value<0)return;
        el._to=value;
        if(el._seen||still)el.textContent=format(value);
      });
      var live=document.getElementById('stats-live'),badge=document.getElementById('stats-badge');
      if(live&&badge){live.classList.add('on');badge.textContent=ui.live;}
      var asof=document.getElementById('stats-asof'),date=data.updatedAt&&new Date(data.updatedAt);
      if(asof&&date&&!isNaN(date))asof.textContent=ui.date+date.toLocaleDateString(dateLocale,
        {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.';
    }).catch(function(){/* Keep exact dated fallback. */});
  }
  refresh();window.setInterval(refresh,60*60*1000);
}());
