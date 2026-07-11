/* dex.js — the Pokedex grid: load every species record, render cards, and drive the
   search / filter / grouping controls. The card markup, type badges and trait predicates all
   live in reel.js (loaded first) so the grid and the species detail page never drift. */

let SEED = [];                 // all species records, stamped with dir = "species/<slug>"
let view = 'type';             // active grouping (the Sort control)
const collapsed = new Set();   // collapsed section names

/* ---------- filter dimensions ----------
   Each group is a set of chips with a predicate. Selected chips filter with OR within a group
   and AND across groups; every chip shows a faceted count (matches given the OTHER groups). */
const FORMS = ['Rosette','Columnar','Barrel','Trailing','Clumping','Caudex','Paddle','Ball','Shrub','Ground'];
const LIGHTS = ['Full sun','Bright indirect','Partial','Low light'];
const GROWERS = ['Summer grower','Winter grower','Year-round'];
const GROUPS = [
  { key:'class', label:'Type',  mode:'or', opts:['Cactus','Succulent'].map(function(v){ return {v:v, label:v, test:function(p){ return classOf(p)===v; }}; }) },
  { key:'form',  label:'Form',  mode:'or', opts:FORMS.map(function(v){ return {v:v, label:v, test:function(p){ return (p.forms||[]).indexOf(v)>-1; }}; }) },
  { key:'light', label:'Light', mode:'or', opts:LIGHTS.map(function(v){ return {v:v, label:v, test:function(p){ return lightOf(p)===v; }}; }) },
  { key:'grower',label:'Growth season', mode:'or', opts:GROWERS.map(function(v){ return {v:v, label:v, test:function(p){ return growerOf(p)===v; }}; }) },
  { key:'hardy', label:'Hardiness', mode:'or', opts:['Cold-hardy','Tender'].map(function(v){ return {v:v, label:v, test:function(p){ return hardyClass(p)===v; }}; }) },
  { key:'tox',   label:'Toxicity', mode:'or', opts:['Pet-safe','Toxic'].map(function(v){ return {v:v, label:v, test:function(p){ return toxClass(p)===v; }}; }) }
];
const GMAP = {}; GROUPS.forEach(function(g){ g.sel = new Set(); g.byv = {}; g.opts.forEach(function(o){ g.byv[o.v] = o; }); GMAP[g.key] = g; });
function anyFilter(){ return GROUPS.some(function(g){ return g.sel.size > 0; }); }
function passesFilters(p, exceptKey){
  for(const g of GROUPS){
    if(g.key === exceptKey || !g.sel.size) continue;
    const sel = Array.from(g.sel).map(function(v){ return g.byv[v]; }).filter(Boolean);
    if(!sel.some(function(o){ return o.test(p); })) return false;
  }
  return true;
}

/* ---------- search ---------- */
function matchesQuery(p, q){
  if(!q) return true;
  return [p.common, p.botanical, p.genus, p.family, p.blurb, p.growth_season, p.light, p.water, p.soil,
    (p.forms||[]).join(' '), (p.aka||[]).join(' ')].join(' ').toLowerCase().indexOf(q) > -1;
}

/* ---------- grouping ---------- */
const CLASS_SECTION = { Cactus:'Cacti', Succulent:'Succulents' };
const CLASS_ORDER = ['Cacti','Succulents'];
const CLASS_DESC = {
  'Cacti':'Members of the cactus family (Cactaceae) — spines from areoles, mostly leafless stems built to store water.',
  'Succulents':'Everything else that hoards water in fleshy leaves, stems, or roots — Haworthia, Echeveria, Aloe, and kin.'
};
function sortCards(list){ return list.slice().sort(function(a,b){ return (a.dex||9999)-(b.dex||9999) || String(a.common).localeCompare(b.common); }); }

/* the grouping key → { sections:[{name,desc,items}] } for the current filtered/searched set */
function buildSections(list){
  if(view === 'dex'){ return [{ name:null, items:sortCards(list) }]; }
  if(view === 'type'){
    return CLASS_ORDER.map(function(sec){
      const items = list.filter(function(p){ return CLASS_SECTION[classOf(p)] === sec; });
      return { name:sec, desc:CLASS_DESC[sec], items:items, subBy:'genus' };
    }).filter(function(s){ return s.items.length; });
  }
  const keyFn = { genus:function(p){ return p.genus || '—'; }, grower:growerOf, light:lightOf, hardy:hardyClass }[view];
  const buckets = {};
  list.forEach(function(p){ const k = keyFn(p) || '—'; (buckets[k] = buckets[k] || []).push(p); });
  return Object.keys(buckets).sort().map(function(k){ return { name:k, items:buckets[k] }; });
}

/* ---------- render ---------- */
const content = document.getElementById('content');
function sectionHTML(name, count, desc, collapsedNow, inner){
  if(name == null) return inner;
  return '<section class="grp' + (collapsedNow ? ' collapsed' : '') + '" data-group="' + esc(name) + '">' +
    '<div class="group-head" data-g="' + esc(name) + '"><button class="chev" aria-expanded="' + (collapsedNow?'false':'true') + '" aria-label="Toggle ' + esc(name) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
    '<h2>' + esc(name) + '</h2><span class="gc">' + count + '</span><span class="rule"></span></div>' +
    (desc ? '<p class="group-desc">' + esc(desc) + '</p>' : '') + inner + '</section>';
}
function gridWithSubgroups(items, subBy){
  if(!subBy){ return '<div class="grid">' + sortCards(items).map(cardHTML).join('') + '</div>'; }
  const buckets = {};
  items.forEach(function(p){ const k = p[subBy] || '—'; (buckets[k] = buckets[k] || []).push(p); });
  return Object.keys(buckets).sort().map(function(k){
    return '<div class="subgroup">' + esc(k) + '</div><div class="grid">' + sortCards(buckets[k]).map(cardHTML).join('') + '</div>';
  }).join('');
}
function render(){
  const q = (document.getElementById('search').value || '').trim().toLowerCase();
  const filtered = SEED.filter(function(p){ return matchesQuery(p, q) && passesFilters(p); });
  const sections = buildSections(filtered);
  if(!filtered.length){ content.innerHTML = '<p class="empty-note">No species match. Try clearing a filter or the search.</p>'; }
  else {
    content.innerHTML = sections.map(function(s){
      const inner = gridWithSubgroups(s.items, s.subBy);
      return sectionHTML(s.name, s.items.length, s.desc, collapsed.has(s.name), inner);
    }).join('');
  }
  document.getElementById('showing').textContent = filtered.length + (filtered.length === 1 ? ' species' : ' species') + (q || anyFilter() ? ' shown' : '');
  document.getElementById('clearFilters').hidden = !(q || anyFilter());
  const nSel = GROUPS.reduce(function(a, g){ return a + g.sel.size; }, 0);
  const ftc = document.getElementById('ftCount'); ftc.hidden = !nSel; ftc.textContent = nSel;
  document.getElementById('groupNote').innerHTML = 'Grouped <b>by ' + ({type:'type',genus:'genus',grower:'growth season',light:'light',hardy:'hardiness',dex:'dex number'}[view]) + '</b>';
  renderFilters();
  wireReels(content); wireLightbox(content);
}

/* ---------- filters UI ---------- */
function renderFilters(){
  const q = (document.getElementById('search').value || '').trim().toLowerCase();
  const box = document.getElementById('filters');
  box.innerHTML = GROUPS.map(function(g){
    const chips = g.opts.map(function(o){
      // faceted count: matches with THIS group's selection replaced by just this chip
      const n = SEED.filter(function(p){ return matchesQuery(p, q) && passesFilters(p, g.key) && o.test(p); }).length;
      const on = g.sel.has(o.v);
      if(!n && !on) return '';
      return '<button class="chip' + (on?' on':'') + '" data-g="' + g.key + '" data-v="' + esc(o.v) + '">' + esc(o.label) + '<span class="fc">' + n + '</span></button>';
    }).join('');
    return '<div class="fgroup"><h4>' + esc(g.label) + '</h4><div class="chips">' + chips + '</div></div>';
  }).join('');
}

/* ---------- events ---------- */
document.getElementById('sortby').addEventListener('change', function(e){ view = e.target.value; render(); });
document.getElementById('search').addEventListener('input', function(e){ document.getElementById('searchClear').hidden = !e.target.value; render(); });
document.getElementById('searchClear').addEventListener('click', function(){ const s = document.getElementById('search'); s.value = ''; this.hidden = true; render(); s.focus(); });
document.getElementById('filterToggle').addEventListener('click', function(){ const f = document.getElementById('filters'); const open = f.classList.toggle('open'); this.setAttribute('aria-expanded', open ? 'true' : 'false'); });
document.getElementById('clearFilters').addEventListener('click', function(){ GROUPS.forEach(function(g){ g.sel.clear(); }); render(); });
document.getElementById('filters').addEventListener('click', function(e){ const c = e.target.closest('.chip'); if(!c) return; const g = GMAP[c.dataset.g]; if(!g) return; const v = c.dataset.v; if(g.sel.has(v)) g.sel.delete(v); else g.sel.add(v); render(); });
content.addEventListener('click', function(e){ const h = e.target.closest('.group-head'); if(!h) return; if(e.target.closest('a')) return; const name = h.dataset.g; if(collapsed.has(name)) collapsed.delete(name); else collapsed.add(name); render(); });

/* ---------- load ---------- */
function loadSeed(){
  return fetch('species/manifest.json').then(function(r){ return r.json(); }).then(function(m){
    const slugs = (m.species || []);
    return Promise.all(slugs.map(function(slug){
      return fetch('species/' + slug + '/species.json').then(function(r){ return r.json(); }).then(function(p){ p.dir = 'species/' + slug; p.slug = slug; return p; }).catch(function(){ return null; });
    }));
  }).then(function(list){ SEED = list.filter(Boolean); });
}
loadSeed().then(function(){
  document.getElementById('count').textContent = SEED.length;
  render();
}).catch(function(err){ content.innerHTML = '<p class="empty-note">Could not load the dex. ' + esc(String(err)) + '</p>'; });
