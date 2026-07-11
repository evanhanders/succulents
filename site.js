/* site.js — shared chrome for every page: light/dark theme toggle + active-nav highlight.
   Loaded on all pages (before the page-specific script). Tiny and dependency-free. */
(function(){
  var root = document.documentElement;
  var KEY = 'succ-theme';
  function set(t){ root.setAttribute('data-theme', t); try{ localStorage.setItem(KEY, t); }catch(e){} paint(t); }
  function current(){ return root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  var SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function paint(t){ var b = document.querySelector('.themebtn'); if(b) b.innerHTML = t === 'dark' ? SUN : MOON; }
  try{ var saved = localStorage.getItem(KEY); if(saved) root.setAttribute('data-theme', saved); }catch(e){}
  document.addEventListener('DOMContentLoaded', function(){
    paint(current());
    var b = document.querySelector('.themebtn');
    if(b){ b.setAttribute('aria-label','Toggle light/dark theme'); b.onclick = function(){ set(current() === 'dark' ? 'light' : 'dark'); }; }
    // active nav
    var page = (location.pathname.split('/').pop() || 'index.html');
    document.querySelectorAll('.navlinks a[href]').forEach(function(a){
      var href = a.getAttribute('href');
      if(href === page || (page === '' && href === 'index.html')) a.classList.add('on');
    });
  });
})();
