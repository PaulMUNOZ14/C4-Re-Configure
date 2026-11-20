/* ==========================================================================
   Génération de la « facture simulée » en PDF (jsPDF, chargé avant ce script).
   Document fictif : aucune valeur contractuelle ni comptable, aucun logo ni
   aucune coordonnée de constructeur ou de concessionnaire réel.
   ========================================================================== */
(function () {
    'use strict';

    var TVA = 0.196; // taux normal en France de 2000 à 2013

    function money(n) {
        var s = (Math.round(n * 100) / 100).toFixed(2).split('.');
        s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return s[0] + ',' + s[1] + ' €';
    }

    function ht(ttc) { return Math.round(ttc / (1 + TVA) * 100) / 100; }

    function hash(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
        return ('00000' + h).slice(-5);
    }

    var DATES = {
        '1': { label: '14 mars 2006', code: '2006' },
        '2': { label: '9 octobre 2009', code: '2009' }
    };

    /**
     * cfg = {
     *   client, phase, carrosserie, finition, motorisation, puissance,
     *   vehicule (TTC), options: [{ name, price }], frais (TTC)
     * }
     */
    function generate(cfg) {
        var jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) throw new Error('jsPDF indisponible');

        var d = DATES[cfg.phase] || DATES['1'];
        var doc = new jsPDF({ unit: 'mm', format: 'a4' });
        var W = 210, M = 15, R = W - M;

        // En-tête
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(1, 2, 5);
        doc.setFontSize(17);
        doc.text('C4 RE:CONFIGURE', M, 24);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(110);
        doc.text('Concession fictive · document de démonstration', M, 29.5);
        doc.text('Projet indépendant, non affilié à un constructeur', M, 34);

        var num = 'SIM-' + d.code + '-' + hash([cfg.phase, cfg.carrosserie, cfg.finition, cfg.motorisation].join('|'));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(1, 2, 5);
        doc.text('FACTURE', R, 25, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text('N° ' + num, R, 31, { align: 'right' });
        doc.text('Date : ' + d.label, R, 36, { align: 'right' });

        doc.setDrawColor(1, 2, 5);
        doc.setLineWidth(0.6);
        doc.line(M, 42, R, 42);

        // Client et véhicule
        function block(x, y, title, lines) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(110);
            doc.text(title.toUpperCase(), x, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(1, 2, 5);
            lines.forEach(function (l, i) { doc.text(l, x, y + 6 + i * 5.2); });
        }

        block(M, 51, 'Facturé à', [cfg.client || 'Client exemple', 'Adresse fictive', '00000 Ville exemple']);
        block(110, 51, 'Véhicule', [
            'Citroën C4 ' + cfg.carrosserie,
            cfg.finition + ' · Phase ' + (cfg.phase === '2' ? 'II' : 'I'),
            cfg.motorisation + (cfg.puissance ? ' (' + cfg.puissance + ' ch)' : ''),
            'Modèle neuf, livraison : ' + d.label
        ]);

        // Tableau
        var y = 82;
        doc.setFillColor(1, 2, 5);
        doc.rect(M, y, R - M, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255);
        doc.text('DÉSIGNATION', M + 3, y + 5.4);
        doc.text('QTÉ', 128, y + 5.4, { align: 'right' });
        doc.text('PRIX HT', 160, y + 5.4, { align: 'right' });
        doc.text('PRIX TTC', R - 3, y + 5.4, { align: 'right' });
        y += 8;

        var rows = [{ name: 'Citroën C4 ' + cfg.carrosserie + ' · ' + cfg.finition, sub: cfg.motorisation, price: cfg.vehicule }];
        (cfg.options || []).forEach(function (o) { rows.push({ name: (o.included ? '\u00C9quipement inclus : ' : 'Option : ') + o.name, price: o.price, included: o.included }); });
        rows.push({ name: 'Frais de mise à disposition', price: cfg.frais });

        var totalHt = 0, totalTtc = 0;
        doc.setTextColor(1, 2, 5);
        rows.forEach(function (r, i) {
            var h = r.sub ? 12 : (rows.length > 11 ? 6.8 : 8.5);
            if (i % 2 === 1) { doc.setFillColor(246, 247, 249); doc.rect(M, y, R - M, h, 'F'); }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.text(r.name, M + 3, y + 5.6);
            if (r.sub) { doc.setFontSize(8.5); doc.setTextColor(110); doc.text(r.sub, M + 3, y + 10); doc.setTextColor(1, 2, 5); doc.setFontSize(9.5); }
            var lineHt = ht(r.price);
            totalHt += lineHt; totalTtc += r.price;
            doc.text('1', 128, y + 5.6, { align: 'right' });
            doc.text(r.included ? '\u2014' : money(lineHt), 160, y + 5.6 - (h < 8 ? 0.8 : 0), { align: 'right' });
            doc.text(r.included ? 'inclus' : money(r.price), R - 3, y + 5.6 - (h < 8 ? 0.8 : 0), { align: 'right' });
            y += h;
        });
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(M, y, R, y);

        // Totaux
        y += 10;
        var lx = 125, rx = R - 3;
        doc.setFontSize(10);
        doc.text('Total HT', lx, y);
        doc.text(money(totalHt), rx, y, { align: 'right' });
        y += 6;
        doc.text('TVA 19,6 %', lx, y);
        doc.text(money(totalTtc - totalHt), rx, y, { align: 'right' });
        y += 4;
        doc.setDrawColor(1, 2, 5);
        doc.setLineWidth(0.5);
        doc.line(lx, y, R, y);
        y += 7;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('TOTAL TTC', lx, y);
        doc.text(money(totalTtc), rx, y, { align: 'right' });

        // Mentions
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110);
        var notes = [
            'Certificat d’immatriculation (carte grise) non inclus.',
            'Prix indicatifs estimés par C4 Re:Configure : ils ne correspondent pas aux tarifs officiels du constructeur.',
            'Document fictif généré par un configurateur de démonstration : sans valeur contractuelle, comptable ou juridique.'
        ];
        var ny = 262;
        notes.forEach(function (t, i) { doc.text(doc.splitTextToSize(t, R - M)[0], M, ny + i * 4.4); });

        // Filigrane, par-dessus le contenu avec transparence
        doc.setGState(new doc.GState({ opacity: 0.08 }));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(86);
        doc.setTextColor(1, 2, 5);
        var tw = doc.getTextWidth('SIMULATION'), a = 35 * Math.PI / 180;
        doc.text('SIMULATION', W / 2 - (tw / 2) * Math.cos(a), 160 + (tw / 2) * Math.sin(a), { angle: 35 });
        doc.setGState(new doc.GState({ opacity: 1 }));

        var file = 'facture-simulee-c4-' + num.toLowerCase() + '.pdf';
        return { doc: doc, file: file, save: function () { doc.save(file); } };
    }

    window.C4Facture = { generate: generate, money: money };
})();