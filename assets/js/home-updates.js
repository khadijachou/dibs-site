(function () {
  'use strict';
  var lang=document.documentElement.lang||'en',locale={en:'en-GB',fr:'fr-CA',es:'es-ES'}[lang]||'en-GB';
  var messages={en:{before:'Live now: v',after:' releases since '},
    fr:{before:'En direct : v',after:' versions depuis le '},
    es:{before:'Versión actual: v',after:' lanzamientos desde el '}}[lang];
  var rail=document.getElementById('up-rail'),live=document.getElementById('up-live');
  if(!rail||!window.fetch)return;
  function date(d){var x=new Date(d+'T12:00:00Z');return isNaN(x)?d:x.toLocaleDateString(locale,
    {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
  function element(tag,cls,value){var x=document.createElement(tag);if(cls)x.className=cls;if(value!=null)x.textContent=value;return x;}
  function refresh(){
    fetch('/api/updates'+(lang==='en'?'':'?lang='+lang)).then(function(r){
      if(!r.ok)throw new Error('updates unavailable');return r.json();
    }).then(function(data){
      if(!Array.isArray(data.big))return;
      if(live&&data.live&&data.releases)live.textContent=messages.before+data.live+' · '+data.releases+messages.after+date(data.firstDate);
      var content=document.createDocumentFragment();
      data.big.forEach(function(release){
        var li=element('li','up-rel');li.dataset.v=release.v;
        var top=element('div','up-top');top.appendChild(element('span','up-ver','v'+release.v));
        top.appendChild(element('span','up-date',date(release.date)));li.appendChild(top);
        li.appendChild(element('h4','',release.title||('Dibs '+release.v)));
        li.appendChild(element('p','',(release.items||[]).slice(0,2).join(' ')));
        content.appendChild(li);
      });
      rail.replaceChildren(content);
    }).catch(function(){/* Preserve localized static release history. */});
  }
  refresh();window.setInterval(refresh,60*60*1000);
}());
