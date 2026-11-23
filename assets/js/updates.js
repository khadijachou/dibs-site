(function () {
  'use strict';
  var list=document.getElementById('all-rel');if(!list)return;
  var lang=document.documentElement.lang||'en',locale={en:'en-GB',fr:'fr-CA',es:'es-ES'}[lang]||'en-GB';
  var ui={
    en:{one:'release',many:'releases',latest:'Latest',big:'Big release',before:'Live now: v',after:' releases since '},
    fr:{one:'version',many:'versions',latest:'Plus récente',big:'Grande version',before:'En direct : v',after:' versions depuis le '},
    es:{one:'lanzamiento',many:'lanzamientos',latest:'Más reciente',big:'Lanzamiento principal',before:'Versión actual: v',after:' lanzamientos desde el '}
  }[lang];
  var filters=[].slice.call(document.querySelectorAll('.rf'));
  var state={mode:'all'};
  function date(s,long){var d=new Date(s+'T12:00:00Z');return isNaN(d)?s:d.toLocaleDateString(locale,
    {weekday:long?'long':undefined,day:'numeric',month:long?'long':'short',year:'numeric',timeZone:'UTC'});}
  function element(tag,cls,value){var x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x;}
  function displayFilter(){
    [].forEach.call(list.querySelectorAll('.day'),function(day){
      var visible=0;
      [].forEach.call(day.querySelectorAll('.rel'),function(row){
        row.hidden=state.mode==='big'&&!row.classList.contains('big');if(!row.hidden)visible++;
      });
      day.hidden=visible===0;
      var label=day.querySelector('.day-h span');
      if(label)label.textContent=visible+' '+(visible===1?ui.one:ui.many);
    });
  }
  filters.forEach(function(button){button.addEventListener('click',function(){
    state.mode=button.getAttribute('data-f');
    filters.forEach(function(other){other.setAttribute('aria-pressed',String(other===button));});
    displayFilter();
  });});
  function render(data){
    var days=new Map();
    data.all.forEach(function(row){if(!days.has(row.date))days.set(row.date,[]);days.get(row.date).push(row);});
    var frag=document.createDocumentFragment();
    days.forEach(function(rows,d){
      var day=element('li','day'),heading=element('p','day-h');
      var time=element('time','',date(d,true));time.dateTime=d;heading.appendChild(time);
      heading.appendChild(element('span','',rows.length+' '+(rows.length===1?ui.one:ui.many)));
      day.appendChild(heading);
      var ol=document.createElement('ol');
      rows.forEach(function(row){
        var li=element('li','rel'+(row.big?' big':''));li.dataset.big=row.big?'true':'false';
        var meta=element('div','rel-meta');meta.appendChild(element('span','up-tag','v'+row.v));
        if(row===data.all[0])meta.appendChild(element('span','new',ui.latest));
        if(row.big)meta.appendChild(element('span','bigtag',ui.big));li.appendChild(meta);
        if(row.big&&row.title)li.appendChild(element('h3','',row.title));
        var notes=document.createElement('ul');
        (row.items||[]).forEach(function(note){notes.appendChild(element('li','',note));});
        li.appendChild(notes);ol.appendChild(li);
      });day.appendChild(ol);frag.appendChild(day);
    });list.replaceChildren(frag);displayFilter();
  }
  function set(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
  function refresh(){
    fetch('/api/updates'+(lang==='en'?'':'?lang='+lang)).then(function(r){
      if(!r.ok)throw new Error('updates unavailable');return r.json();
    }).then(function(data){
      if(!data||!Array.isArray(data.all)||!Array.isArray(data.big))return;
      set('up-live',ui.before+data.live+' · '+data.releases+ui.after+date(data.firstDate,false));
      set('us-live','v'+data.live);set('us-rel',data.releases);set('us-big',data.big.length);
      set('us-days',Math.max(0,Math.floor((Date.now()-Date.parse(data.firstDate+'T00:00:00Z'))/86400000)));
      render(data);
    }).catch(function(){/* Keep complete localized build-time releases. */});
  }
  displayFilter();refresh();window.setInterval(refresh,60*60*1000);
}());
