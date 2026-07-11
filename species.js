/* species.js — the standalone "dex entry" (care sheet) for one plant. Reads the slug from
   ?s=<slug>, fetches species/<slug>/species.json, and renders the sheet. The photo hero reuses
   the reel + lightbox from reel.js verbatim (the hero is just a bigger .plate). */

const ICONS = {
  light:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  water:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
  soil:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h18M5 15l1 5h12l1-5M8 15V9M12 15V7M16 15v-5"/></svg>',
  temperature:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0z"/></svg>',
  dormancy:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/></svg>',
  feeding:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V11M12 11c-2-1-3-3-3-5.5C11 6 12 8 12 11zM12 11c2-1 3-3 3-5.5C13 6 12 8 12 11z"/></svg>',
  potting:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h14l-1.5 11h-11L5 9zM4 9l1-3h14l1 3"/></svg>',
  propagation:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8 16 16 8M6 15.5V9a3 3 0 0 1 3-3h3"/></svg>',
  bloom:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 9c0-3 1.5-4.5 0-6-1.5 1.5 0 3 0 6zM12 15c0 3-1.5 4.5 0 6 1.5-1.5 0-3 0-6zM9 12c-3 0-4.5 1.5-6 0 1.5-1.5 3 0 6 0zM15 12c3 0 4.5-1.5 6 0-1.5 1.5-3 0-6 0z"/></svg>',
  troubles:'<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'
};
const CARE_FIELDS = [
  ['light','Light'], ['water','Water'], ['soil','Soil'], ['temperature','Temperature &amp; hardiness'],
  ['dormancy','Dormancy &amp; seasons'], ['feeding','Feeding'], ['potting','Potting &amp; repotting'],
  ['propagation','Propagation'], ['bloom','Flowering'], ['troubles','Common problems']
];

function glanceHTML(p){
  const rows = [
    ['Light', p.light], ['Water', p.water], ['Soil', p.soil],
    ['Growth season', p.growth_season ? p.growth_season + '-grower' : ''],
    ['Size', p.size], ['Hardiness', p.hardiness], ['Toxicity', p.toxicity],
    ['In collection since', p.acquired]
  ].filter(function(r){ return r[1]; });
  return '<div class="glance">' + rows.map(function(r){ return '<dl class="g"><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></dl>'; }).join('') + '</div>';
}
function careHTML(p){
  const care = p.care || {};
  const items = CARE_FIELDS.filter(function(f){ return care[f[0]]; }).map(function(f){
    return '<div class="care-item"><h4>' + (ICONS[f[0]] || '') + f[1] + '</h4><p>' + esc(care[f[0]]) + '</p></div>';
  }).join('');
  return items ? '<section class="sheet-section"><h3>Growing &amp; care</h3><div class="care-grid">' + items + '</div></section>' : '';
}
function toxHTML(p){
  const safe = petSafe(p);
  const detail = (p.care && p.care.toxicity) || '';
  if(!p.toxicity && !detail) return '';
  const icon = safe
    ? '<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
    : '<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
  return '<section class="sheet-section"><h3>Toxicity &amp; pets</h3>' +
    '<div class="tox-banner' + (safe ? '' : ' warn') + '">' + icon + '<span>' + esc(p.toxicity || (safe ? 'Pet-safe' : 'Keep away from pets')) + '</span></div>' +
    (detail ? '<p style="margin:12px 0 0">' + esc(detail) + '</p>' : '') + '</section>';
}
function photosHTML(p){
  const shots = (p.shots || []);
  if(!shots.length) return '';
  const dates = shots.map(function(s){ return s.date; }).filter(Boolean);
  const span = dates.length ? ' · ' + dates[0] + (dates.length > 1 ? '–' + dates[dates.length - 1] : '') : '';
  return '<section class="sheet-section"><h3>Photographs</h3><ul class="credits"><li>' + shots.length + (shots.length === 1 ? ' photo' : ' photos') + ', all my own' + esc(span) + '.</li></ul></section>';
}

function renderDetail(p){
  const detail = document.getElementById('detail');
  const lineage = [p.genus, p.family].filter(Boolean).join(' · ');
  detail.innerHTML =
    '<a class="backlink" href="dex.html">‹ Back to the dex</a>' +
    '<article class="sheet">' +
      '<div class="sheet-head">' +
        '<div class="plate hero">' + plateHTML(p) + '<span class="dexno">' + dexNo(p.dex) + '</span></div>' +
        '<div class="sheet-intro">' +
          '<div class="types">' + typeBadges(p) + '</div>' +
          '<h1>' + esc(p.common) + '</h1>' +
          '<p class="latin">' + esc(p.botanical || '') + '</p>' +
          (p.provisional ? '<p class="prov">✎ Tentative ID — not yet confirmed</p>' : '') +
          (lineage ? '<p class="lineage">' + esc(lineage) + '</p>' : '') +
          (p.aka && p.aka.length ? '<p class="aka">Also: ' + esc(p.aka.join(' · ')) + '</p>' : '') +
          '<p class="blurb">' + esc(p.blurb || '') + '</p>' +
        '</div>' +
      '</div>' +
      '<section class="sheet-section"><h3>At a glance</h3>' + glanceHTML(p) + '</section>' +
      careHTML(p) + toxHTML(p) + photosHTML(p) +
      '<section class="sheet-section" style="text-align:center"><a class="backlink" href="dex.html">‹ Back to the dex</a></section>' +
    '</article>';
  wireReels(detail); wireLightbox(detail);
  setMeta(p);
}
function setMeta(p){
  document.title = p.common + ' · Evan\'s Succulents';
  const d = document.querySelector('meta[name="description"]'); if(d) d.setAttribute('content', (p.blurb || '').slice(0, 160));
  const ot = document.querySelector('meta[property="og:title"]'); if(ot) ot.setAttribute('content', p.common + ' — ' + (p.botanical || ''));
}

(function(){
  const slug = new URLSearchParams(location.search).get('s');
  const detail = document.getElementById('detail');
  if(!slug){ detail.innerHTML = '<a class="backlink" href="dex.html">‹ Back to the dex</a><p class="empty-note">No species specified.</p>'; return; }
  fetch('species/' + slug + '/species.json').then(function(r){ if(!r.ok) throw new Error('not found'); return r.json(); })
    .then(function(p){ p.dir = 'species/' + slug; p.slug = slug; renderDetail(p); })
    .catch(function(){ detail.innerHTML = '<a class="backlink" href="dex.html">‹ Back to the dex</a><p class="empty-note">Couldn\'t find that species. It may have been renamed — <a href="dex.html">browse the dex</a>.</p>'; });
})();
