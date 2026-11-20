/* ==========================================================================
   Page « Options et packs » : construit les sections #finitions et #equipements
   à partir de js/donnees.js. À charger après donnees.js et AVANT options.js,
   pour que les onglets et les fiches existent quand options.js les initialise.
   ========================================================================== */
(function () {
    'use strict';

    var DATA = window.C4_DATA && window.C4_DATA.phases && window.C4_DATA.phases['1'];
    var OPTIONS = window.C4_OPTIONS;
    var ENGINES = window.C4_ENGINES;
    if (!DATA || !OPTIONS || !ENGINES) return;

    function esc(t) {
        return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function swap(selector, html) {
        var holder = document.querySelector(selector);
        if (!holder) return;
        var tpl = document.createElement('template');
        tpl.innerHTML = html;
        holder.replaceWith(tpl.content);
    }

    // ---------- Finitions ----------

    function engineGroups(ids) {
        return ['Essence', 'Turbo Diesel'].map(function (fuel) {
            var list = ids.filter(function (id) { return ENGINES[id].fuel === fuel; });
            if (!list.length) return '';
            return '<p class="eng-group">' + fuel + '</p><ul class="chips">' + list.map(function (id) {
                return '<li>' + esc(ENGINES[id].name) + '<small>' + ENGINES[id].hp + ' ch</small></li>';
            }).join('') + '</ul>';
        }).join('');
    }

    function gradeHtml(body, g) {
        var level = '';
        for (var i = 0; i < g.levels; i++) level += '<i' + (i < g.level ? ' class="on"' : '') + '></i>';
        return '<li class="ladder-item"><details class="grade" id="finition-' + body + '-' + esc(g.id) + '">' +
            '<summary><span class="level" aria-hidden="true">' + level + '</span>' +
            '<span class="grade-main"><span class="grade-name">' + esc(g.name) + '</span><span class="grade-sub">' + esc(g.sub) + '</span></span>' +
            '<span class="grade-facts">' + g.facts.map(function (f) { return '<span class="fact">' + esc(f) + '</span>'; }).join('') + '</span>' +
            '<span class="grade-toggle" aria-hidden="true"></span></summary>' +
            '<div class="grade-body"><p class="gb-inherit">' + esc(g.inherit) + '</p>' +
            '<div class="gb-col"><h4>Équipements</h4><p class="gb-note">' + esc(g.note) + '</p>' +
            '<ul class="check-list check-list--long">' + g.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' +
            '<div class="gb-col"><h4>Motorisations</h4>' + engineGroups(g.engines) + '</div></div></details></li>';
    }

    function bodyHtml(key, b) {
        var nGrades = 0, engines = {};
        b.poles.forEach(function (p) {
            nGrades += p.grades.length;
            p.grades.forEach(function (g) { g.engines.forEach(function (e) { engines[e] = true; }); });
        });
        var poles = b.poles.map(function (p) {
            var n = p.grades.length;
            return '<section class="pole" aria-labelledby="' + esc(p.id) + '"><header class="pole-head"><p class="pole-kicker">Pôle</p>' +
                '<h4 class="pole-name" id="' + esc(p.id) + '">' + esc(p.name) + '</h4><p class="pole-count">' + n + ' finitions</p></header>' +
                '<ol class="ladder ladder--' + n + '">' + p.grades.map(function (g) { return gradeHtml(key, g); }).join('') + '</ol></section>';
        }).join('');
        return '<div class="body-panel" data-body-panel="' + key + '"><div class="panel-head">' +
            '<h3 class="panel-title">' + esc(b.label) + ' <span>' + esc(b.sub) + '</span></h3>' +
            '<ul class="figures"><li><strong>' + nGrades + '</strong><span>finitions</span></li>' +
            '<li><strong>' + b.poles.length + '</strong><span>pôles</span></li>' +
            '<li><strong>' + Object.keys(engines).length + '</strong><span>motorisations</span></li></ul></div>' +
            '<div class="poles-stack">' + poles + '</div></div>';
    }

    swap('[data-render="finitions"]', ['berline', 'coupe'].filter(function (k) { return DATA[k]; }).map(function (k) { return bodyHtml(k, DATA[k]); }).join(''));

    // ---------- Équipements ----------

    var CATS = [['Confort', 'eq-confort'], ['Sécurité', 'eq-securite'], ['Technologie', 'eq-technologie']];
    var shown = OPTIONS.filter(function (o) { return !o.extra; }); // les ajouts du projet ne sont pas des fiches Citroën

    var tabs = '<div class="eq-tabs" aria-label="Catégories d’équipements">' + CATS.map(function (c) {
        var n = shown.filter(function (o) { return o.cat === c[0]; }).length;
        return '<button type="button" data-eq-tab="' + c[1] + '">' + c[0] + ' <b>' + n + '</b></button>';
    }).join('') + '</div>';

    var panels = CATS.map(function (c) {
        var items = shown.filter(function (o) { return o.cat === c[0]; }).map(function (o) {
            return '<li><details class="eq' + (o.pack ? ' eq--pack' : '') + '"><summary class="eq-face">' +
                '<img class="eq-img" src="../assets/equipements/' + esc(o.img) + '" alt="" width="210" height="160" loading="lazy" decoding="async">' +
                '<span class="eq-name">' + esc(o.name) + '</span><span class="eq-plus" aria-hidden="true"></span></summary>' +
                '<div class="eq-refs"><p class="eq-refs-title">Fiche Citroën</p><p class="eq-desc">' + esc(o.desc) + '</p></div></details></li>';
        }).join('');
        return '<div class="eq-panel" id="' + c[1] + '"><h3 class="eq-title">' + c[0] + '</h3><ul class="eq-grid">' + items + '</ul></div>';
    }).join('');

    swap('[data-render="equipements"]', tabs + panels);
})();