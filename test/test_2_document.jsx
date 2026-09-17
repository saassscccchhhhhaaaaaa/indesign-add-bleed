// Document helpers
test("withSettings: points inside, settings restored", function () {
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
        near(inside.bleed.top, 3 * 72 / 25.4, "bleed in pt");
        check(inside.origin == RulerOrigin.SPREAD_ORIGIN, "spread origin");
        near(inside.zero, [0, 0], "zero point");
        check(sp.measurementUnit == MeasurementUnits.MILLIMETERS, "unit restored");
        check(doc.viewPreferences.rulerOrigin == RulerOrigin.PAGE_ORIGIN, "origin restored");
        near(doc.zeroPoint, [10, 20], "zero point restored");
    } finally {
        sp.measurementUnit = MeasurementUnits.POINTS;
    }
});

test("withSettings: restores after an error too", function () {
    var doc = FIX.doc({ facing: false }), thrown = false;
    doc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
    try { BE.withSettings(doc, function () { throw new Error("x"); }); } catch (e) { thrown = true; }
    check(thrown, "error passed on");
    check(doc.viewPreferences.rulerOrigin == RulerOrigin.PAGE_ORIGIN, "origin restored");
    check(app.scriptPreferences.measurementUnit == MeasurementUnits.POINTS, "unit restored");
});

test("pageInfo: single page", function () {
    var doc = FIX.doc({ facing: false });
    var info = BE.pageInfo(FIX.frame(doc.pages[0], [0, 0, 100, 100]));
    near(info.page, [0, 0, 300, 200], "page");
    near([info.spreadLeft, info.spreadRight], [0, 200], "spread");
    check(info.leftSide === "inside" && info.rightSide === "outside", "sides " + info.leftSide + "/" + info.rightSide);
});

test("pageInfo: facing pages", function () {
    var doc = FIX.doc({ facing: true, pages: 3 });
    var left = doc.spreads[1].pages[0], right = doc.spreads[1].pages[1];
    var info = BE.pageInfo(FIX.frame(left, [0, left.bounds[1], 100, left.bounds[1] + 100]));
    near([info.spreadLeft, info.spreadRight], [left.bounds[1], right.bounds[3]], "spread");
    check(info.leftSide === "outside" && info.rightSide === "outside", "sides " + info.leftSide + "/" + info.rightSide);
    var single = BE.pageInfo(FIX.frame(doc.pages[0], [0, 0, 100, 100]));
    check(single.leftSide === "inside" && single.rightSide === "outside", "single right-hand page");
});

test("resolveFrame: valid frames", function () {
    var doc = FIX.doc({ facing: false });
    var img = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var pdf = FIX.frame(doc.pages[0], [0, 100, 100, 200], FIX.pdf);
    var r = BE.resolveFrame(img);
    check(r.frame.id === img.id && r.reason === null, "image: " + r.reason);
    r = BE.resolveFrame(pdf);
    check(r.reason === null, "PDF: " + r.reason);
    r = BE.resolveFrame(img.allGraphics[0]);
    check(r.frame.id === img.id && r.reason === null, "graphic -> frame: " + r.reason);
});

test("resolveFrame: invalid objects", function () {
    var doc = FIX.doc({ facing: false }), pg = doc.pages[0];
    function reason(item) { return BE.resolveFrame(item).reason; }
    check(reason(pg.textFrames.add({ geometricBounds: [0, 0, 50, 50] })) === "not an image frame", "text frame");
    check(reason(pg.rectangles.add({ geometricBounds: [0, 0, 50, 50] })) === BE.t("noGraphic"), "empty");
    var oval = pg.ovals.add({ geometricBounds: [0, 0, 50, 50] });
    oval.place(FIX.png);
    check(reason(oval) === BE.t("notRect"), "oval");
    var rot = FIX.frame(pg, [0, 0, 50, 50]);
    rot.rotationAngle = 10;
    check(reason(rot) === BE.t("rotated"), "rotated");
    var locked = FIX.frame(pg, [0, 0, 50, 50]);
    locked.locked = true;
    check(reason(locked) === BE.t("locked"), "locked");
    var a = FIX.frame(pg, [0, 0, 50, 50]), b = FIX.frame(pg, [60, 0, 90, 50]);
    pg.parent.groups.add([a, b]);
    check(reason(doc.groups[0].rectangles[0]) === BE.t("inGroup"), "in group");
    var off = FIX.frame(pg, [0, -60, 50, -20]);
    check(reason(off) === BE.t("pasteboard"), "pasteboard");
});

test("texts: German and English", function () {
    var saved = BE.lang;
    try {
        BE.lang = "de";
        check(BE.t("pasteboard") === "liegt auf der Montagefl\u00e4che", BE.t("pasteboard"));
        check(BE.t("summaryDone", 3) === "3 Rahmen bearbeitet.", BE.t("summaryDone", 3));
        BE.lang = "en";
        check(BE.t("progress", 1, 2, "a.jpg") === "Frame 1 of 2 \u2013 a.jpg", BE.t("progress", 1, 2, "a.jpg"));
        var k, missing = [];
        for (k in BE.STRINGS.en) if (BE.STRINGS.de[k] === undefined) missing.push(k);
        for (k in BE.STRINGS.de) if (BE.STRINGS.en[k] === undefined) missing.push(k);
        check(missing.length === 0, "keys missing in one language: " + missing.join(", "));
    } finally {
        BE.lang = saved;
    }
});

test("language: English by default, choice is saved and loaded", function () {
    var f = File(FIX.out.fsName + "/tmp_settings/settings.txt");
    if (f.exists) f.remove();
    check(BE.loadLanguage(f) === "en", "default without file");
    BE.saveLanguage("de", f);
    check(f.exists, "file written");
    check(BE.loadLanguage(f) === "de", "saved German is loaded");
    BE.saveLanguage("en", f);
    check(BE.loadLanguage(f) === "en", "saved English is loaded");
    f.open("w"); f.write("lang=xx\n"); f.close();
    check(BE.loadLanguage(f) === "en", "unknown language -> English");
    f.remove();
    f.parent.remove();
    check(BE.settingsFile().fsName.indexOf("AddBleed") > 0, "settings path " + BE.settingsFile().fsName);
});
