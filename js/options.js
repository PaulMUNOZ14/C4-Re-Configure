(function () {
  'use strict';

  var root = document.querySelector('[data-options]');
  if (!root) return;

  var BODIES = ['berline', 'coupe'];
  var bodyButtons = Array.prototype.slice.call(document.querySelectorAll('[data-body-btn]'));

  // 1. Carrosserie : Berline / Coupé (même paramètre d'adresse que le configurateur)
  function setBody(body, updateUrl) {
    if (BODIES.indexOf(body) === -1) body = 'berline';
    root.setAttribute('data-body', body);
    bodyButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-body-btn') === body));
    });
    if (updateUrl) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('carrosserie', body);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch (e) { /* adresse non modifiable (ex. fichier local) : sans conséquence */ }
    }
  }

  bodyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setBody(btn.getAttribute('data-body-btn'), true);
    });
  });

  var initial = 'berline';
  try {
    var param = new URLSearchParams(window.location.search).get('carrosserie');
    if (BODIES.indexOf(param) !== -1) initial = param;
  } catch (e) { /* ignoré */ }
  var hashBody = /^#finition-(berline|coupe)-/.exec(window.location.hash);
  if (hashBody) initial = hashBody[1];
  setBody(initial, false);

  // 2. Lien direct vers une finition : bonne carrosserie, fiche ouverte
  function openFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    var m = /^finition-(berline|coupe)-/.exec(id);
    if (m && root.getAttribute('data-body') !== m[1]) setBody(m[1], true);
    if (target.tagName === 'DETAILS') target.open = true;
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ block: 'start' });
    });
  }
  window.addEventListener('hashchange', openFromHash);
  if (window.location.hash) openFromHash();

  // 3. Équipements : onglets par catégorie (sans JavaScript, tout reste affiché)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-eq-tab]'));
  if (tabs.length) {
    var tablist = tabs[0].parentNode;
    var section = document.getElementById('equipements');
    tablist.setAttribute('role', 'tablist');

    var panels = tabs.map(function (tab) {
      var panel = document.getElementById(tab.getAttribute('data-eq-tab'));
      tab.setAttribute('role', 'tab');
      tab.id = 'tab-' + panel.id;
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      return panel;
    });

    var select = function (index, focus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.setAttribute('tabindex', on ? '0' : '-1');
        panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    if (section) section.classList.add('has-tabs');
    select(0, false);
  }

  // 4. Navigation de page : section courante mise en évidence
  var links = Array.prototype.slice.call(document.querySelectorAll('.subnav-links a'));
  var sections = links.map(function (a) { return document.getElementById(a.hash.slice(1)); });

  function setCurrent(id) {
    links.forEach(function (a) {
      if (a.hash === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach(function (s) { if (s) observer.observe(s); });
  }
})();
