(function () {
    'use strict';

    var root = document.querySelector('[data-configurator]');
    if (!root) return;

    // ---------- Données ----------
    // PRIX : estimations indicatives en € TTC, non officielles.
    // Seul point d'ancrage relevé : C4 1.6 HDi 110 FAP Pack Ambiance = 23 500 € TTC (tarif du 01/11/2004, L'argus).
    // Prix d'un véhicule = base de la finition + supplément de motorisation.

    var FEES = 380; // frais de mise à disposition (TTC)

    // Toutes les données viennent de js/donnees.js (généré à partir de options.html) :
    //   C4_ENGINES : motorisations (nom, puissance, vitesse, conso, supplément de prix)
    //   C4_OPTIONS : équipements (descriptions complètes, prix estimés, ce qu'un pack comprend, incompatibilités)
    //   C4_DATA    : finitions par phase / carrosserie / pôle (prix de base, motorisations, équipements inclus)
    var ENGINES = window.C4_ENGINES || {};
    var OPTIONS = window.C4_OPTIONS || [];
    var DATA = {};
    var INCLUDED = {};   // 'carrosserie/finition' -> équipements inclus (héritage « reprend… » déjà résolu)
    var PHASES = (window.C4_DATA && window.C4_DATA.phases) || {};
    Object.keys(PHASES).forEach(function (ph) {
        DATA[ph] = {};
        Object.keys(PHASES[ph]).forEach(function (body) {
            DATA[ph][body] = PHASES[ph][body].poles;
            PHASES[ph][body].poles.forEach(function (p) {
                p.grades.forEach(function (g) { INCLUDED[body + '/' + g.id] = g.inc || {}; });
            });
        });
    });
    var OPT_BY_ID = {};
    OPTIONS.forEach(function (o) { OPT_BY_ID[o.id] = o; });

    function optLabel(o) { return o.name.replace(/"/g, ''); }
    function firstSentence(t) {
        var m = /^(.{60,160}?[.!?])(\s|$)/.exec(t);
        return m ? m[1] : (t.length > 150 ? t.slice(0, 150).replace(/\s+\S*$/, '') + '…' : t);
    }
    var OPT_CATS = ['Confort', 'Sécurité', 'Technologie'];

    var LABELS = {
        phase: { '1': 'Phase I', '2': 'Phase II' },
        carrosserie: { berline: 'Berline · 5 portes', coupe: 'Coupé · 3 portes' }
    };

    // ---------- État ----------

    var state = { phase: null, carrosserie: null, finition: null, motorisation: null, options: [] };

    function $(sel) { return root.querySelector(sel); }
    function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

    function euro(n) { return n.toLocaleString('fr-FR') + ' €'; }

    function poles() {
        return (DATA[state.phase] && DATA[state.phase][state.carrosserie]) || null;
    }

    function findGrade() {
        var list = poles();
        if (!list || !state.finition) return null;
        for (var i = 0; i < list.length; i++) {
            for (var j = 0; j < list[i].grades.length; j++) {
                if (list[i].grades[j].id === state.finition) return list[i].grades[j];
            }
        }
        return null;
    }

    function vehiclePrice() {
        var g = findGrade();
        var e = state.motorisation ? ENGINES[state.motorisation] : null;
        return g && e ? g.base + e.supp : null;
    }

    function engineOk(c, engine) {
        if (!c) return true;
        if (c.only && (!engine || c.only.indexOf(engine) === -1)) return false;
        if (c.not && engine && c.not.indexOf(engine) !== -1) return false;
        return true;
    }

    function addWithIncludes(map, id, source, note) {
        if (map[id]) return;
        map[id] = { source: source, note: note || '' };
        (OPT_BY_ID[id].includes || []).forEach(function (sub) {
            addWithIncludes(map, sub, 'inclus', 'Inclus avec ' + optLabel(OPT_BY_ID[id]));
        });
    }

    // Équipements déjà présents : de série (toute C4), inclus dans la finition, ou embarqués par un autre équipement choisi.
    function included() {
        var map = {};
        OPTIONS.forEach(function (o) { if (o.base) map[o.id] = { source: 'base', note: 'De série sur toutes les C4' }; });
        var key = state.carrosserie + '/' + state.finition;
        var inc = state.finition ? (INCLUDED[key] || {}) : {};
        Object.keys(inc).forEach(function (id) {
            if (engineOk(inc[id], state.motorisation)) addWithIncludes(map, id, 'finition', inc[id].n);
        });
        state.options.forEach(function (id) { if (!map[id] && available(OPT_BY_ID[id])) addWithIncludes(map, id, 'choisi'); });
        // un équipement choisi n'est pas « inclus » : on garde seulement ce qu'il embarque
        state.options.forEach(function (id) { if (map[id] && map[id].source === 'choisi') delete map[id]; });
        return map;
    }

    function available(o) {
        if (!o || o.base) return false;
        if (o.parent) return false;
        if (o.only && o.only.indexOf(state.carrosserie + '/' + state.finition) === -1) return false;
        return true;
    }

    // Options réellement facturées : choisies, et pas déjà incluses par ailleurs
    function paidOptions() {
        var inc = included();
        return state.options.filter(function (id) { return !inc[id] && available(OPT_BY_ID[id]); });
    }

    function optionsTotal() {
        return paidOptions().reduce(function (sum, id) { return sum + OPT_BY_ID[id].price; }, 0);
    }

    // ---------- Rendu ----------

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text) n.textContent = text;
        return n;
    }

    function choiceButton(value, title, sub, pressed) {
        var b = el('button', 'cfg-choice');
        b.type = 'button';
        b.setAttribute('data-value', value);
        b.setAttribute('aria-pressed', String(pressed));
        b.appendChild(el('strong', null, title));
        if (sub) b.appendChild(el('span', null, sub));
        return b;
    }

    function renderFinitions() {
        var host = $('[data-list="finition"]');
        var hint = $('[data-hint="finition"]');
        host.textContent = '';

        if (!state.phase || !state.carrosserie) {
            hint.hidden = false;
            hint.textContent = 'Choisissez d’abord une phase et une carrosserie.';
            return;
        }
        var list = poles();
        if (!list) {
            hint.hidden = false;
            hint.textContent = 'Les finitions de la Phase II ne sont pas encore renseignées. Elles arriveront bientôt.';
            return;
        }
        hint.hidden = true;

        list.forEach(function (pole) {
            var wrap = el('div', 'cfg-pole');
            wrap.appendChild(el('h4', 'cfg-pole-name', 'Pôle ' + pole.name));
            var grid = el('div', 'cfg-choices cfg-choices--grades');
            pole.grades.forEach(function (g) {
                var n = g.engines.length;
                var sub = n + (n > 1 ? ' motorisations' : ' motorisation') + ' · dès ' + euro(g.base + Math.min.apply(null, g.engines.map(function (id) { return ENGINES[id].supp; })));
                var b = choiceButton(g.id, g.name, sub, state.finition === g.id);
                b.addEventListener('click', function () { set('finition', g.id); });
                grid.appendChild(b);
            });
            wrap.appendChild(grid);
            host.appendChild(wrap);
        });
    }

    function renderEngines() {
        var host = $('[data-list="motorisation"]');
        var hint = $('[data-hint="motorisation"]');
        host.textContent = '';

        var grade = findGrade();
        if (!grade) {
            hint.hidden = false;
            hint.textContent = 'Choisissez d’abord une finition.';
            return;
        }
        hint.hidden = true;

        ['Essence', 'Turbo Diesel'].forEach(function (fuel) {
            var ids = grade.engines.filter(function (id) { return ENGINES[id].fuel === fuel; });
            if (!ids.length) return;
            var wrap = el('div', 'cfg-fuel');
            wrap.appendChild(el('h4', 'cfg-fuel-name', fuel));
            var grid = el('div', 'cfg-choices cfg-choices--engines');
            ids.forEach(function (id) {
                var e = ENGINES[id];
                var b = choiceButton(id, e.name, e.hp + ' ch · ' + euro(grade.base + e.supp), state.motorisation === id);
                b.addEventListener('click', function () { set('motorisation', id); });
                grid.appendChild(b);
            });
            wrap.appendChild(grid);
            host.appendChild(wrap);
        });
    }

    function renderOptions() {
        var host = $('[data-list="options"]');
        var hint = $('[data-hint="options"]');
        host.textContent = '';

        if (!findGrade()) {
            hint.hidden = false;
            return;
        }
        hint.hidden = true;
        normalizeOptions();
        var gkey = state.carrosserie + '/' + state.finition;
        var inc0 = included();

        function row(o) {
            var lab = el('label', 'cfg-option');
            lab.setAttribute('data-opt', o.id);
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.value = o.id;
            input.addEventListener('change', function () { toggleOption(o.id, input.checked); });
            var txt = el('span', 'cfg-option-text');
            txt.appendChild(el('strong', null, optLabel(o)));
            txt.appendChild(el('small', 'cfg-option-desc', firstSentence(o.desc)));
            if (o.desc.length > firstSentence(o.desc).length) {
                var more = el('details', 'cfg-more');
                more.appendChild(el('summary', null, 'Voir la fiche complète'));
                more.appendChild(el('p', null, o.desc));
                txt.appendChild(more);
            }
            txt.appendChild(el('small', 'cfg-option-note'));
            lab.appendChild(input);
            lab.appendChild(txt);
            lab.appendChild(el('span', 'cfg-option-price'));
            return lab;
        }

        OPT_CATS.forEach(function (cat) {
            var items = OPTIONS.filter(function (o) { return o.cat === cat && !o.base && (!o.only || o.only.indexOf(gkey) !== -1 || inc0[o.id]); });
            if (!items.length) return;
            var wrap = el('fieldset', 'cfg-optgroup');
            wrap.appendChild(el('legend', 'cfg-pole-name', cat));
            items.forEach(function (o) { wrap.appendChild(row(o)); });
            host.appendChild(wrap);
        });

        var base = OPTIONS.filter(function (o) { return o.base; });
        var det = el('details', 'cfg-base');
        det.appendChild(el('summary', null, 'De série sur toutes les C4 (' + base.length + ')'));
        var list = el('div', 'cfg-base-list');
        base.forEach(function (o) {
            var lab = el('label', 'cfg-option cfg-option--compact');
            lab.setAttribute('data-opt', o.id);
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.value = o.id;
            lab.appendChild(input);
            var t = el('span', 'cfg-option-text');
            t.appendChild(el('strong', null, optLabel(o)));
            lab.appendChild(t);
            lab.appendChild(el('span', 'cfg-option-price'));
            list.appendChild(lab);
        });
        det.appendChild(list);
        host.appendChild(det);

        refreshOptions();
    }

    // Incompatibilités déclarées dans un sens ou dans l'autre
    function incompatibleWith(id) {
        var out = (OPT_BY_ID[id].incompatible || []).slice();
        OPTIONS.forEach(function (o) { if ((o.incompatible || []).indexOf(id) !== -1 && out.indexOf(o.id) === -1) out.push(o.id); });
        return out;
    }

    // Toutes les options qu'un équipement embarque (récursif)
    function expand(id, seen) {
        seen = seen || {};
        (OPT_BY_ID[id].includes || []).forEach(function (sub) {
            if (!seen[sub]) { seen[sub] = true; expand(sub, seen); }
        });
        return Object.keys(seen);
    }

    // Un équipement déjà inclus (série, finition) qui interdit cette option
    function blockedBy(o, inc) {
        var list = incompatibleWith(o.id);
        for (var i = 0; i < list.length; i++) if (inc[list[i]]) return OPT_BY_ID[list[i]];
        return null;
    }

    // Met à jour en place l'état des cases (sans reconstruire la liste, pour garder le focus clavier)
    function refreshOptions() {
        var inc = included();
        $$('[data-list="options"] .cfg-option').forEach(function (lab) {
            var id = lab.getAttribute('data-opt');
            var o = OPT_BY_ID[id];
            var input = lab.querySelector('input');
            var note = lab.querySelector('.cfg-option-note');
            var price = lab.querySelector('.cfg-option-price');
            var locked = !!inc[id];
            var orphan = !locked && o.parent;            // GPS / mains-libres : seulement avec NaviDrive
            var blocker = !locked && !orphan ? blockedBy(o, inc) : null;
            input.checked = locked || state.options.indexOf(id) !== -1;
            input.disabled = locked || !!orphan || !!blocker;
            lab.classList.toggle('is-locked', locked);
            lab.classList.toggle('is-orphan', !!orphan || !!blocker);
            if (note) {
                note.textContent = locked && inc[id].source !== 'base' ? inc[id].note
                    : orphan ? 'Disponible avec ' + optLabel(OPT_BY_ID[o.parent]) + '.'
                        : blocker ? 'Incompatible avec ' + optLabel(blocker) + ', déjà inclus dans votre configuration.' : '';
                note.hidden = !note.textContent;
            }
            if (locked) {
                price.textContent = inc[id].source === 'base' ? 'Série' : 'Inclus';
                price.classList.add('is-included');
                lab.title = 'Déjà inclus : ne peut pas être décoché.';
            } else {
                price.textContent = orphan || blocker ? '—' : '+ ' + euro(o.price);
                price.classList.remove('is-included');
                lab.removeAttribute('title');
            }
        });
    }

    // Retire des choix ceux devenus inutiles : déjà inclus par la finition, non proposés, comprise dans un pack
    // choisi, ou incompatibles (utile surtout au rechargement depuis une adresse partagée)
    function normalizeOptions() {
        var inc = {};
        var key = state.carrosserie + '/' + state.finition;
        var fin = state.finition ? (INCLUDED[key] || {}) : {};
        Object.keys(fin).forEach(function (id) { if (engineOk(fin[id], state.motorisation)) addWithIncludes(inc, id, 'finition', fin[id].n); });
        var wanted = OPTIONS.filter(function (o) { return state.options.indexOf(o.id) !== -1 && available(o) && !inc[o.id] && !blockedBy(o, inc); });
        var kept = [];
        wanted.forEach(function (o) {
            var absorbed = wanted.some(function (other) { return other !== o && expand(other.id).indexOf(o.id) !== -1; });
            var clash = kept.some(function (k) { return incompatibleWith(o.id).indexOf(k.id) !== -1; });
            if (!absorbed && !clash) kept.push(o);
        });
        state.options = kept.map(function (o) { return o.id; });
    }

    function setRecap(key, text) {
        var dd = $('[data-recap="' + key + '"]');
        dd.textContent = text || 'À choisir';
        dd.classList.toggle('is-empty', !text);
    }

    function renderSummary() {
        setRecap('phase', LABELS.phase[state.phase]);
        setRecap('carrosserie', LABELS.carrosserie[state.carrosserie]);
        var grade = findGrade();
        setRecap('finition', grade ? grade.name : null);
        var eng = state.motorisation ? ENGINES[state.motorisation] : null;
        setRecap('motorisation', eng ? eng.name : null);

        var n = paidOptions().length;
        var optDd = $('[data-recap="options"]');
        optDd.textContent = n ? n + (n > 1 ? ' sélectionnées' : ' sélectionnée') : 'Aucune';
        optDd.classList.toggle('is-empty', !n);

        var specs = $('[data-specs]');
        specs.hidden = !eng;
        if (eng) {
            $('[data-spec="puissance"]').textContent = eng.hp + ' ch';
            $('[data-spec="vitesse"]').textContent = eng.speed + ' km/h';
            $('[data-spec="conso"]').textContent = eng.conso;
        }

        // Prix
        var vp = vehiclePrice();
        var price = $('[data-price]');
        price.hidden = vp === null;
        $('[data-invoice]').disabled = vp === null;
        if (vp !== null) {
            var ot = optionsTotal();
            $('[data-price-vehicle]').textContent = euro(vp);
            $('[data-price-options]').textContent = ot ? '+ ' + euro(ot) : '—';
            $('[data-price-fees]').textContent = euro(FEES);
            $('[data-price-total]').textContent = euro(vp + ot + FEES);
        }

        var link = $('[data-equip-link]');
        link.hidden = !grade;
        if (grade) {
            link.querySelector('a').href = 'options.html?carrosserie=' + state.carrosserie +
                '#finition-' + state.carrosserie + '-' + grade.id;
        }

        // Visuel : images/c4-{carrosserie}-phase{n}.jpg (cadre indicatif si le fichier est absent)
        var visual = $('[data-visual]');
        var img = visual.querySelector('img');
        if (state.phase && state.carrosserie) {
            var file = 'images/c4-' + state.carrosserie + '-phase' + state.phase + '.jpg';
            visual.setAttribute('data-label', 'Image introuvable : ' + file + ' (5:4)');
            visual.classList.remove('is-missing');
            img.hidden = false;
            img.onerror = function () { visual.classList.add('is-missing'); };
            img.src = '../' + file;
        } else {
            img.hidden = true;
            img.removeAttribute('src');
            visual.setAttribute('data-label', 'Choisissez une phase et une carrosserie');
            visual.classList.add('is-missing');
        }
    }

    function renderToggles() {
        ['phase', 'carrosserie'].forEach(function (key) {
            $$('[data-choices="' + key + '"] .cfg-choice').forEach(function (b) {
                b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === state[key]));
            });
        });
    }

    function render() {
        renderToggles();
        renderFinitions();
        renderEngines();
        renderOptions();
        renderSummary();
        syncUrl();
    }

    // ---------- Actions ----------

    function set(key, value) {
        state[key] = value;
        if (key === 'phase' || key === 'carrosserie') { state.finition = null; state.motorisation = null; }
        if (key === 'finition') {
            var g = findGrade();
            if (!g || (state.motorisation && g.engines.indexOf(state.motorisation) === -1)) state.motorisation = null;
        }
        render();
    }

    // Options déjà choisies qui seraient en doublon ou en conflit avec l'ajout de `id`
    function conflicts(id) {
        var inside = expand(id);
        var clash = incompatibleWith(id);
        var out = [];
        state.options.forEach(function (x) {
            if (x === id) return;
            if (inside.indexOf(x) !== -1) out.push({ id: x, why: 'inclus' });
            else if (clash.indexOf(x) !== -1) out.push({ id: x, why: 'incompatible' });
        });
        return out;
    }

    var dialog = $('[data-dialog]');

    // Fenêtre de confirmation. done(true) si l'utilisateur accepte de retirer ces options.
    function askRemoval(opt, list, done) {
        var dup = list.filter(function (c) { return c.why === 'inclus'; });
        var bad = list.filter(function (c) { return c.why === 'incompatible'; });
        function names(arr) { return arr.map(function (c) { return optLabel(OPT_BY_ID[c.id]) + ' (' + euro(OPT_BY_ID[c.id].price) + ')'; }); }

        var plain = '';
        if (dup.length) plain += optLabel(opt) + ' comprend déjà : ' + names(dup).join(', ') + '. Ces options seront retirées de votre sélection pour ne pas être comptées deux fois.\n\n';
        if (bad.length) plain += optLabel(opt) + ' n’est pas compatible avec : ' + names(bad).join(', ') + '. Ces options seront retirées de votre sélection.\n\n';
        plain += 'Continuer ?';

        if (!dialog || typeof dialog.showModal !== 'function') { done(window.confirm(plain)); return; }

        $('[data-dialog-title]').textContent = 'Ajouter « ' + optLabel(opt) + ' » ?';
        var body = $('[data-dialog-body]');
        body.textContent = '';
        function block(text, arr, tone) {
            if (!arr.length) return;
            body.appendChild(el('p', null, text));
            var ul = el('ul', 'cfg-dialog-list');
            arr.forEach(function (c) {
                var li = el('li', null);
                li.appendChild(el('span', null, optLabel(OPT_BY_ID[c.id])));
                li.appendChild(el('b', null, '− ' + euro(OPT_BY_ID[c.id].price)));
                ul.appendChild(li);
            });
            body.appendChild(ul);
        }
        block(optLabel(opt) + ' comprend déjà ' + (dup.length > 1 ? 'ces options' : 'cette option') + ' : elle' + (dup.length > 1 ? 's seront retirées' : ' sera retirée') + ' de votre sélection pour ne pas être comptée' + (dup.length > 1 ? 's' : '') + ' deux fois.', dup);
        block(optLabel(opt) + ' n’est pas compatible avec ' + (bad.length > 1 ? 'ces options' : 'cette option') + ' : elle' + (bad.length > 1 ? 's seront retirées' : ' sera retirée') + ' de votre sélection.', bad);

        var onClose = function () {
            dialog.removeEventListener('close', onClose);
            done(dialog.returnValue === 'ok');
        };
        dialog.returnValue = 'cancel';
        dialog.addEventListener('close', onClose);
        dialog.showModal();
    }

    if (dialog) {
        // clic sur le fond = annuler
        dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close('cancel'); });
    }

    function commit(id, on) {
        var list = state.options.filter(function (x) { return x !== id; });
        if (on) list.push(id);
        // Ordre stable, celui du catalogue
        state.options = OPTIONS.map(function (o) { return o.id; }).filter(function (x) { return list.indexOf(x) !== -1; });
        normalizeOptions();
        refreshOptions();
        renderSummary();
        syncUrl();
    }

    function toggleOption(id, on) {
        if (!on) { commit(id, false); return; }
        var list = conflicts(id);
        if (!list.length) { commit(id, true); return; }
        askRemoval(OPT_BY_ID[id], list, function (ok) {
            if (!ok) { refreshOptions(); return; }               // annulé : la case reprend son état
            state.options = state.options.filter(function (x) { return !list.some(function (c) { return c.id === x; }); });
            commit(id, true);
        });
    }

    $$('[data-choices]').forEach(function (group) {
        var key = group.getAttribute('data-choices');
        Array.prototype.forEach.call(group.querySelectorAll('.cfg-choice'), function (b) {
            b.addEventListener('click', function () { set(key, b.getAttribute('data-value')); });
        });
    });

    $('[data-reset]').addEventListener('click', function () {
        state = { phase: null, carrosserie: null, finition: null, motorisation: null, options: [] };
        render();
    });

    // ---------- Facture PDF ----------

    var invoiceBtn = $('[data-invoice]');
    var invoiceMsg = $('[data-invoice-msg]');

    // Lignes d'options pour la facture : équipements inclus (à 0 €) puis options payantes
    function invoiceOptions() {
        var inc = included();
        var paid = paidOptions();
        return OPTIONS.filter(function (o) {
            return !o.base && (paid.indexOf(o.id) !== -1 || inc[o.id]);
        }).map(function (o) {
            return inc[o.id] ? { name: optLabel(o), price: 0, included: true } : { name: optLabel(o), price: o.price };
        });
    }

    invoiceBtn.addEventListener('click', function () {
        var grade = findGrade();
        var eng = state.motorisation ? ENGINES[state.motorisation] : null;
        invoiceMsg.textContent = '';
        if (!grade || !eng) return;
        if (!window.C4Facture || !window.jspdf) {
            invoiceMsg.textContent = 'Le générateur de PDF n’a pas pu se charger (connexion ?). Rechargez la page et réessayez.';
            return;
        }
        try {
            var name = ($('[data-client]').value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
            window.C4Facture.generate({
                client: name || 'Client exemple',
                phase: state.phase,
                carrosserie: state.carrosserie === 'coupe' ? 'Coupé (3 portes)' : 'Berline (5 portes)',
                finition: grade.name,
                motorisation: eng.name,
                puissance: eng.hp,
                vehicule: grade.base + eng.supp,
                options: invoiceOptions(),
                frais: FEES
            }).save();
        } catch (e) {
            invoiceMsg.textContent = 'La facture n’a pas pu être générée.';
        }
    });

    // ---------- Adresse (?phase=1&carrosserie=berline&finition=pack&motorisation=d110&options=navidrive,xenon) ----------

    function syncUrl() {
        try {
            var url = new URL(window.location.href);
            ['phase', 'carrosserie', 'finition', 'motorisation'].forEach(function (k) {
                if (state[k]) url.searchParams.set(k, state[k]);
                else url.searchParams.delete(k);
            });
            if (state.options.length) url.searchParams.set('options', state.options.join(','));
            else url.searchParams.delete('options');
            window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        } catch (e) { /* adresse non modifiable (ex. fichier local) : sans conséquence */ }
    }

    try {
        var q = new URLSearchParams(window.location.search);
        if (LABELS.phase[q.get('phase')]) state.phase = q.get('phase');
        if (LABELS.carrosserie[q.get('carrosserie')]) state.carrosserie = q.get('carrosserie');
        state.finition = q.get('finition');
        state.motorisation = q.get('motorisation');
        var g = findGrade();
        if (!g) { state.finition = null; state.motorisation = null; }
        else if (g.engines.indexOf(state.motorisation) === -1) state.motorisation = null;

        var wanted = (q.get('options') || '').split(',');
        state.options = OPTIONS.filter(function (o) { return wanted.indexOf(o.id) !== -1; }).map(function (o) { return o.id; });
    } catch (e) { /* ignoré */ }

    render();
})();