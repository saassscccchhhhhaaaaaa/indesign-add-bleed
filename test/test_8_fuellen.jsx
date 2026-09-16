// Fuellen in InDesign (inhaltsbasiert, echtes Photoshop)
test("Fuellen: Bild oben/links, neu verknuepft, Originalpixel bleiben", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var r = BE.processFrame(f, "fill-ca", B9);
    check(r === null, "Ergebnis " + r);
    var g = f.allGraphics[0];
    check(/^fixture_beschnitt(-\d+)?\.psd$/.test(g.itemLink.name), "Link " + g.itemLink.name);
    near(f.geometricBounds, [-9, -9, 100, 100], "Rahmen");
    near(g.geometricBounds, [-12, -12, 100, 100], "Grafik (12 px = 12 pt ergaenzt)");
});

test("Fuellen: Bild reicht -> kein Photoshop, Link bleibt", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], FIX.png, [-20, -20, 120, 120]);
    check(BE.processFrame(f, "fill-ca", B9) === null, "Ergebnis");
    check(f.allGraphics[0].itemLink.name === "fixture.png", "Link " + f.allGraphics[0].itemLink.name);
    near(f.geometricBounds, [-9, -9, 100, 100], "Rahmen");
});

test("Fuellen: PDF unten/rechts wird Bild", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [200, 100, 300, 200], FIX.pdf);
    check(BE.processFrame(f, "fill-ca", B9) === null, "Ergebnis");
    var g = f.allGraphics[0], gb = g.geometricBounds;
    check(g.constructor.name === "Image", "Typ " + g.constructor.name);
    near([gb[0], gb[1]], [200, 100], "oben/links unveraendert");
    check(gb[2] >= 309 - BE.EPS && gb[3] >= 209 - BE.EPS, "deckt Ziel ab: " + gb);
    near(f.geometricBounds, [200, 100, 309, 209], "Rahmen");
});

test("checkFillable: fehlende Verknuepfung", function () {
    var doc = FIX.doc({ facing: false });
    var tmp = File(FIX.out.fsName + "/tmp_missing.png");
    FIX.png.copy(tmp);
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], tmp);
    tmp.remove();
    check(BE.checkFillable(f) === "Verkn\u00fcpfung fehlt oder ist nicht aktuell", "Grund: " + BE.checkFillable(f));
});

test("process: Fuellen meldet neue PSD-Dateien", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var calls = [];
    var res = BE.process([f], "fill-ca", B9, function (i, n, name) { calls.push(i + "/" + n); });
    check(res.done === 1 && res.created.length === 1, "created " + res.created.length);
    check(calls.join(",") === "1/1", "Fortschritt " + calls.join(","));
    check(BE.formatSummary(res).indexOf("1 neue PSD-Datei") > 0, BE.formatSummary(res));
});
