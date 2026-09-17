//@target indesign
/*
    AddBleed.jsx - Version 2.2.1
    Author: Sascha Fronczek - https://saschafronczek.de
    License: MIT (see LICENSE) - Bugs and ideas: https://github.com/saassscccchhhhhaaaaaa/indesign-add-bleed/issues

    Adds bleed to the selected image frames on the edges that touch the page edge.
    Methods: scale, mirror, or fill via Photoshop (content-aware / generative).
    The UI is English by default; German can be chosen in the dialog.
    Bounds are always [top, left, bottom, right] in points.
*/

var BE = {};

BE.VERSION = "2.2.1";
BE.AUTHOR = "Sascha Fronczek";
BE.WEBSITE = "saschafronczek.de";

BE.TOLERANCE_PT = 72 / 25.4; // 1 mm
BE.EPS = 0.01;
BE.FILE_SUFFIX = "_bleed";

// ---------- Texts ----------

BE.STRINGS = {
    en: {
        title: "Add Bleed",
        notFrame: "not an image frame",
        noGraphic: "frame contains no graphic",
        inGroup: "inside a group or anchored",
        locked: "locked",
        pasteboard: "on the pasteboard",
        rotated: "rotated or skewed",
        notRect: "not rectangular",
        graphicRotated: "graphic rotated or skewed inside the frame",
        noCenter: "graphic does not cover the frame centre",
        fileType: "file type not supported for Fill",
        linkMissing: "link missing or out of date",
        graphicFlipped: "graphic rotated or flipped inside the frame",
        notAtEdge: "not at the page edge (or already has bleed)",
        error: "Error: {0}",
        psNotFound: "Photoshop was not found",
        psNoStart: "Photoshop does not start",
        psTimeout: "timed out ({0} s)",
        psUnexpected: "unexpected answer: {0}",
        psFileMissing: "file not found: {0}",
        psFileOpen: "file is open in Photoshop, please close it there",
        summaryDone: "{0} frame(s) processed.",
        summarySkipped: "{0} skipped:",
        summaryCreated1: "1 new PSD file created next to the original (kept when undoing).",
        summaryCreatedN: "{0} new PSD files created next to the originals (kept when undoing).",
        method: "Method",
        scale: "Scale",
        mirror: "Mirror",
        fill: "Fill (Photoshop)",
        contentAware: "content-aware",
        generative: "generative",
        fillNote: "PDF/AI files are rasterised (300 ppi).\nNew PSD files are saved next to the originals.",
        genNote: "Generative needs internet, uses generative credits\nand relies on an undocumented Photoshop function.",
        bleedPanel: "Document bleed",
        bleedTopBottom: "Top: {0}    Bottom: {1}",
        bleedInOut: "Inside/Left: {0}    Outside/Right: {1}",
        cancel: "Cancel",
        progress: "Frame {0} of {1} \u2013 {2}",
        noDoc: "No document is open.",
        noSel: "Please select one or more image frames first.",
        noBleed: "The document has no bleed set.\n(File > Document Setup)",
        object: "object",
        language: "Language:"
    },
    de: {
        title: "Beschnitt erg\u00e4nzen",
        notFrame: "kein Bildrahmen",
        noGraphic: "Rahmen enth\u00e4lt keine Grafik",
        inGroup: "liegt in einer Gruppe oder ist verankert",
        locked: "gesperrt",
        pasteboard: "liegt auf der Montagefl\u00e4che",
        rotated: "gedreht oder verzerrt",
        notRect: "keine Rechteckform",
        graphicRotated: "Grafik im Rahmen gedreht oder verzerrt",
        noCenter: "Grafik deckt die Rahmenmitte nicht ab",
        fileType: "Dateityp wird f\u00fcr F\u00fcllen nicht unterst\u00fctzt",
        linkMissing: "Verkn\u00fcpfung fehlt oder ist nicht aktuell",
        graphicFlipped: "Grafik im Rahmen gedreht oder gespiegelt",
        notAtEdge: "liegt nicht am Seitenrand (oder hat schon Beschnitt)",
        error: "Fehler: {0}",
        psNotFound: "Photoshop wurde nicht gefunden",
        psNoStart: "Photoshop startet nicht",
        psTimeout: "Zeit\u00fcberschreitung ({0} s)",
        psUnexpected: "unerwartete Antwort: {0}",
        psFileMissing: "Datei nicht gefunden: {0}",
        psFileOpen: "Datei ist in Photoshop ge\u00f6ffnet, bitte dort schlie\u00dfen",
        summaryDone: "{0} Rahmen bearbeitet.",
        summarySkipped: "{0} \u00fcbersprungen:",
        summaryCreated1: "1 neue PSD-Datei neben dem Original angelegt (bleibt beim R\u00fcckg\u00e4ngigmachen erhalten).",
        summaryCreatedN: "{0} neue PSD-Dateien neben den Originalen angelegt (bleiben beim R\u00fcckg\u00e4ngigmachen erhalten).",
        method: "Methode",
        scale: "Skalieren",
        mirror: "Spiegeln",
        fill: "F\u00fcllen (Photoshop)",
        contentAware: "inhaltsbasiert",
        generative: "generativ",
        fillNote: "PDF/AI werden in Pixel umgewandelt (300 ppi).\nNeue PSD-Dateien entstehen neben den Originalen.",
        genNote: "Generativ braucht Internet, verbraucht generative Credits\nund nutzt eine nicht offiziell dokumentierte Photoshop-Funktion.",
        bleedPanel: "Beschnitt des Dokuments",
        bleedTopBottom: "Oben: {0}    Unten: {1}",
        bleedInOut: "Innen/Links: {0}    Au\u00dfen/Rechts: {1}",
        cancel: "Abbrechen",
        progress: "Rahmen {0} von {1} \u2013 {2}",
        noDoc: "Es ist kein Dokument ge\u00f6ffnet.",
        noSel: "Bitte zuerst einen oder mehrere Bildrahmen ausw\u00e4hlen.",
        noBleed: "Im Dokument ist kein Beschnitt eingestellt.\n(Datei > Dokument einrichten)",
        object: "Objekt",
        language: "Sprache:"
    }
};

BE.LANGUAGES = [{ code: "en", name: "English" }, { code: "de", name: "Deutsch" }];

// Settings file in the user's application data folder
BE.settingsFile = function () {
    return File(Folder.userData.fsName + "/AddBleed/settings.txt");
};

// Saved UI language; English if nothing (valid) is saved.
BE.loadLanguage = function (file) {
    var s, m;
    file = file || BE.settingsFile();
    try {
        if (file.exists && file.open("r")) {
            s = file.read();
            file.close();
            m = /lang=(\w+)/.exec(s);
            if (m && BE.STRINGS[m[1]]) return m[1];
        }
    } catch (e) {}
    return "en";
};

BE.saveLanguage = function (code, file) {
    file = file || BE.settingsFile();
    try {
        file.parent.create();
        file.encoding = "UTF-8";
        if (file.open("w")) {
            file.write("lang=" + code + "\n");
            file.close();
        }
    } catch (e) {}
};

BE.lang = BE.loadLanguage();

// Translated text for key; {0}, {1} ... are replaced by the further arguments.
BE.t = function (key) {
    var s = BE.STRINGS[BE.lang][key], i;
    if (s === undefined) s = BE.STRINGS.en[key];
    for (i = 1; i < arguments.length; i++) s = s.split("{" + (i - 1) + "}").join(String(arguments[i]));
    return s;
};

// ---------- Geometry (no InDesign objects) ----------

// Detects the edges at the page/spread border and computes the target bounds.
BE.computeTarget = function (fb, page, spreadLeft, spreadRight, leftSide, rightSide, bleed, tol) {
    var b = {
        top: bleed.top,
        bottom: bleed.bottom,
        left: leftSide === "outside" ? bleed.outside : bleed.inside,
        right: rightSide === "outside" ? bleed.outside : bleed.inside
    };
    var edges = {
        top: b.top > 0 && Math.abs(fb[0] - page[0]) <= tol,
        left: b.left > 0 && Math.abs(fb[1] - spreadLeft) <= tol,
        bottom: b.bottom > 0 && Math.abs(fb[2] - page[2]) <= tol,
        right: b.right > 0 && Math.abs(fb[3] - spreadRight) <= tol
    };
    return {
        edges: edges,
        target: [
            edges.top ? page[0] - b.top : fb[0],
            edges.left ? spreadLeft - b.left : fb[1],
            edges.bottom ? page[2] + b.bottom : fb[2],
            edges.right ? spreadRight + b.right : fb[3]
        ],
        any: edges.top || edges.left || edges.bottom || edges.right
    };
};

BE.covers = function (gb, tb) {
    return gb[0] <= tb[0] + BE.EPS && gb[1] <= tb[1] + BE.EPS &&
        gb[2] >= tb[2] - BE.EPS && gb[3] >= tb[3] - BE.EPS;
};

// Smallest factor >= 1 so that the graphic, scaled around the frame centre, covers the target.
// null if the graphic does not enclose the frame centre.
BE.scaleFactor = function (fb, gb, tb) {
    var cy = (fb[0] + fb[2]) / 2, cx = (fb[1] + fb[3]) / 2;
    var c = [cy, cx, cy, cx], s = 1, i, d;
    for (i = 0; i < 4; i++) {
        d = gb[i] - c[i];
        if (i < 2 ? d >= 0 : d <= 0) return null;
        s = Math.max(s, (tb[i] - c[i]) / d);
    }
    return s;
};

BE.scaleBounds = function (b, cy, cx, s) {
    return [cy + (b[0] - cy) * s, cx + (b[1] - cx) * s, cy + (b[2] - cy) * s, cx + (b[3] - cx) * s];
};

// Strips and corners for mirroring, each with its mirror axis and target rectangle.
BE.mirrorPieces = function (fb, tb, e) {
    var p = [];
    function add(h, v, ax, ay, rect) {
        p.push({ flipH: h, flipV: v, axisX: ax, axisY: ay, rect: rect });
    }
    if (e.top) add(false, true, fb[1], fb[0], [tb[0], fb[1], fb[0], fb[3]]);
    if (e.bottom) add(false, true, fb[1], fb[2], [fb[2], fb[1], tb[2], fb[3]]);
    if (e.left) add(true, false, fb[1], fb[0], [fb[0], tb[1], fb[2], fb[1]]);
    if (e.right) add(true, false, fb[3], fb[0], [fb[0], fb[3], fb[2], tb[3]]);
    if (e.top && e.left) add(true, true, fb[1], fb[0], [tb[0], tb[1], fb[0], fb[1]]);
    if (e.top && e.right) add(true, true, fb[3], fb[0], [tb[0], fb[3], fb[0], tb[3]]);
    if (e.bottom && e.left) add(true, true, fb[1], fb[2], [fb[2], tb[1], tb[2], fb[1]]);
    if (e.bottom && e.right) add(true, true, fb[3], fb[2], [fb[2], fb[3], tb[2], tb[3]]);
    return p;
};

// ---------- Fill - geometry ----------

// Missing share per side (relative to graphic height/width), including a safety margin.
BE.fillNeed = function (gb, tb, marginPt) {
    var h = gb[2] - gb[0], w = gb[3] - gb[1];
    function part(miss, size) { return miss > BE.EPS ? (miss + marginPt) / size : 0; }
    return {
        top: part(gb[0] - tb[0], h),
        left: part(gb[1] - tb[1], w),
        bottom: part(tb[2] - gb[2], h),
        right: part(tb[3] - gb[3], w)
    };
};

BE.needsFill = function (n) {
    return n.top > 0 || n.left > 0 || n.bottom > 0 || n.right > 0;
};

BE.baseName = function (fileName) {
    var i = fileName.lastIndexOf(".");
    return i > 0 ? fileName.substring(0, i) : fileName;
};

// First free "<base>_bleed.psd", "<base>_bleed-2.psd", ... in the folder.
BE.nextFreeName = function (folderPath, base, exists) {
    var path = folderPath + "/" + base + BE.FILE_SUFFIX + ".psd", i = 2;
    while (exists(path)) {
        path = folderPath + "/" + base + BE.FILE_SUFFIX + "-" + i + ".psd";
        i++;
    }
    return path;
};

// Answer of the Photoshop job: "ok|origW|origH|top|left|bottom|right" or "error|message"
BE.parsePsResult = function (s) {
    var p = String(s).split("|");
    if (p[0] === "ok" && p.length === 7) {
        return {
            ok: true, origW: Number(p[1]), origH: Number(p[2]),
            add: { top: Number(p[3]), left: Number(p[4]), bottom: Number(p[5]), right: Number(p[6]) }
        };
    }
    if (p[0] === "error") return { ok: false, message: p.slice(1).join("|") };
    return { ok: false, message: BE.t("psUnexpected", s) };
};

// Graphic bounds after relinking, so the original pixels stay where they were.
BE.filledBounds = function (gb, r) {
    var px = (gb[3] - gb[1]) / r.origW, py = (gb[2] - gb[0]) / r.origH;
    return [gb[0] - r.add.top * py, gb[1] - r.add.left * px, gb[2] + r.add.bottom * py, gb[3] + r.add.right * px];
};

// Overlap in px so the fill blends into the image without a seam.
BE.psOverlap = function (w, h) {
    return Math.min(40, Math.max(8, Math.round(0.01 * Math.min(w, h))));
};

// Rectangle that is not filled: the original area, shrunk by ov on the extended sides.
BE.psInnerRect = function (w, h, add, ov) {
    return [
        add.left + (add.left > 0 ? ov : 0),
        add.top + (add.top > 0 ? ov : 0),
        add.left + w - (add.right > 0 ? ov : 0),
        add.top + h - (add.bottom > 0 ? ov : 0)
    ];
};

// ---------- Document helpers ----------

BE.GRAPHIC_TYPES = { Image: 1, PDF: 1, EPS: 1, ImportedPage: 1, PICT: 1, WMF: 1, Graphic: 1 };
BE.FRAME_TYPES = { Rectangle: 1, Polygon: 1, Oval: 1 };

BE.readBleed = function (doc) {
    var dp = doc.documentPreferences;
    return {
        top: dp.documentBleedTopOffset,
        bottom: dp.documentBleedBottomOffset,
        inside: dp.documentBleedInsideOrLeftOffset,
        outside: dp.documentBleedOutsideOrRightOffset
    };
};

// Runs fn with points as unit, spread ruler origin and zero point 0; restores everything afterwards.
BE.withSettings = function (doc, fn) {
    var sp = app.scriptPreferences, vp = doc.viewPreferences;
    var saved = { unit: sp.measurementUnit, origin: vp.rulerOrigin, zero: doc.zeroPoint };
    try {
        sp.measurementUnit = MeasurementUnits.POINTS;
        vp.rulerOrigin = RulerOrigin.SPREAD_ORIGIN;
        doc.zeroPoint = [0, 0];
        return fn();
    } finally {
        sp.measurementUnit = saved.unit;
        vp.rulerOrigin = saved.origin;
        doc.zeroPoint = saved.zero;
    }
};

// Page of the frame, outer edges of the spread and inside/outside per side.
BE.pageInfo = function (frame) {
    var page = frame.parentPage, pages = page.parent.pages;
    var leftPage = pages[0], rightPage = pages[0], i;
    for (i = 1; i < pages.length; i++) {
        if (pages[i].bounds[1] < leftPage.bounds[1]) leftPage = pages[i];
        if (pages[i].bounds[3] > rightPage.bounds[3]) rightPage = pages[i];
    }
    return {
        page: page.bounds,
        spreadLeft: leftPage.bounds[1],
        spreadRight: rightPage.bounds[3],
        leftSide: leftPage.side == PageSideOptions.LEFT_HAND ? "outside" : "inside",
        rightSide: rightPage.side == PageSideOptions.LEFT_HAND ? "inside" : "outside"
    };
};

BE.samePoint = function (a, b) {
    return Math.abs(a[0] - b[0]) < BE.EPS && Math.abs(a[1] - b[1]) < BE.EPS;
};

BE.isRectangular = function (frame) {
    var pts, gb = frame.geometricBounds, i, a;
    if (frame.paths.length !== 1) return false;
    pts = frame.paths[0].pathPoints;
    if (pts.length !== 4) return false;
    for (i = 0; i < 4; i++) {
        a = pts[i].anchor;
        if (!BE.samePoint(a, pts[i].leftDirection) || !BE.samePoint(a, pts[i].rightDirection)) return false;
        if (Math.abs(a[0] - gb[1]) >= BE.EPS && Math.abs(a[0] - gb[3]) >= BE.EPS) return false;
        if (Math.abs(a[1] - gb[0]) >= BE.EPS && Math.abs(a[1] - gb[2]) >= BE.EPS) return false;
    }
    return true;
};

// Returns the frame to process, or the reason why it is skipped.
BE.resolveFrame = function (item) {
    var pc;
    if (BE.GRAPHIC_TYPES[item.constructor.name]) item = item.parent;
    if (!BE.FRAME_TYPES[item.constructor.name]) return { reason: BE.t("notFrame") };
    if (item.allGraphics.length !== 1) return { frame: item, reason: BE.t("noGraphic") };
    pc = item.parent.constructor.name;
    if (pc !== "Spread" && pc !== "MasterSpread") return { frame: item, reason: BE.t("inGroup") };
    if (item.locked || item.itemLayer.locked) return { frame: item, reason: BE.t("locked") };
    if (!item.parentPage) return { frame: item, reason: BE.t("pasteboard") };
    if (Math.abs(item.rotationAngle) > BE.EPS || Math.abs(item.shearAngle) > BE.EPS) {
        return { frame: item, reason: BE.t("rotated") };
    }
    if (!BE.isRectangular(item)) return { frame: item, reason: BE.t("notRect") };
    return { frame: item, reason: null };
};

// ---------- Photoshop ----------

BE.pdfCropName = function (crop) {
    if (crop == PDFCrop.CROP_MEDIA) return "MEDIABOX";
    if (crop == PDFCrop.CROP_PDF) return "CROPBOX";
    if (crop == PDFCrop.CROP_TRIM) return "TRIMBOX";
    if (crop == PDFCrop.CROP_BLEED) return "BLEEDBOX";
    if (crop == PDFCrop.CROP_ART) return "ARTBOX";
    return "BOUNDINGBOX";
};

// Runs inside Photoshop (sent as source code). Return value: see BE.parsePsResult.
// p = {src, dst, need, mode, isPdf, pdfPage, pdfCrop, msg: {fileMissing, fileOpen}}
BE.psJob = function (p) {
    var saved = { dialogs: app.displayDialogs, units: app.preferences.rulerUnits };
    var doc = null, src = File(p.src), i, fn, po, w, h, add, ov, r, layer, d, ref, clio, opts, so;
    function s(id) { return stringIDToTypeID(id); }
    function c(id) { return charIDToTypeID(id); }
    try {
        if (!src.exists) return "error|" + p.msg.fileMissing.split("{0}").join(src.fsName);
        // Never touch a document the user already has open.
        for (i = 0; i < app.documents.length; i++) {
            fn = null;
            try { fn = app.documents[i].fullName.fsName; } catch (e0) {}
            if (fn === src.fsName) return "error|" + p.msg.fileOpen;
        }
        app.displayDialogs = DialogModes.NO;
        app.preferences.rulerUnits = Units.PIXELS;
        if (p.isPdf) {
            po = new PDFOpenOptions();
            po.resolution = 300;
            po.antiAlias = true;
            po.usePageNumber = true;
            po.page = p.pdfPage;
            po.cropPage = CropToType[p.pdfCrop];
            doc = app.open(src, po);
        } else {
            doc = app.open(src);
        }
        if (doc.mode == DocumentMode.INDEXEDCOLOR) doc.changeMode(ChangeMode.RGB);
        w = doc.width.as("px");
        h = doc.height.as("px");
        doc.flatten();
        if (doc.activeLayer.isBackgroundLayer) doc.activeLayer.isBackgroundLayer = false;
        doc.activeLayer.name = "Original";

        add = {
            top: Math.ceil(p.need.top * h), left: Math.ceil(p.need.left * w),
            bottom: Math.ceil(p.need.bottom * h), right: Math.ceil(p.need.right * w)
        };
        if (add.top || add.left) {
            doc.resizeCanvas(UnitValue(w + add.left, "px"), UnitValue(h + add.top, "px"), AnchorPosition.BOTTOMRIGHT);
        }
        if (add.bottom || add.right) {
            doc.resizeCanvas(UnitValue(w + add.left + add.right, "px"), UnitValue(h + add.top + add.bottom, "px"), AnchorPosition.TOPLEFT);
        }
        ov = BE.psOverlap(w, h);
        r = BE.psInnerRect(w, h, add, ov);
        doc.selection.selectAll();
        doc.selection.select([[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]], SelectionType.DIMINISH);

        if (p.mode === "generative") {
            // Generative Fill (undocumented descriptor, empty prompt)
            ref = new ActionReference();
            ref.putEnumerated(s("document"), s("ordinal"), s("targetEnum"));
            clio = new ActionDescriptor();
            clio.putString(s("gi_PROMPT"), "");
            clio.putInteger(s("gi_NUM_STEPS"), -1);
            clio.putInteger(s("gi_GUIDANCE"), 6);
            clio.putInteger(s("gi_SIMILARITY"), 0);
            clio.putBoolean(s("gi_CROP"), false);
            clio.putBoolean(s("gi_DILATE"), false);
            clio.putInteger(s("gi_CONTENT_PRESERVE"), 0);
            clio.putBoolean(s("gi_ENABLE_PROMPT_FILTER"), true);
            clio.putBoolean(s("dualCrop"), true);
            clio.putString(s("gi_ADVANCED"), '{"enable_mts":true}');
            opts = new ActionDescriptor();
            opts.putObject(s("clio"), s("clio"), clio);
            d = new ActionDescriptor();
            d.putReference(s("null"), ref);
            d.putInteger(s("documentID"), doc.id);
            d.putInteger(s("layerID"), doc.activeLayer.id);
            d.putString(s("prompt"), "");
            d.putString(s("serviceID"), "clio");
            d.putObject(s("serviceOptionsList"), s("target"), opts);
            executeAction(s("syntheticFill"), d, DialogModes.NO);
        } else {
            // Content-Aware Fill on a separate layer that only keeps the filled area
            layer = doc.activeLayer.duplicate();
            layer.name = "Bleed";
            doc.activeLayer = layer;
            d = new ActionDescriptor();
            d.putEnumerated(c("Usng"), c("FlCn"), s("contentAware"));
            d.putUnitDouble(c("Opct"), c("#Prc"), 100);
            d.putEnumerated(c("Md  "), c("BlnM"), c("Nrml"));
            executeAction(c("Fl  "), d, DialogModes.NO);
            doc.selection.invert();
            doc.selection.clear();
        }
        doc.selection.deselect();
        so = new PhotoshopSaveOptions();
        so.layers = true;
        so.embedColorProfile = true;
        doc.saveAs(File(p.dst), so, true);
        return ["ok", w, h, add.top, add.left, add.bottom, add.right].join("|");
    } catch (e) {
        return "error|" + e.message;
    } finally {
        if (doc) { try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e1) {} }
        app.displayDialogs = saved.dialogs;
        app.preferences.rulerUnits = saved.units;
    }
};

BE.psSpecifier = function () {
    return BridgeTalk.getSpecifier("photoshop") || null;
};

// Source code for Photoshop: the job, its helpers and the parameters.
BE.psSource = function (params) {
    return "var BE = {};\n" +
        "BE.psOverlap = " + BE.psOverlap.toString() + ";\n" +
        "BE.psInnerRect = " + BE.psInnerRect.toString() + ";\n" +
        "BE.psJob = " + BE.psJob.toString() + ";\n" +
        "BE.psJob(" + params.toSource() + ");";
};

// Sends source code to Photoshop and waits for the answer.
BE.callPhotoshop = function (source, timeoutMs) {
    var spec = BE.psSpecifier(), bt, res = null, err = null, t0;
    if (!spec) return "error|" + BE.t("psNotFound");
    if (!BridgeTalk.isRunning(spec)) {
        BridgeTalk.launch(spec);
        t0 = new Date().getTime();
        while (!BridgeTalk.isRunning(spec)) {
            if (new Date().getTime() - t0 > 180000) return "error|" + BE.t("psNoStart");
            $.sleep(500);
        }
    }
    bt = new BridgeTalk();
    bt.target = spec;
    // BridgeTalk alters backslashes in the body, so the source is sent encoded.
    bt.body = "eval(unescape('" + escape(source) + "'));";
    bt.onResult = function (m) { res = m.body; };
    bt.onError = function (m) { err = m.body; };
    t0 = new Date().getTime();
    bt.send();
    while (res === null && err === null) {
        if (new Date().getTime() - t0 > timeoutMs) return "error|" + BE.t("psTimeout", Math.round(timeoutMs / 1000));
        BridgeTalk.pump();
        $.sleep(100);
    }
    return res !== null ? res : "error|" + err;
};

// ---------- Methods ----------

// Sets new frame bounds without moving the content.
BE.setFrameBounds = function (frame, b) {
    var fo = frame.frameFittingOptions, auto = fo.autoFit;
    fo.autoFit = false;
    frame.geometricBounds = b;
    fo.autoFit = auto;
};

BE.applyScale = function (frame, fb, tb) {
    var g = frame.allGraphics[0], gb = g.geometricBounds, s;
    if (!BE.covers(gb, tb)) {
        if (Math.abs(g.rotationAngle) > BE.EPS || Math.abs(g.shearAngle) > BE.EPS) return BE.t("graphicRotated");
        s = BE.scaleFactor(fb, gb, tb);
        if (s === null) return BE.t("noCenter");
        g.geometricBounds = BE.scaleBounds(gb, (fb[0] + fb[2]) / 2, (fb[1] + fb[3]) / 2, s);
    }
    BE.setFrameBounds(frame, tb);
    return null;
};

// True if the item shows a stroke.
BE.hasStroke = function (item) {
    return item.strokeWeight > 0 && item.strokeColor.name !== "None";
};

// Creates mirrored copies as strips/corners and groups them with the original.
BE.applyMirror = function (frame, fb, t) {
    var pieces = BE.mirrorPieces(fb, t.target, t.edges), items = [frame], i, p, d, flip;
    for (i = 0; i < pieces.length; i++) {
        p = pieces[i];
        d = frame.duplicate();
        d.frameFittingOptions.autoFit = false;
        flip = p.flipH && p.flipV ? Flip.BOTH : (p.flipH ? Flip.HORIZONTAL : Flip.VERTICAL);
        d.flipItem(flip, [p.axisX, p.axisY]);
        d.geometricBounds = p.rect;
        // Remove the stroke via its colour: strokeWeight = 0 on a [None] stroke makes InDesign add 1 pt black.
        d.strokeColor = "None";
        d.textWrapPreferences.textWrapMode = TextWrapModes.NONE;
        items.push(d);
    }
    frame.parent.groups.add(items);
    return null;
};

BE.createdFiles = [];

BE.checkFillable = function (frame) {
    var g = frame.allGraphics[0], t = g.constructor.name, link = g.itemLink;
    if (t !== "Image" && t !== "PDF") return BE.t("fileType");
    if (!link || link.status != LinkStatus.NORMAL) return BE.t("linkMissing");
    if (Math.abs(g.rotationAngle) > BE.EPS || Math.abs(g.shearAngle) > BE.EPS || g.absoluteFlip != Flip.NONE) {
        return BE.t("graphicFlipped");
    }
    return null;
};

// Adds the missing image in Photoshop, relinks to the new PSD and extends the frame.
BE.applyFill = function (frame, fb, tb, mode) {
    var reason = BE.checkFillable(frame), g, gb, need, link, src, dst, params, r;
    if (reason) return reason;
    g = frame.allGraphics[0];
    gb = g.geometricBounds;
    need = BE.fillNeed(gb, tb, BE.TOLERANCE_PT);
    if (!BE.needsFill(need)) {
        BE.setFrameBounds(frame, tb);
        return null;
    }
    link = g.itemLink;
    src = File(link.filePath);
    dst = BE.nextFreeName(src.parent.fsName, BE.baseName(src.name), function (path) { return File(path).exists; });
    params = {
        src: src.fsName, dst: dst, need: need, mode: mode,
        isPdf: g.constructor.name === "PDF", pdfPage: 1, pdfCrop: "BOUNDINGBOX",
        msg: { fileMissing: BE.t("psFileMissing"), fileOpen: BE.t("psFileOpen") }
    };
    if (params.isPdf) {
        params.pdfPage = g.pdfAttributes.pageNumber;
        params.pdfCrop = BE.pdfCropName(g.pdfAttributes.pdfCrop);
    }
    r = BE.parsePsResult(BE.callPhotoshop(BE.psSource(params), mode === "generative" ? 180000 : 60000));
    if (!r.ok) return "Photoshop: " + r.message;
    BE.createdFiles.push(dst);
    link.relink(File(dst));
    frame.allGraphics[0].geometricBounds = BE.filledBounds(gb, r);
    BE.setFrameBounds(frame, tb);
    return null;
};

// Processes a checked frame. Returns null or the reason for skipping.
BE.processFrame = function (frame, method, bleed) {
    var info = BE.pageInfo(frame), fb = frame.geometricBounds;
    var t = BE.computeTarget(fb, info.page, info.spreadLeft, info.spreadRight,
        info.leftSide, info.rightSide, bleed, BE.TOLERANCE_PT);
    if (!t.any) return BE.t("notAtEdge");
    if (method === "mirror") return BE.applyMirror(frame, fb, t);
    if (method === "fill-ca" || method === "fill-gen") {
        return BE.applyFill(frame, fb, t.target, method === "fill-gen" ? "generative" : "contentAware");
    }
    return BE.applyScale(frame, fb, t.target);
};

// ---------- Workflow ----------

BE.itemName = function (item) {
    try {
        if (item.allGraphics.length && item.allGraphics[0].itemLink) return item.allGraphics[0].itemLink.name;
    } catch (e) {}
    try { return item.constructor.name + " (ID " + item.id + ")"; } catch (e2) { return BE.t("object"); }
};

// Processes all items; one failing frame does not stop the others.
BE.process = function (items, method, bleed, onProgress) {
    var res = { done: 0, skipped: [], created: [] }, seen = {}, i, r, reason;
    BE.createdFiles = res.created;
    for (i = 0; i < items.length; i++) {
        r = BE.resolveFrame(items[i]);
        if (onProgress) onProgress(i + 1, items.length, BE.itemName(r.frame || items[i]));
        if (r.frame) {
            if (seen[r.frame.id]) continue;
            seen[r.frame.id] = true;
        }
        reason = r.reason;
        if (!reason) {
            try { reason = BE.processFrame(r.frame, method, bleed); }
            catch (e) { reason = BE.t("error", e.message); }
        }
        if (reason) res.skipped.push({ name: BE.itemName(r.frame || items[i]), reason: reason });
        else res.done++;
    }
    return res;
};

BE.formatSummary = function (res) {
    var s = BE.t("summaryDone", res.done), i;
    if (res.skipped.length) {
        s += "\n\n" + BE.t("summarySkipped", res.skipped.length);
        for (i = 0; i < res.skipped.length; i++) {
            s += "\n\u2022 " + res.skipped[i].name + ": " + res.skipped[i].reason;
        }
    }
    if (res.created && res.created.length) {
        s += "\n\n" + (res.created.length === 1 ? BE.t("summaryCreated1") : BE.t("summaryCreatedN", res.created.length));
    }
    return s;
};

BE.runUndoable = function (fn) {
    app.doScript(fn, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, BE.t("title"));
};

BE.mm = function (pt) {
    return (Math.round(pt * 25.4 / 72 * 100) / 100) + " mm";
};

// Window factory (replaceable in tests)
BE.newWindow = function (type, title) {
    return new Window(type, title);
};

// Dialog; returns "scale", "mirror", "fill-ca", "fill-gen" or null.
// The language can be switched in the dialog; it is saved when the dialog is confirmed.
BE.askMethod = function (bleed) {
    var w = BE.newWindow("dialog", BE.t("title")), texts = [], oldLang = BE.lang;
    var pm, pb, pf, pl, g, rScale, rMirror, rFill, rCa, rGen, note, genNote, info, langList, i;
    // Remembers a control and how to build its text, so the texts can be switched live.
    function label(ctrl, make) {
        texts.push({ ctrl: ctrl, make: make });
        ctrl.text = make();
        return ctrl;
    }
    function key(k) { return function () { return BE.t(k); }; }
    function relabel() {
        for (var j = 0; j < texts.length; j++) texts[j].ctrl.text = texts[j].make();
        w.text = BE.t("title");
        w.layout.layout(true);
    }

    w.alignChildren = "fill";
    pm = label(w.add("panel"), key("method"));
    pm.alignChildren = "left";
    pm.margins = [15, 24, 15, 12]; // extra top space so the options sit below the panel title
    rScale = label(pm.add("radiobutton"), key("scale"));
    rMirror = label(pm.add("radiobutton"), key("mirror"));
    rFill = label(pm.add("radiobutton"), key("fill"));
    pf = pm.add("group");
    pf.orientation = "column";
    pf.alignChildren = "left";
    pf.margins = [20, 0, 0, 0];
    rCa = label(pf.add("radiobutton"), key("contentAware"));
    rGen = label(pf.add("radiobutton"), key("generative"));
    note = label(pf.add("statictext", undefined, "", { multiline: true }), key("fillNote"));
    note.preferredSize = [340, 34];
    genNote = label(pf.add("statictext", undefined, "", { multiline: true }), key("genNote"));
    genNote.preferredSize = [340, 34];
    rScale.value = true;
    rCa.value = true;
    function sync() {
        pf.enabled = rFill.value;
        genNote.visible = rFill.value && rGen.value;
    }
    rScale.onClick = rMirror.onClick = rFill.onClick = rCa.onClick = rGen.onClick = sync;
    sync();

    pb = label(w.add("panel"), key("bleedPanel"));
    pb.alignChildren = "left";
    pb.margins = [15, 24, 15, 12];
    label(pb.add("statictext"), function () { return BE.t("bleedTopBottom", BE.mm(bleed.top), BE.mm(bleed.bottom)); })
        .preferredSize.width = 340;
    label(pb.add("statictext"), function () { return BE.t("bleedInOut", BE.mm(bleed.inside), BE.mm(bleed.outside)); })
        .preferredSize.width = 340;

    pl = w.add("group");
    pl.alignment = "left";
    label(pl.add("statictext"), key("language"));
    langList = pl.add("dropdownlist");
    for (i = 0; i < BE.LANGUAGES.length; i++) {
        langList.add("item", BE.LANGUAGES[i].name);
        if (BE.LANGUAGES[i].code === BE.lang) langList.selection = i;
    }
    if (!langList.selection) langList.selection = 0;
    langList.onChange = function () {
        if (!langList.selection) return;
        BE.lang = BE.LANGUAGES[langList.selection.index].code;
        relabel();
    };

    info = w.add("statictext", undefined, "Version " + BE.VERSION + "  |  " + BE.AUTHOR + "  |  " + BE.WEBSITE);
    info.alignment = "left";
    info.enabled = false;
    g = w.add("group");
    g.alignment = "right";
    label(g.add("button", undefined, "", { name: "cancel" }), key("cancel"));
    g.add("button", undefined, "OK", { name: "ok" });

    if (w.show() !== 1) {
        BE.lang = oldLang;
        return null;
    }
    BE.saveLanguage(BE.lang);
    if (rMirror.value) return "mirror";
    if (rFill.value) return rGen.value ? "fill-gen" : "fill-ca";
    return "scale";
};

// Progress window; returns {update(i, n, name), close()}
BE.progress = function (total) {
    var w = new Window("palette", BE.t("title")), bar, label;
    w.alignChildren = "fill";
    label = w.add("statictext", undefined, "");
    label.preferredSize.width = 360;
    bar = w.add("progressbar", undefined, 0, total);
    bar.preferredSize.width = 360;
    w.show();
    return {
        update: function (i, n, name) {
            label.text = BE.t("progress", i, n, name);
            bar.value = i - 1;
            w.update();
        },
        close: function () { w.close(); }
    };
};

BE.run = function () {
    var doc, sel, items = [], i, bleed, method, res, unit, isFill, prog = null;
    if (!app.documents.length) { alert(BE.t("noDoc")); return; }
    doc = app.activeDocument;
    sel = app.selection;
    if (!sel.length) { alert(BE.t("noSel")); return; }
    for (i = 0; i < sel.length; i++) items.push(sel[i]);

    unit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        bleed = BE.readBleed(doc);
    } finally {
        app.scriptPreferences.measurementUnit = unit;
    }
    if (!bleed.top && !bleed.bottom && !bleed.inside && !bleed.outside) {
        alert(BE.t("noBleed"));
        return;
    }
    method = BE.askMethod(bleed);
    if (!method) return;

    isFill = method === "fill-ca" || method === "fill-gen";
    if (isFill && !BE.psSpecifier()) {
        alert(BE.t("psNotFound"));
        return;
    }
    if (isFill) prog = BE.progress(items.length);
    try {
        BE.runUndoable(function () {
            res = BE.withSettings(doc, function () {
                return BE.process(items, method, bleed, prog ? prog.update : null);
            });
        });
    } finally {
        if (prog) prog.close();
    }
    alert(BE.formatSummary(res), BE.t("title"));
};

// ---------- Start ----------

if (!$.global.BE_TEST) {
    BE.run();
}
