/* reel.js — shared front-end engine for the whole site. Loaded FIRST on every page
   (home, dex, species, journal). It owns:
     • photo resolution + the swipeable photo reel (plateHTML / wireReels)
     • the pinch/scroll/double-tap zoom lightbox (wireLightbox + window.__openLightbox)
     • the Pokedex "type" badges + the dex trait/filter predicates
     • the shared dex card renderer (cardHTML)
   Because both the dex grid (dex.js) and the species page (species.js) build cards and
   reels from this one file, they can never drift. All photos are the collection owner's
   own, so there's no licensing/attribution/remote-fallback machinery here — a shot is just
   a repo-hosted thumbnail + full image. */

/* ---------- photo reel ---------- */
/* A shot is { full:'images/x.jpg', thumb?:'images/x-t.jpg', cap?, date? }.
   `full` is required; `thumb` falls back to `full`. Paths resolve against the record's
   `dir` (stamped by the loaders: "species/<slug>" or "journal/<slug>"). */
function shotsFor(rec){ return (rec && rec.shots && rec.shots.length) ? rec.shots : []; }
function rel(dir, path){ return (dir ? dir + '/' : '') + path; }
function shotThumb(sh, dir){ return rel(dir, sh.thumb || sh.full); }
function shotFull(sh, dir){ return rel(dir, sh.full); }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function capOf(sh){ return sh.cap || ''; }

window.__camera = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/></svg>';

/* Build the photo plate for a record: an empty placeholder if it has no shots, otherwise a
   sliding reel of figures with a dot bar + caption. Works identically on a small dex card
   (`.plate`) and the big species hero (`.plate.hero`). */
function plateHTML(rec){
  const shots = shotsFor(rec);
  if(!shots.length){ return '<div class="shot empty">' + window.__camera + '<span>Photo coming soon</span></div>'; }
  const caps  = shots.map(capOf);
  const fulls = shots.map(function(sh){ return shotFull(sh, rec.dir); });
  const name  = rec.common || rec.title || '';
  let reel = '<div class="reel" data-lead="0" data-caps=\'' + JSON.stringify(caps).replace(/'/g,'&#39;') + '\'><div class="reel-track">';
  shots.forEach(function(sh, i){
    const alt = esc(name + (caps[i] ? ' — ' + caps[i] : ''));
    reel += '<figure class="shot"><img src="' + esc(shotThumb(sh, rec.dir)) + '" alt="' + alt + '" loading="lazy" tabindex="0" role="button" aria-label="View larger photo: ' + alt + '" data-full="' + esc(fulls[i] || '') + '" onerror="window.__imggone(this)"></figure>';
  });
  reel += '</div></div>';
  let dots = '', counter = '';
  if(shots.length > 1){
    shots.forEach(function(sh, i){
      const lab = esc(caps[i] || ('Photo ' + (i + 1)));
      dots += '<button class="rdot' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" aria-label="View ' + lab + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" title="' + esc(caps[i] || '') + '"></button>';
    });
    counter = '<span class="rcount">1 / ' + shots.length + '</span>';
  }
  return reel + '<div class="sbar"><div class="dots">' + dots + '</div><span class="lab">' + esc(caps[0] || '') + '</span>' + counter + '</div>';
}
window.__imggone = function(img){ var fig = img.closest ? img.closest('.shot') : null; if(fig){ fig.classList.add('empty'); fig.innerHTML = window.__camera + '<span>Image unavailable</span>'; } };

/* wire up every reel inside `root`: dot taps + finger-follow horizontal swipe (with wrap). */
function wireReels(root){
  Array.prototype.forEach.call(root.querySelectorAll('.plate'), function(plate){
    var reel = plate.querySelector('.reel'), bar = plate.querySelector('.sbar'); if(!reel || !bar) return;
    var track = reel.querySelector('.reel-track'); if(!track) return;
    var tabs = Array.prototype.slice.call(bar.querySelectorAll('.rdot'));
    var figs = Array.prototype.slice.call(track.querySelectorAll('.shot'));
    var lab = bar.querySelector('.lab'), counter = bar.querySelector('.rcount');
    var caps = []; try{ caps = JSON.parse(reel.dataset.caps || '[]'); }catch(e){}
    var n = figs.length, cur = 0, idx = 0, loop = n > 1;
    if(loop){
      var cFirst = figs[0].cloneNode(true), cLast = figs[n - 1].cloneNode(true);
      [cFirst, cLast].forEach(function(c){ c.classList.remove('shot','show'); c.classList.add('clone'); var im = c.querySelector('img'); if(im){ im.removeAttribute('tabindex'); im.removeAttribute('role'); im.setAttribute('aria-hidden','true'); } });
      track.insertBefore(cLast, figs[0]); track.appendChild(cFirst);
    }
    function place(anim){ track.style.transition = anim ? 'transform .3s ease' : 'none'; track.style.transform = 'translateX(-' + (idx * 100) + '%)'; }
    function ui(){ figs.forEach(function(f, j){ f.classList.toggle('show', j === cur); }); tabs.forEach(function(t, j){ t.classList.toggle('on', j === cur); t.setAttribute('aria-pressed', j === cur ? 'true' : 'false'); }); if(counter) counter.textContent = (cur + 1) + ' / ' + n; if(lab) lab.textContent = caps[cur] || ''; }
    function sync(){ cur = loop ? (((idx - 1) % n) + n) % n : Math.max(0, Math.min(n - 1, idx)); ui(); }
    function setActive(i, anim){ idx = loop ? (((i % n) + n) % n) + 1 : Math.max(0, Math.min(n - 1, i)); place(anim !== false); sync(); }
    function go(d){ idx += d; place(true); sync(); }
    if(loop) track.addEventListener('transitionend', function(){ if(idx === 0){ idx = n; place(false); } else if(idx === n + 1){ idx = 1; place(false); } });
    tabs.forEach(function(t){ t.onclick = function(){ setActive(+t.dataset.i, true); }; });
    if(loop){
      var sx = 0, sy = 0, W = 0, base = 0, drag = false, decided = false, horiz = false;
      reel.addEventListener('pointerdown', function(e){ sx = e.clientX; sy = e.clientY; W = reel.clientWidth; base = -idx * W; drag = true; decided = false; horiz = false; track.style.transition = 'none'; }, {passive:true});
      reel.addEventListener('pointermove', function(e){ if(!drag) return; var dx = e.clientX - sx, dy = e.clientY - sy; if(!decided && (Math.abs(dx) > 6 || Math.abs(dy) > 6)){ decided = true; horiz = Math.abs(dx) > Math.abs(dy); } if(decided && horiz){ track.style.transform = 'translateX(' + (base + dx) + 'px)'; } }, {passive:true});
      function end(e){ if(!drag) return; drag = false; if(!horiz) return; var dx = e.clientX - sx, th = Math.min(70, W * 0.18); if(dx <= -th) go(1); else if(dx >= th) go(-1); else place(true); }
      reel.addEventListener('pointerup', end, {passive:true});
      reel.addEventListener('pointercancel', end, {passive:true});
    }
    setActive(0, false);
  });
}

/* ---------- zoom lightbox (pinch / scroll / double-tap; swipe between a card's photos) ---------- */
(function(){
  var lbox = document.getElementById('lbox'), stage = document.getElementById('lbStage'), img = document.getElementById('lbImg');
  if(!lbox || !stage || !img) return;
  var capText = document.getElementById('lbCapText');
  var lbPrev = document.getElementById('lbPrev'), lbNext = document.getElementById('lbNext'), lbCount = document.getElementById('lbCount'), lbHint = document.getElementById('lbHint');
  var gallery = [], gIdx = 0, scale = 1, tx = 0, ty = 0, lastDist = 0, lastMid = null;
  var pointers = new Map(), lastTap = 0, lastTapX = 0, lastTapY = 0, moved = false, swiping = false, downX = 0, downY = 0;
  function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
  function center(){ var r = stage.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  function clampPan(){ var fw = img.clientWidth * scale, fh = img.clientHeight * scale, r = stage.getBoundingClientRect(); var ox = Math.max(0, (fw - r.width) / 2), oy = Math.max(0, (fh - r.height) / 2); tx = clamp(tx, -ox, ox); ty = clamp(ty, -oy, oy); }
  function apply(){ img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; img.classList.toggle('zoomed', scale > 1.01); }
  function reset(){ scale = 1; tx = 0; ty = 0; apply(); }
  function zoomAt(ns, px, py){ ns = clamp(ns, 1, 5); var f = ns / scale, c = center(); tx = (px - c.x) * (1 - f) + tx * f; ty = (py - c.y) * (1 - f) + ty * f; scale = ns; if(scale <= 1.001){ scale = 1; tx = 0; ty = 0; } else clampPan(); apply(); }
  function anim(on){ img.classList.toggle('anim', !!on); }
  var lbTrigger = null;
  function updateNav(){ var multi = gallery.length > 1; if(lbPrev) lbPrev.hidden = !multi || gIdx <= 0; if(lbNext) lbNext.hidden = !multi || gIdx >= gallery.length - 1; if(lbCount) lbCount.textContent = multi ? ((gIdx + 1) + ' / ' + gallery.length) : ''; }
  function show(i){ gIdx = clamp(i, 0, gallery.length - 1); var it = gallery[gIdx] || {}; img.src = it.full || ''; img.alt = it.cap || ''; capText.textContent = it.cap || ''; reset(); updateNav(); }
  var lbHistory = false;
  function open(items, index, trigger){ lbTrigger = trigger || document.activeElement; gallery = items || []; img.classList.remove('anim'); if(!lbHistory){ try{ history.pushState({lbox:1}, ''); lbHistory = true; }catch(e){} } lbox.classList.add('open'); lbox.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; if(lbHint) lbHint.textContent = gallery.length > 1 ? 'Swipe or use ‹ › to change photo · pinch or double-tap to zoom' : 'Pinch, scroll, or double-tap to zoom · drag to pan'; show(index || 0); setTimeout(function(){ var c = document.getElementById('lbClose'); if(c) c.focus(); }, 0); }
  function close(fromPop){ lbox.classList.remove('open'); lbox.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; img.src = ''; gallery = []; pointers.clear(); lastDist = 0; lastMid = null; swiping = false; if(lbTrigger && lbTrigger.focus){ try{ lbTrigger.focus(); }catch(e){} } if(lbHistory){ lbHistory = false; if(!fromPop){ try{ history.back(); }catch(e){} } } }
  window.addEventListener('popstate', function(){ if(lbox.classList.contains('open')) close(true); });
  window.__openLightbox = open;
  document.getElementById('lbClose').onclick = function(){ close(); };
  if(lbPrev) lbPrev.onclick = function(){ if(gIdx > 0){ anim(true); show(gIdx - 1); } };
  if(lbNext) lbNext.onclick = function(){ if(gIdx < gallery.length - 1){ anim(true); show(gIdx + 1); } };
  document.getElementById('lbIn').onclick = function(){ var c = center(); anim(true); zoomAt(scale * 1.5, c.x, c.y); };
  document.getElementById('lbOut').onclick = function(){ var c = center(); anim(true); zoomAt(scale / 1.5, c.x, c.y); };
  document.getElementById('lbReset').onclick = function(){ anim(true); reset(); };
  document.addEventListener('keydown', function(e){
    if(!lbox.classList.contains('open')) return; var c = center();
    if(e.key === 'Escape') close();
    else if(e.key === '+' || e.key === '='){ anim(true); zoomAt(scale * 1.5, c.x, c.y); }
    else if(e.key === '-' || e.key === '_'){ anim(true); zoomAt(scale / 1.5, c.x, c.y); }
    else if(e.key === 'ArrowLeft' && scale <= 1.01 && gIdx > 0){ e.preventDefault(); anim(true); show(gIdx - 1); }
    else if(e.key === 'ArrowRight' && scale <= 1.01 && gIdx < gallery.length - 1){ e.preventDefault(); anim(true); show(gIdx + 1); }
  });
  function dist(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid(a, b){ return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}; }
  function pts(){ return Array.from(pointers.values()); }
  stage.addEventListener('pointerdown', function(e){ anim(false); pointers.set(e.pointerId, {x: e.clientX, y: e.clientY}); try{ stage.setPointerCapture(e.pointerId); }catch(_){} moved = false; swiping = false; downX = e.clientX; downY = e.clientY; if(pointers.size === 2){ var p = pts(); lastDist = dist(p[0], p[1]); lastMid = mid(p[0], p[1]); } });
  stage.addEventListener('pointermove', function(e){
    if(!pointers.has(e.pointerId)) return; var prev = pointers.get(e.pointerId); pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if(Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;
    if(pointers.size >= 2){ var p = pts(), d = dist(p[0], p[1]), m = mid(p[0], p[1]); if(lastDist > 0){ var f = d / lastDist, ns = clamp(scale * f, 1, 5), af = ns / scale, c = center(); tx = (m.x - c.x) * (1 - af) + tx * af + (lastMid ? (m.x - lastMid.x) : 0); ty = (m.y - c.y) * (1 - af) + ty * af + (lastMid ? (m.y - lastMid.y) : 0); scale = ns; if(scale <= 1.001){ scale = 1; tx = 0; ty = 0; } else clampPan(); apply(); } lastDist = d; lastMid = m; }
    else if(pointers.size === 1 && scale > 1.01){ tx += e.clientX - prev.x; ty += e.clientY - prev.y; clampPan(); apply(); }
    else if(pointers.size === 1 && gallery.length > 1){ var ddx = e.clientX - downX, ddy = e.clientY - downY; if(swiping || Math.abs(ddx) > Math.abs(ddy) + 4){ swiping = true; if((gIdx === 0 && ddx > 0) || (gIdx === gallery.length - 1 && ddx < 0)) ddx *= 0.35; img.style.transform = 'translateX(' + ddx + 'px)'; } }
  });
  function up(e){
    var wasMoved = moved, ddx = e.clientX - downX, ddy = e.clientY - downY;
    if(pointers.has(e.pointerId)) pointers.delete(e.pointerId); if(pointers.size < 2){ lastDist = 0; lastMid = null; } if(pointers.size > 0) return;
    if(swiping && scale <= 1.01){ swiping = false; var thresh = Math.min(80, stage.getBoundingClientRect().width * 0.18); if(Math.abs(ddx) > thresh && Math.abs(ddx) > Math.abs(ddy) && ddx < 0 && gIdx < gallery.length - 1){ anim(true); show(gIdx + 1); return; } if(Math.abs(ddx) > thresh && Math.abs(ddx) > Math.abs(ddy) && ddx > 0 && gIdx > 0){ anim(true); show(gIdx - 1); return; } anim(true); reset(); return; }
    if(wasMoved) return;
    var onCanvas = (e.target === stage || e.target === img);
    if(e.pointerType === 'mouse'){ if(onCanvas && scale <= 1.01) close(); return; }
    var now = Date.now();
    var isDbl = (now - lastTap < 300) && Math.abs(e.clientX - lastTapX) < 32 && Math.abs(e.clientY - lastTapY) < 32;
    if(isDbl){ anim(true); if(scale > 1.01) reset(); else zoomAt(2.5, e.clientX, e.clientY); lastTap = 0; return; }
    lastTap = now; lastTapX = e.clientX; lastTapY = e.clientY;
    if(onCanvas && scale <= 1.01){ setTimeout(function(){ if(lastTap === now && scale <= 1.01) close(); }, 300); }
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', function(e){ if(pointers.has(e.pointerId)) pointers.delete(e.pointerId); if(pointers.size < 2){ lastDist = 0; lastMid = null; } });
  stage.addEventListener('dblclick', function(e){ e.preventDefault(); anim(true); if(scale > 1.01) reset(); else zoomAt(2.5, e.clientX, e.clientY); });
  stage.addEventListener('wheel', function(e){ e.preventDefault(); anim(false); zoomAt(scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX, e.clientY); }, {passive:false});
})();

/* open the lightbox for a tapped card photo, exposing the whole reel as a swipeable gallery */
function bigOf(im){ if(!im) return ''; var full = im.getAttribute('data-full'); return full || im.currentSrc || im.src || ''; }
function openFromImg(im){
  if(!im || im.closest('.shot.empty')) return;
  var fig = im.closest('.shot'), reel = im.closest('.reel'), idx = 0, caps = [], items = [];
  if(reel){ var figs = Array.prototype.slice.call(reel.querySelectorAll('.shot')); idx = Math.max(0, figs.indexOf(fig)); try{ caps = JSON.parse(reel.dataset.caps || '[]'); }catch(_){} figs.forEach(function(f, i){ items.push({ full: bigOf(f.querySelector('img')), cap: caps[i] || '' }); }); }
  else { items.push({ full: bigOf(im), cap: '' }); }
  window.__openLightbox(items, idx, im);
}
function wireLightbox(root){
  if(!root) return; var tapDownX = 0, tapDownY = 0, tapMoved = false;
  root.addEventListener('pointerdown', function(e){ tapDownX = e.clientX; tapDownY = e.clientY; tapMoved = false; }, {passive:true});
  root.addEventListener('pointermove', function(e){ if(Math.abs(e.clientX - tapDownX) + Math.abs(e.clientY - tapDownY) > 10) tapMoved = true; }, {passive:true});
  root.addEventListener('click', function(e){ if(tapMoved) return; var im = e.target && e.target.closest ? e.target.closest('.shot img') : null; openFromImg(im); });
  root.addEventListener('keydown', function(e){ if(e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return; var im = e.target && e.target.closest ? e.target.closest('.shot img') : null; if(!im) return; e.preventDefault(); openFromImg(im); });
}

/* ---------- Pokedex "type" badges ---------- */
/* Each species carries a `class` ("Cactus" | "Succulent") and a `forms` array of 1–2 growth
   forms. Both render as colored type chips (Pokedex flavor); colors live in styles.css keyed
   on the lower-cased data-t value, so adding a new form only needs a CSS rule. */
function typeChip(t){ return '<span class="type" data-t="' + esc(String(t).toLowerCase()) + '">' + esc(t) + '</span>'; }
function typeBadges(p){ var out = []; if(p['class']) out.push(typeChip(p['class'])); (p.forms || []).forEach(function(f){ out.push(typeChip(f)); }); return out.join(''); }
function dexNo(n){ return '#' + String(n == null ? 0 : n).padStart(3, '0'); }

/* ---------- dex trait / filter predicates (shared by dex.js grouping + filters) ---------- */
function classOf(p){ return p['class'] || 'Succulent'; }               /* Cactus | Succulent */
function lightOf(p){ var s = (p.light || '').toLowerCase();
  if(/full sun|sun/.test(s)) return 'Full sun';
  if(/bright|indirect/.test(s)) return 'Bright indirect';
  if(/part|partial|filtered|dappled/.test(s)) return 'Partial';
  if(/low|shade/.test(s)) return 'Low light';
  return 'Bright indirect';
}
function growerOf(p){ var s = (p.growth_season || '').toLowerCase();
  if(/winter/.test(s)) return 'Winter grower';
  if(/ever|year|both/.test(s)) return 'Year-round';
  return 'Summer grower';
}
function hardyClass(p){ return /hardy/i.test(p.hardiness || '') && !/tender/i.test(p.hardiness || '') ? 'Cold-hardy' : 'Tender'; }
function petSafe(p){ return /safe|non-?toxic|pet-?safe/i.test(p.toxicity || '') && !/toxic to|harmful|caution/i.test(p.toxicity || ''); }
function toxClass(p){ return petSafe(p) ? 'Pet-safe' : 'Toxic'; }

/* ---------- shared dex-card renderer (used by dex.js AND the "you might also like" strips) ----------
   A species' detail page lives at species.html?s=<slug>; slugOf/detailHref derive it from the
   record's stamped `dir` ("species/<slug>"). */
function slugOf(p){ return p.dir ? p.dir.replace(/^species\//, '') : (p.slug || null); }
function detailHref(p){ var s = slugOf(p); return s ? 'species.html?s=' + encodeURIComponent(s) : null; }
function cardHTML(p){
  const href = detailHref(p);
  const name = href ? '<a class="namelink" href="' + href + '">' + esc(p.common) + '</a>' : esc(p.common);
  return '<article class="card">' +
    '<div class="plate">' + plateHTML(p) + '<span class="dexno">' + dexNo(p.dex) + '</span></div>' +
    '<div class="body">' +
      '<div class="types">' + typeBadges(p) + '</div>' +
      '<div class="namerow"><h3 class="name">' + name + '</h3></div>' +
      '<p class="latin">' + esc(p.botanical || '') + '</p>' +
      (p.provisional ? '<p class="prov">✎ Tentative ID</p>' : '') +
      (p.aka && p.aka.length ? '<p class="aka">Also: ' + esc(p.aka.join(' · ')) + '</p>' : '') +
      '<p class="blurb">' + esc(p.blurb || '') + '</p>' +
      '<dl class="facts">' +
        '<dt>Light</dt><dd>' + esc(p.light || '—') + '</dd>' +
        '<dt>Water</dt><dd>' + esc(p.water || '—') + '</dd>' +
        '<dt>Soil</dt><dd>' + esc(p.soil || '—') + '</dd>' +
        '<dt>Grower</dt><dd>' + esc(p.growth_season ? p.growth_season + '-grower' : '—') + '</dd>' +
        '<dt>Hardiness</dt><dd>' + esc(p.hardiness || '—') + '</dd>' +
        '<dt>Toxicity</dt><dd>' + esc(p.toxicity || '—') + '</dd>' +
      '</dl>' +
      (href ? '<a class="detaillink" href="' + href + '">Full dex entry →</a>' : '') +
    '</div>' +
  '</article>';
}
