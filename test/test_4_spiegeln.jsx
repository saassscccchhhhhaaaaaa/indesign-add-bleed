// Methode Spiegeln
test("Spiegeln: oben + links, Gruppe mit Streifen und Ecke", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], FIX.png, [-10, -20, 110, 120]);
    var fid = f.id;
    check(BE.processFrame(f, "mirror", B9) === null, "Ergebnis");
    check(doc.groups.length === 1, "eine Gruppe");
    var grp = doc.groups[0];
    check(grp.pageItems.length === 4, "4 Objekte: " + grp.pageItems.length);
    var orig = grp.pageItems.itemByID(fid);
    near(orig.geometricBounds, [0, 0, 100, 100], "Original unveraendert");
    near(orig.allGraphics[0].geometricBounds, [-10, -20, 110, 120], "Original-Grafik unveraendert");
    var top = pieceAt(grp, [-9, 0, 0, 100]);
    check(top !== null, "Streifen oben vorhanden");
    if (top) {
        near(top.allGraphics[0].geometricBounds, [-110, -20, 10, 120], "Grafik oben gespiegelt");
        check(top.strokeWeight === 0, "keine Kontur");
    }
    var left = pieceAt(grp, [0, -9, 100, 0]);
    check(left !== null, "Streifen links vorhanden");
    if (left) near(left.allGraphics[0].geometricBounds, [-10, -120, 110, 20], "Grafik links gespiegelt");
    var corner = pieceAt(grp, [-9, -9, 0, 0]);
    check(corner !== null, "Ecke vorhanden");
    if (corner) near(corner.allGraphics[0].geometricBounds, [-110, -120, 10, 20], "Grafik Ecke gespiegelt");
});

test("Spiegeln: rechte Kante einer Doppelseite, Bund ohne Streifen", function () {
    var doc = FIX.doc({ facing: true, pages: 3, bleed: { top: 0, bottom: 0, inside: 3, outside: 12 } });
    var right = doc.spreads[1].pages[1], pb = right.bounds;
    var f = FIX.frame(right, [100, pb[1], 200, pb[3]]);
    check(BE.processFrame(f, "mirror", BE.readBleed(doc)) === null, "Ergebnis");
    var grp = doc.groups[0];
    check(grp.pageItems.length === 2, "Original + 1 Streifen: " + grp.pageItems.length);
    var strip = pieceAt(grp, [100, pb[3], 200, pb[3] + 12]);
    check(strip !== null, "Streifen rechts");
    if (strip) near(strip.allGraphics[0].geometricBounds, [100, pb[3], 200, pb[3] + 200], "Grafik gespiegelt");
});

test("Spiegeln: PDF unten rechts", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [200, 100, 300, 200], FIX.pdf);
    check(BE.processFrame(f, "mirror", B9) === null, "Ergebnis");
    var grp = doc.groups[0];
    check(grp.pageItems.length === 4, "Original + 2 Streifen + Ecke: " + grp.pageItems.length);
    check(pieceAt(grp, [300, 200, 309, 209]) !== null, "Ecke unten rechts");
    var items = grp.pageItems.everyItem().getElements(), pdfs = 0, i;
    for (i = 0; i < items.length; i++) if (items[i].allGraphics[0].constructor.name === "PDF") pdfs++;
    check(pdfs === 4, "alle Teile enthalten die PDF: " + pdfs);
});

test("Spiegeln: Kontur und Textumfluss nur am Original", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 50, 100, 150]);
    f.strokeWeight = 4;
    f.textWrapPreferences.textWrapMode = TextWrapModes.BOUNDING_BOX_TEXT_WRAP;
    check(BE.processFrame(f, "mirror", B9) === null, "Ergebnis");
    var grp = doc.groups[0];
    var strip = pieceAt(grp, [-9, 50, 0, 150]);
    check(strip !== null, "Streifen oben");
    if (strip) {
        check(strip.strokeWeight === 0, "Kontur entfernt");
        check(strip.textWrapPreferences.textWrapMode == TextWrapModes.NONE, "kein Textumfluss");
    }
    var orig = pieceAt(grp, [0, 50, 100, 150]);
    check(orig !== null && orig.strokeWeight === 4, "Original behaelt Kontur");
});
