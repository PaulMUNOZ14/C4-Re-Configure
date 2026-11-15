function main() {
  'use strict';
  document.documentElement.classList.remove('no-js');

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('menu-principal');

  // 1. En-tête transparent tant que l'on est tout en haut, plein ensuite
  var THRESHOLD = 40;
  var ticking = false;

  function updateHeader() {
    ticking = false;
    if (!header) return;
    header.classList.toggle('is-top', window.scrollY <= THRESHOLD);
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateHeader);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  updateHeader();

  // 2. Menu mobile
  function setMenu(open) {
    if (!toggle || !nav || !header) return;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setMenu(false);
    });
  }

  // 3. Médias absents : on affiche un cadre qui indique le fichier attendu
  function markMissing(el) {
    var box = el.closest('.media');
    if (box) box.classList.add('is-missing');
  }

  document.querySelectorAll('.media img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) {
      markMissing(img);
    } else {
      img.addEventListener('error', function () { markMissing(img); });
    }
  });

  // 4. Vidéo d'ouverture : pause / lecture, respect de prefers-reduced-motion
  var video = document.getElementById('hero-video');
  var control = document.getElementById('video-control');

  if (video && control) {
    var label = control.querySelector('.video-control-label');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var setPaused = function (paused) {
      control.setAttribute('aria-pressed', String(paused));
      if (label) label.textContent = paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause';
    };

    var videoFailed = function () {
      markMissing(video);
      control.hidden = true;
    };

    // Les erreurs de chargement se produisent sur les éléments <source> (elles ne remontent pas)
    video.addEventListener('error', videoFailed, true);
    if (video.networkState === 3) videoFailed();

    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
      setPaused(true);
    }

    control.addEventListener('click', function () {
      if (video.paused) {
        var p = video.play();
        if (p && p.catch) p.catch(function () { });
        setPaused(false);
      } else {
        video.pause();
        setPaused(true);
      }
    });
  }
  
  // 5. Pied de page : accordéon sur mobile, colonnes toujours ouvertes sur ordinateur
  var footerToggles = document.querySelectorAll('.footer-toggle');
  var mobileMq = window.matchMedia('(max-width: 900px)');

  function syncFooter() {
    footerToggles.forEach(function (btn) {
      var col = btn.closest('.footer-col');
      if (mobileMq.matches) {
        btn.disabled = false;
        btn.setAttribute('aria-expanded', String(col.classList.contains('is-open')));
      } else {
        btn.disabled = true;
        btn.removeAttribute('aria-expanded');
      }
    });
  }

  footerToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var col = btn.closest('.footer-col');
      var open = !col.classList.contains('is-open');
      col.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  if (mobileMq.addEventListener) mobileMq.addEventListener('change', syncFooter);
  syncFooter();
};

main();