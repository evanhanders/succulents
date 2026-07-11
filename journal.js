/* journal.js — the reverse-chron collection journal. Loads journal/manifest.json (entries newest
   first), renders each entry (date, title, tags, photo grid, prose, linked species), and wires a
   lightweight lightbox on the photo grids via window.__openLightbox (exposed by reel.js). */

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtDate(iso){
  if(!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if(!m) return iso;
  return MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
}

function photosHTML(entry){
  const shots = entry.shots || [];
  if(!shots.length) return '';
  const cls = shots.length === 1 ? ' one' : (shots.length === 2 ? ' two' : '');
  const tiles = shots.map(function(sh, i){
    const full = (entry.dir ? entry.dir + '/' : '') + sh.full;
    const thumb = (entry.dir ? entry.dir + '/' : '') + (sh.thumb || sh.full);
    const cap = sh.cap || '';
    return '<div class="ph"><img src="' + esc(thumb) + '" data-full="' + esc(full) + '" data-cap="' + esc(cap) + '" alt="' + esc(cap || entry.title || 'Journal photo') + '" loading="lazy" data-i="' + i + '" onerror="window.__imggone(this)"></div>';
  }).join('');
  return '<div class="entry-photos' + cls + '">' + tiles + '</div>';
}
function speciesChips(entry, smap){
  const slugs = entry.species || [];
  if(!slugs.length) return '';
  const chips = slugs.map(function(slug){
    const s = smap[slug];
    const label = s ? s.common : slug;
    const no = s && s.dex != null ? '<span class="n">' + dexNo(s.dex) + '</span>' : '';
    return '<a class="speclink" href="species.html?s=' + encodeURIComponent(slug) + '">' + no + esc(label) + '</a>';
  }).join('');
  return '<div class="entry-species"><span class="lbl">In the dex:</span>' + chips + '</div>';
}
function entryHTML(entry, smap){
  const tags = (entry.tags || []).map(function(t){ return '<span class="etag">' + esc(t) + '</span>'; }).join('');
  const body = (entry.body || []).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('');
  return '<article class="entry" id="' + esc(entry.slug) + '">' +
    '<div class="entry-head">' +
      '<div class="entry-date">' + esc(fmtDate(entry.date)) + '</div>' +
      '<h2><a href="#' + esc(entry.slug) + '">' + esc(entry.title || 'Untitled') + '</a></h2>' +
      (tags ? '<div class="entry-tags">' + tags + '</div>' : '') +
    '</div>' +
    photosHTML(entry) +
    (body ? '<div class="entry-body">' + body + '</div>' : '') +
    speciesChips(entry, smap) +
  '</article>';
}

/* delegate photo taps → open the lightbox with that entry's whole photo set */
function wireJournalLightbox(root){
  let downX = 0, downY = 0, moved = false;
  root.addEventListener('pointerdown', function(e){ downX = e.clientX; downY = e.clientY; moved = false; }, {passive:true});
  root.addEventListener('pointermove', function(e){ if(Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 10) moved = true; }, {passive:true});
  root.addEventListener('click', function(e){
    if(moved) return;
    const img = e.target.closest && e.target.closest('.entry-photos img');
    if(!img) return;
    const grid = img.closest('.entry-photos');
    const imgs = Array.prototype.slice.call(grid.querySelectorAll('img'));
    const items = imgs.map(function(im){ return { full: im.getAttribute('data-full'), cap: im.getAttribute('data-cap') || '' }; });
    window.__openLightbox(items, imgs.indexOf(img), img);
  });
}

const feed = document.getElementById('feed');
fetch('journal/manifest.json').then(function(r){ return r.json(); }).then(function(m){
  const slugs = m.entries || [];
  return Promise.all(slugs.map(function(slug){
    return fetch('journal/' + slug + '/entry.json').then(function(r){ return r.json(); }).then(function(e){ e.dir = 'journal/' + slug; e.slug = slug; return e; }).catch(function(){ return null; });
  }));
}).then(function(entries){
  entries = entries.filter(Boolean);
  // gather the species referenced anywhere so chips can show their common name + dex number
  const refs = {};
  entries.forEach(function(e){ (e.species || []).forEach(function(s){ refs[s] = 1; }); });
  return Promise.all(Object.keys(refs).map(function(slug){
    return fetch('species/' + slug + '/species.json').then(function(r){ return r.json(); }).then(function(s){ return [slug, { common: s.common, dex: s.dex }]; }).catch(function(){ return [slug, null]; });
  })).then(function(pairs){
    const smap = {}; pairs.forEach(function(p){ if(p[1]) smap[p[0]] = p[1]; });
    return { entries: entries, smap: smap };
  });
}).then(function(data){
  if(!data.entries.length){ feed.innerHTML = '<p class="empty-note">No journal entries yet.</p>'; return; }
  feed.innerHTML = data.entries.map(function(e){ return entryHTML(e, data.smap); }).join('');
  wireJournalLightbox(feed);
  if(location.hash){ const el = document.getElementById(location.hash.slice(1)); if(el) el.scrollIntoView(); }
}).catch(function(err){ feed.innerHTML = '<p class="empty-note">Could not load the journal. ' + esc(String(err)) + '</p>'; });
