(function () {
    'use strict';

    var root = document.querySelector('[data-guides]');
    if (!root) return;

    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-guide-filter]'));
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-guide-cat]'));
    var empty = document.getElementById('guide-empty');

    // 1. Filtre par catégorie (sans JavaScript, tous les guides restent affichés)
    function setFilter(cat) {
        var visible = 0;
        buttons.forEach(function (btn) {
            btn.setAttribute('aria-pressed', String(btn.getAttribute('data-guide-filter') === cat));
        });
        items.forEach(function (item) {
            var show = cat === 'all' || item.getAttribute('data-guide-cat') === cat;
            item.hidden = !show;
            if (show) visible++;
        });
        if (empty) empty.hidden = visible !== 0;
    }

    buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            setFilter(btn.getAttribute('data-guide-filter'));
        });
    });

    setFilter('all');

    // 2. Navigation de page : section courante mise en évidence
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