// Dokument-Helfer
test("withSettings: Punkt intern, Einstellungen wiederhergestellt", function () {
    var doc = FIX.doc({ facing: false });
    var sp = app.scriptPreferences, inside;
    sp.measurementUnit = MeasurementUnits.MILLIMETERS;
    try {
        doc.documentPreferences.documentBleedTopOffset = 3;
        doc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
        doc.zeroPoint = [10, 20];
        inside = BE.withSettings(doc, function () {
            return { bleed: BE.readBleed(doc), origin: doc.viewPreferences.rulerOrigin, zero: doc.zeroPoint };
        });
        near(inside.bleed.top, 3 * 72 / 25.4, "Beschnitt in pt");
        check(inside.origin == RulerOrigin.SPREAD_ORIGIN, "Ursprung Druckbogen");
        near(inside.zero, [0, 0], "Nullpunkt");
        check(sp.measurementUnit == MeasurementUnits.MILLIMETERS, "Einheit zurueck");
        check(doc.viewPreferences.rulerOrigin == RulerOrigin.PAGE_ORIGIN, "Ursprung zurueck");
        near(doc.zeroPoint, [10, 20], "Nullpunkt zurueck");
    } finally {
        sp.measurementUnit = MeasurementUnits.POINTS;
    }
});

test("withSettings: stellt auch nach Fehler wieder her", function () {
    var doc = FIX.doc({ facing: false }), thrown = false;
    doc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
    try { BE.withSettings(doc, function () { throw new Error("x"); }); } catch (e) { thrown = true; }
    check(thrown, "Fehler weitergereicht");
    check(doc.viewPreferences.rulerOrigin == RulerOrigin.PAGE_ORIGIN, "Ursprung zurueck");
    check(app.scriptPreferences.measurementUnit == MeasurementUnits.POINTS, "Einheit zurueck");
});

test("pageInfo: Einzelseite", function () {
    var doc = FIX.doc({ facing: false });
    var info = BE.pageInfo(FIX.frame(doc.pages[0], [0, 0, 100, 100]));
    near(info.page, [0, 0, 300, 200], "Seite");
    near([info.spreadLeft, info.spreadRight], [0, 200], "Bogen");
    check(info.leftSide === "inside" && info.rightSide === "outside", "Seiten " + info.leftSide + "/" + info.rightSide);
});

test("pageInfo: Doppelseite", function () {
    var doc = FIX.doc({ facing: true, pages: 3 });
    var left = doc.spreads[1].pages[0], right = doc.spreads[1].pages[1];
    var info = BE.pageInfo(FIX.frame(left, [0, left.bounds[1], 100, left.bounds[1] + 100]));
    near([info.spreadLeft, info.spreadRight], [left.bounds[1], right.bounds[3]], "Bogen");
    check(info.leftSide === "outside" && info.rightSide === "outside", "Seiten " + info.leftSide + "/" + info.rightSide);
    var single = BE.pageInfo(FIX.frame(doc.pages[0], [0, 0, 100, 100]));
    check(single.leftSide === "inside" && single.rightSide === "outside", "rechte Einzelseite");
});

test("resolveFrame: gueltige Rahmen", function () {
    var doc = FIX.doc({ facing: false });
    var img = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var pdf = FIX.frame(doc.pages[0], [0, 100, 100, 200], FIX.pdf);
    var r = BE.resolveFrame(img);
    check(r.frame.id === img.id && r.reason === null, "Bild: " + r.reason);
    r = BE.resolveFrame(pdf);
    check(r.reason === null, "PDF: " + r.reason);
    r = BE.resolveFrame(img.allGraphics[0]);
    check(r.frame.id === img.id && r.reason === null, "Grafik -> Rahmen: " + r.reason);
});

test("resolveFrame: ungueltige Objekte", function () {
    var doc = FIX.doc({ facing: false }), pg = doc.pages[0];
    function reason(item) { return BE.resolveFrame(item).reason; }
    check(reason(pg.textFrames.add({ geometricBounds: [0, 0, 50, 50] })) === "kein Bildrahmen", "Textrahmen");
    check(reason(pg.rectangles.add({ geometricBounds: [0, 0, 50, 50] })) === "Rahmen enth\u00e4lt keine Grafik", "leer");
    var oval = pg.ovals.add({ geometricBounds: [0, 0, 50, 50] });
    oval.place(FIX.png);
    check(reason(oval) === "keine Rechteckform", "Oval");
    var rot = FIX.frame(pg, [0, 0, 50, 50]);
    rot.rotationAngle = 10;
    check(reason(rot) === "gedreht oder verzerrt", "gedreht");
    var locked = FIX.frame(pg, [0, 0, 50, 50]);
    locked.locked = true;
    check(reason(locked) === "gesperrt", "gesperrt");
    var a = FIX.frame(pg, [0, 0, 50, 50]), b = FIX.frame(pg, [60, 0, 90, 50]);
    pg.parent.groups.add([a, b]);
    check(reason(doc.groups[0].rectangles[0]) === "liegt in einer Gruppe oder ist verankert", "in Gruppe");
    var off = FIX.frame(pg, [0, -60, 50, -20]);
    check(reason(off) === "liegt auf der Montagefl\u00e4che", "Montageflaeche");
});
