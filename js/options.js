(function () {
  'use strict';

  var root = document.querySelector('[data-options]');
  if (!root) return;

  var BODIES = ['berline', 'coupe'];
  var bodyButtons = Array.prototype.slice.call(document.querySelectorAll('[data-body-btn]'));

  // Activateurs de pôle (roue des finitions) : utilisés par les liens directs
  var poleActivators = new Map();

  /* ==========================================================================
     Roue : composant générique (SVG pour les segments, boutons pour les libellés)
     cfg = { labels: [], counts: [], unit: [singulier, pluriel], name: '', onSelect: fn(i) }
     ========================================================================== */
  var SVGNS = 'http://www.w3.org/2000/svg';

  function polar(r, a) {
    var t = a * Math.PI / 180;
    return (200 + r * Math.cos(t)).toFixed(2) + ' ' + (200 + r * Math.sin(t)).toFixed(2);
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVGNS, name);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function buildWheel(cfg) {
    var n = cfg.labels.length;
    if (n < 2) return null;
    var step = 360 / n;
    var gap = 2;
    var current = 0;      // rotation cumulée de la roue (degrés)
    var active = -1;

    var wheel = document.createElement('div');
    wheel.className = 'wheel';
    wheel.setAttribute('role', 'group');
    wheel.setAttribute('aria-label', cfg.name);

    var svg = svgEl('svg', { viewBox: '0 0 400 400', 'aria-hidden': 'true', 'class': 'wheel-svg', focusable: 'false' });
    svg.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 196, 'class': 'wheel-ring' }));
    svg.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 191, 'class': 'wheel-ring wheel-ring--dash' }));

    var rot = svgEl('g', { 'class': 'wheel-rot' });
    var segs = [];
    for (var i = 0; i < n; i++) {
      var a0 = i * step + gap / 2;
      var a1 = (i + 1) * step - gap / 2;
      var d = 'M ' + polar(186, a0) + ' A 186 186 0 0 1 ' + polar(186, a1) +
        ' L ' + polar(96, a1) + ' A 96 96 0 0 0 ' + polar(96, a0) + ' Z';
      var seg = svgEl('path', { d: d, 'class': 'wheel-seg' });
      (function (k) { seg.addEventListener('click', function () { select(k); }); })(i);
      rot.appendChild(seg);
      segs.push(seg);
    }
    svg.appendChild(rot);
    svg.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 78, 'class': 'wheel-hub' }));
    svg.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 86, 'class': 'wheel-hub-ring' }));
    svg.appendChild(svgEl('polygon', { points: '399,189 399,211 388,200', 'class': 'wheel-pointer' }));
    wheel.appendChild(svg);

    var core = document.createElement('div');
    core.className = 'wheel-core';
    core.innerHTML = '<strong></strong><span></span>';
    wheel.appendChild(core);

    var buttons = cfg.labels.map(function (label, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wheel-label';
      b.textContent = label;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { select(k); });
      wheel.appendChild(b);
      return b;
    });

    function select(i, silent) {
      if (i < 0 || i >= n) return;
      // Rotation par le plus court chemin : le segment actif vient à droite (3 h), face à la liste
      var target = -(i * step + step / 2);
      var diff = (((target - current) % 360) + 540) % 360 - 180;
      current += diff;
      rot.style.transform = 'rotate(' + current + 'deg)';
      segs.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      buttons.forEach(function (b, k) {
        var ang = k * step + step / 2 + current;
        b.style.transform = 'rotate(' + ang + 'deg) translateX(calc(var(--w) * 0.352)) rotate(' + (-ang) + 'deg)';
        b.setAttribute('aria-pressed', String(k === i));
      });
      var count = cfg.counts[i];
      core.firstChild.textContent = count;
      core.lastChild.textContent = count > 1 ? cfg.unit[1] : cfg.unit[0];
      var changed = active !== i;
      active = i;
      if (!silent && changed && cfg.onSelect) cfg.onSelect(i);
    }

    return { el: wheel, select: select };
  }

  function makeLayout(wheelEl) {
    var layout = document.createElement('div');
    layout.className = 'wheel-layout';
    var col = document.createElement('div');
    col.className = 'wheel-col';
    col.appendChild(wheelEl);
    var content = document.createElement('div');
    content.className = 'wheel-content';
    layout.appendChild(col);
    layout.appendChild(content);
    return { layout: layout, content: content };
  }

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

  // 2. Finitions : une roue par carrosserie, un segment par pôle
  var finSection = document.getElementById('finitions');
  if (finSection) {
    var panelsFin = Array.prototype.slice.call(finSection.querySelectorAll('.body-panel'));
    var built = false;
    panelsFin.forEach(function (panel) {
      var stack = panel.querySelector('.poles-stack');
      if (!stack) return;
      var poles = Array.prototype.slice.call(stack.children).filter(function (el) {
        return el.classList.contains('pole');
      });
      if (poles.length < 2) return;

      var labels = poles.map(function (p) { return p.querySelector('.pole-name').textContent.trim(); });
      var counts = poles.map(function (p) { return p.querySelectorAll('.ladder-item').length; });

      var wheel = buildWheel({
        labels: labels,
        counts: counts,
        unit: ['finition', 'finitions'],
        name: 'Pôles de finitions, ' + (panel.getAttribute('data-body-panel') === 'coupe' ? 'Coupé' : 'Berline'),
        onSelect: function (i) {
          poles.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
        }
      });
      if (!wheel) return;

      var parts = makeLayout(wheel.el);
      stack.parentNode.insertBefore(parts.layout, stack);
      parts.content.appendChild(stack);

      poles.forEach(function (p, k) {
        poleActivators.set(p, function () { wheel.select(k); });
      });
      wheel.select(0);
      built = true;
    });
    if (built) finSection.classList.add('has-wheel');
  }

  // 3. Lien direct vers une finition : bonne carrosserie, bon pôle, fiche ouverte
  function openFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    var m = /^finition-(berline|coupe)-/.exec(id);
    if (m && root.getAttribute('data-body') !== m[1]) setBody(m[1], true);
    var pole = target.closest ? target.closest('.pole') : null;
    if (pole && poleActivators.has(pole)) poleActivators.get(pole)();
    if (target.tagName === 'DETAILS') target.open = true;
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ block: 'start' });
    });
  }
  window.addEventListener('hashchange', openFromHash);
  if (window.location.hash) openFromHash();

  // 4. Équipements : onglets par catégorie, pilotés par une roue (sans JavaScript, tout reste affiché)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-eq-tab]'));
  if (tabs.length) {
    var tablist = tabs[0].parentNode;
    var section = document.getElementById('equipements');
    tablist.setAttribute('role', 'tablist');
    var eqWheel = null;

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
      if (eqWheel) eqWheel.select(index, true);
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

    // Roue des équipements : un segment par catégorie
    var eqLabels = tabs.map(function (tab) { return tab.firstChild.textContent.trim(); });
    var eqCounts = panels.map(function (p) { return p.querySelectorAll('.eq-grid > li').length; });
    eqWheel = buildWheel({
      labels: eqLabels,
      counts: eqCounts,
      unit: ['équipement', 'équipements'],
      name: 'Catégories d’équipements',
      onSelect: function (i) { select(i, false); }
    });
    if (eqWheel) {
      var eqParts = makeLayout(eqWheel.el);
      tablist.parentNode.insertBefore(eqParts.layout, tablist);
      panels.forEach(function (p) { eqParts.content.appendChild(p); });
      if (section) section.classList.add('has-wheel');
      eqWheel.select(0, true);
    }
  }

  // 5. Navigation de page : section courante mise en évidence
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