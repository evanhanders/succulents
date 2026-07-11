/* home.js — the landing page's dynamic strips: a preview of the newest journal entry and a
   few cards from the dex. Both are progressive enhancements — if the data isn't there yet, the
   section simply stays hidden and the two portals above still work. */

const MONTHS_H = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtDateH(iso){ const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? MONTHS_H[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : (iso || ''); }

/* ----- latest journal entry ----- */
fetch('journal/manifest.json').then(function(r){ return r.json(); }).then(function(m){
  const slug = (m.entries || [])[0]; if(!slug) return;
  return fetch('journal/' + slug + '/entry.json').then(function(r){ return r.json(); }).then(function(e){ e.dir = 'journal/' + slug; e.slug = slug; return e; });
}).then(function(e){
  if(!e) return;
  const shots = e.shots || [];
  const cls = shots.length === 1 ? ' one' : (shots.length === 2 ? ' two' : '');
  const tiles = shots.slice(0, 3).map(function(sh){
    const full = e.dir + '/' + sh.full, thumb = e.dir + '/' + (sh.thumb || sh.full);
    return '<div class="ph"><img src="' + esc(thumb) + '" data-full="' + esc(full) + '" data-cap="' + esc(sh.cap || '') + '" alt="' + esc(sh.cap || e.title || '') + '" loading="lazy" onerror="window.__imggone(this)"></div>';
  }).join('');
  const firstPara = (e.body || [])[0] || '';
  const html = '<article class="entry">' +
    '<div class="entry-head"><div class="entry-date">' + esc(fmtDateH(e.date)) + '</div>' +
    '<h2><a href="journal.html#' + esc(e.slug) + '">' + esc(e.title || 'Untitled') + '</a></h2></div>' +
    (tiles ? '<div class="entry-photos' + cls + '">' + tiles + '</div>' : '') +
    (firstPara ? '<div class="entry-body"><p>' + esc(firstPara) + '</p></div>' : '') +
    '<div class="entry-species"><a class="speclink" href="journal.html#' + esc(e.slug) + '">Read the full entry →</a></div>' +
  '</article>';
  const box = document.getElementById('latest'); box.innerHTML = html;
  document.getElementById('latest-wrap').hidden = false;
  // simple lightbox on the preview photos
  box.addEventListener('click', function(ev){ const img = ev.target.closest && ev.target.closest('.entry-photos img'); if(!img) return; const imgs = Array.prototype.slice.call(box.querySelectorAll('.entry-photos img')); const items = imgs.map(function(im){ return { full: im.getAttribute('data-full'), cap: im.getAttribute('data-cap') || '' }; }); window.__openLightbox(items, imgs.indexOf(img), img); });
}).catch(function(){});

/* ----- a few dex cards ----- */
fetch('species/manifest.json').then(function(r){ return r.json(); }).then(function(m){
  const slugs = (m.species || []).slice(0, 3); if(!slugs.length) return [];
  return Promise.all(slugs.map(function(slug){
    return fetch('species/' + slug + '/species.json').then(function(r){ return r.json(); }).then(function(p){ p.dir = 'species/' + slug; p.slug = slug; return p; }).catch(function(){ return null; });
  }));
}).then(function(list){
  list = (list || []).filter(Boolean); if(!list.length) return;
  list.sort(function(a, b){ return (a.dex || 9999) - (b.dex || 9999); });
  const box = document.getElementById('featured'); box.innerHTML = list.map(cardHTML).join('');
  document.getElementById('featured-wrap').hidden = false;
  wireReels(box); wireLightbox(box);
}).catch(function(){});
