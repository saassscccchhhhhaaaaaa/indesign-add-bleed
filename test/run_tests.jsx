//@target indesign
// Test-Runner: wird von test/run_tests.sh per AppleScript in InDesign gestartet.
$.global.BE_TEST = true;
var TEST_DIR = File($.fileName).parent;
$.evalFile(File(TEST_DIR.parent.fsName + "/Beschnitt_ergaenzen.jsx"));

var T = { lines: [], ok: 0, fail: 0, current: "" };
var B9 = { top: 9, bottom: 9, inside: 9, outside: 9 };

function check(cond, msg) {
    if (cond) { T.ok++; return; }
    T.fail++;
    T.lines.push("FAIL " + T.current + ": " + msg);
}

function near(a, b, msg, tol) {
    var i, same = true;
    tol = tol || 0.01;
    if (a instanceof Array) {
        if (a.length !== b.length) same = false;
        else for (i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > tol) same = false;
    } else {
        same = Math.abs(a - b) <= tol;
    }
    check(same, msg + " - erwartet " + b + ", erhalten " + a);
}

function test(name, fn) {
    var before = T.fail;
    T.current = name;
    try { fn(); } catch (e) {
        T.fail++;
        T.lines.push("FAIL " + name + ": Exception " + e + " (Zeile " + e.line + ")");
    }
    T.lines.push((T.fail === before ? "ok   " : "---  ") + name);
}

// Objekt einer Gruppe mit bestimmten Rahmen-Bounds finden
function pieceAt(grp, bounds) {
    var items = grp.pageItems.everyItem().getElements(), i, k, b, same;
    for (i = 0; i < items.length; i++) {
        b = items[i].geometricBounds;
        same = true;
        for (k = 0; k < 4; k++) if (Math.abs(b[k] - bounds[k]) > 0.01) same = false;
        if (same) return items[i];
    }
    return null;
}

var FIX = { docs: [] };
FIX.out = Folder(TEST_DIR.fsName + "/output");
FIX.png = File(FIX.out.fsName + "/fixture.png");
FIX.pdf = File(FIX.out.fsName + "/fixture.pdf");

FIX.makeSources = function () {
    var src = app.documents.add(false), r;
    src.documentPreferences.facingPages = false;
    src.documentPreferences.pageWidth = 100;
    src.documentPreferences.pageHeight = 100;
    r = src.pages[0].rectangles.add({ geometricBounds: [0, 0, 100, 100], strokeWeight: 0 });
    r.fillColor = src.colors.add({ model: ColorModel.PROCESS, space: ColorSpace.CMYK, colorValue: [100, 0, 0, 0] });
    app.pngExportPreferences.exportResolution = 72;
    app.pngExportPreferences.pngExportRange = PNGExportRangeEnum.EXPORT_ALL;
    src.exportFile(ExportFormat.PNG_FORMAT, FIX.png);
    src.exportFile(ExportFormat.PDF_TYPE, FIX.pdf);
    src.close(SaveOptions.NO);
};

// opts: { facing, pages, bleed:{top,bottom,inside,outside}, visible }
FIX.doc = function (opts) {
    var doc = app.documents.add(opts.visible === true), dp = doc.documentPreferences;
    var b = opts.bleed || B9;
    FIX.docs.push(doc);
    dp.facingPages = opts.facing;
    dp.pagesPerDocument = opts.pages || 1;
    dp.pageWidth = 200;
    dp.pageHeight = 300;
    dp.documentBleedUniformSize = false;
    dp.documentBleedTopOffset = b.top;
    dp.documentBleedBottomOffset = b.bottom;
    dp.documentBleedInsideOrLeftOffset = b.inside;
    dp.documentBleedOutsideOrRightOffset = b.outside;
    doc.viewPreferences.rulerOrigin = RulerOrigin.SPREAD_ORIGIN;
    doc.zeroPoint = [0, 0];
    return doc;
};

// Rahmen mit platzierter Datei; gb = Grafik-Bounds (Standard: wie Rahmen)
FIX.frame = function (page, fb, file, gb) {
    var f = page.rectangles.add({ geometricBounds: fb, strokeWeight: 0 });
    var g = f.place(file || FIX.png)[0];
    g.geometricBounds = gb || fb;
    return f;
};

var saved = {
    uil: app.scriptPreferences.userInteractionLevel,
    unit: app.scriptPreferences.measurementUnit,
    pngRes: app.pngExportPreferences.exportResolution,
    pngRange: app.pngExportPreferences.pngExportRange
};
try {
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
    app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
    FIX.out.create();
    FIX.makeSources();
    var testFiles = TEST_DIR.getFiles("test_*.jsx");
    testFiles.sort(function (x, y) { return x.name < y.name ? -1 : 1; });
    for (var tf = 0; tf < testFiles.length; tf++) {
        T.lines.push("# " + testFiles[tf].name);
        $.evalFile(testFiles[tf]);
    }
} catch (e) {
    T.fail++;
    T.lines.push("FAIL Runner: " + e + " (Zeile " + e.line + ")");
} finally {
    for (var d = FIX.docs.length - 1; d >= 0; d--) {
        try { if (FIX.docs[d].isValid) FIX.docs[d].close(SaveOptions.NO); } catch (e2) {}
    }
    app.pngExportPreferences.exportResolution = saved.pngRes;
    app.pngExportPreferences.pngExportRange = saved.pngRange;
    app.scriptPreferences.measurementUnit = saved.unit;
    app.scriptPreferences.userInteractionLevel = saved.uil;
    var rf = File(FIX.out.fsName + "/result.txt");
    rf.encoding = "UTF-8";
    rf.lineFeed = "Unix";
    rf.open("w");
    rf.write(T.lines.join("\n") + "\nERGEBNIS: " + T.ok + " ok, " + T.fail + " fehlgeschlagen\n");
    rf.close();
}
