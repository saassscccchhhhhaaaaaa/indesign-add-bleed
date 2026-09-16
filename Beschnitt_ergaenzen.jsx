//@target indesign
/*
    Beschnitt_ergaenzen.jsx
    Ergänzt bei ausgewählten Bildrahmen Beschnitt an den Kanten, die am Seitenrand liegen.
    Methoden: Skalieren oder Spiegeln. Bounds immer [oben, links, unten, rechts] in pt.
*/

var BE = {};

BE.TOLERANZ_PT = 72 / 25.4; // 1 mm
BE.EPS = 0.01;

// ---------- Geometrie (ohne InDesign-Objekte) ----------

// Erkennt die Kanten am Seiten-/Druckbogenrand und berechnet die Zielgrenzen.
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

// Kleinster Faktor >= 1, mit dem die um die Rahmenmitte skalierte Grafik das Ziel abdeckt.
// null, wenn die Grafik die Rahmenmitte nicht umschließt.
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

// Streifen und Ecken für die Spiegelung, jeweils mit Spiegelachse und Zielrechteck.
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

// ---------- Füllen – Geometrie ----------

// Fehlende Anteile je Seite (bezogen auf Grafikhöhe/-breite), inkl. Sicherheitszugabe.
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

BE.nextFreeName = function (folderPath, base, exists) {
    var path = folderPath + "/" + base + "_beschnitt.psd", i = 2;
    while (exists(path)) {
        path = folderPath + "/" + base + "_beschnitt-" + i + ".psd";
        i++;
    }
    return path;
};

// Antwort des Photoshop-Jobs: "ok|origW|origH|top|left|bottom|right" oder "error|Meldung"
BE.parsePsResult = function (s) {
    var p = String(s).split("|");
    if (p[0] === "ok" && p.length === 7) {
        return {
            ok: true, origW: Number(p[1]), origH: Number(p[2]),
            add: { top: Number(p[3]), left: Number(p[4]), bottom: Number(p[5]), right: Number(p[6]) }
        };
    }
    if (p[0] === "error") return { ok: false, message: p.slice(1).join("|") };
    return { ok: false, message: "unerwartete Antwort: " + s };
};

// Grafik-Bounds nach dem Neuverknüpfen, damit die Originalpixel an ihrer Stelle bleiben.
BE.filledBounds = function (gb, r) {
    var px = (gb[3] - gb[1]) / r.origW, py = (gb[2] - gb[0]) / r.origH;
    return [gb[0] - r.add.top * py, gb[1] - r.add.left * px, gb[2] + r.add.bottom * py, gb[3] + r.add.right * px];
};

// Überlappung in px, damit die Füllung ohne Naht ins Bild übergeht.
BE.psOverlap = function (w, h) {
    return Math.min(40, Math.max(8, Math.round(0.01 * Math.min(w, h))));
};

// Rechteck, das nicht gefüllt wird: Originalbereich, an ergänzten Seiten um ov verkleinert.
BE.psInnerRect = function (w, h, add, ov) {
    return [
        add.left + (add.left > 0 ? ov : 0),
        add.top + (add.top > 0 ? ov : 0),
        add.left + w - (add.right > 0 ? ov : 0),
        add.top + h - (add.bottom > 0 ? ov : 0)
    ];
};

// ---------- Dokument-Helfer ----------

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

// Führt fn mit Einheit Punkt, Linealursprung Druckbogen und Nullpunkt 0 aus.
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

// Seite des Rahmens, Außenkanten des Druckbogens und Innen/Außen je Seite.
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

// Liefert den zu bearbeitenden Rahmen oder den Grund, warum er übersprungen wird.
BE.resolveFrame = function (item) {
    var pc;
    if (BE.GRAPHIC_TYPES[item.constructor.name]) item = item.parent;
    if (!BE.FRAME_TYPES[item.constructor.name]) return { reason: "kein Bildrahmen" };
    if (item.allGraphics.length !== 1) return { frame: item, reason: "Rahmen enth\u00e4lt keine Grafik" };
    pc = item.parent.constructor.name;
    if (pc !== "Spread" && pc !== "MasterSpread") return { frame: item, reason: "liegt in einer Gruppe oder ist verankert" };
    if (item.locked || item.itemLayer.locked) return { frame: item, reason: "gesperrt" };
    if (!item.parentPage) return { frame: item, reason: "liegt auf der Montagefl\u00e4che" };
    if (Math.abs(item.rotationAngle) > BE.EPS || Math.abs(item.shearAngle) > BE.EPS) {
        return { frame: item, reason: "gedreht oder verzerrt" };
    }
    if (!BE.isRectangular(item)) return { frame: item, reason: "keine Rechteckform" };
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

// Läuft in Photoshop (wird als Quelltext gesendet). Rückgabe siehe BE.parsePsResult.
BE.psJob = function (p) {
    var saved = { dialogs: app.displayDialogs, units: app.preferences.rulerUnits };
    var doc = null, src = File(p.src), i, fn, po, w, h, add, ov, r, layer, d, ref, clio, opts, so;
    function s(id) { return stringIDToTypeID(id); }
    function c(id) { return charIDToTypeID(id); }
    try {
        if (!src.exists) return "error|Datei nicht gefunden: " + src.fsName;
        for (i = 0; i < app.documents.length; i++) {
            fn = null;
            try { fn = app.documents[i].fullName.fsName; } catch (e0) {}
            if (fn === src.fsName) return "error|Datei ist in Photoshop ge\u00f6ffnet, bitte dort schlie\u00dfen";
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
            layer = doc.activeLayer.duplicate();
            layer.name = "Beschnitt";
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

BE.psSource = function (params) {
    return "var BE = {};\n" +
        "BE.psOverlap = " + BE.psOverlap.toString() + ";\n" +
        "BE.psInnerRect = " + BE.psInnerRect.toString() + ";\n" +
        "BE.psJob = " + BE.psJob.toString() + ";\n" +
        "BE.psJob(" + params.toSource() + ");";
};

// Sendet Quelltext an Photoshop und wartet auf die Antwort.
BE.callPhotoshop = function (source, timeoutMs) {
    var spec = BE.psSpecifier(), bt, res = null, err = null, t0;
    if (!spec) return "error|Photoshop wurde nicht gefunden";
    if (!BridgeTalk.isRunning(spec)) {
        BridgeTalk.launch(spec);
        t0 = new Date().getTime();
        while (!BridgeTalk.isRunning(spec)) {
            if (new Date().getTime() - t0 > 180000) return "error|Photoshop startet nicht";
            $.sleep(500);
        }
    }
    bt = new BridgeTalk();
    bt.target = spec;
    // BridgeTalk verändert Backslashes im Text – daher kodiert übertragen.
    bt.body = "eval(unescape('" + escape(source) + "'));";
    bt.onResult = function (m) { res = m.body; };
    bt.onError = function (m) { err = m.body; };
    t0 = new Date().getTime();
    bt.send();
    while (res === null && err === null) {
        if (new Date().getTime() - t0 > timeoutMs) return "error|Zeit\u00fcberschreitung (" + Math.round(timeoutMs / 1000) + " s)";
        BridgeTalk.pump();
        $.sleep(100);
    }
    return res !== null ? res : "error|" + err;
};

// ---------- Methoden ----------

// Rahmen auf neue Grenzen setzen, ohne dass der Inhalt mitgeht.
BE.setFrameBounds = function (frame, b) {
    var fo = frame.frameFittingOptions, auto = fo.autoFit;
    fo.autoFit = false;
    frame.geometricBounds = b;
    fo.autoFit = auto;
};

BE.applyScale = function (frame, fb, tb) {
    var g = frame.allGraphics[0], gb = g.geometricBounds, s;
    if (!BE.covers(gb, tb)) {
        if (Math.abs(g.rotationAngle) > BE.EPS || Math.abs(g.shearAngle) > BE.EPS) {
            return "Grafik im Rahmen gedreht oder verzerrt";
        }
        s = BE.scaleFactor(fb, gb, tb);
        if (s === null) return "Grafik deckt die Rahmenmitte nicht ab";
        g.geometricBounds = BE.scaleBounds(gb, (fb[0] + fb[2]) / 2, (fb[1] + fb[3]) / 2, s);
    }
    BE.setFrameBounds(frame, tb);
    return null;
};

// Gespiegelte Kopien als Streifen/Ecken anlegen und mit dem Original gruppieren.
BE.applyMirror = function (frame, fb, t) {
    var pieces = BE.mirrorPieces(fb, t.target, t.edges), items = [frame], i, p, d, flip;
    for (i = 0; i < pieces.length; i++) {
        p = pieces[i];
        d = frame.duplicate();
        d.frameFittingOptions.autoFit = false;
        flip = p.flipH && p.flipV ? Flip.BOTH : (p.flipH ? Flip.HORIZONTAL : Flip.VERTICAL);
        d.flipItem(flip, [p.axisX, p.axisY]);
        d.geometricBounds = p.rect;
        d.strokeWeight = 0;
        d.textWrapPreferences.textWrapMode = TextWrapModes.NONE;
        items.push(d);
    }
    frame.parent.groups.add(items);
    return null;
};

// Bearbeitet einen geprüften Rahmen. Rückgabe: null oder Grund fürs Überspringen.
BE.processFrame = function (frame, method, bleed) {
    var info = BE.pageInfo(frame), fb = frame.geometricBounds;
    var t = BE.computeTarget(fb, info.page, info.spreadLeft, info.spreadRight,
        info.leftSide, info.rightSide, bleed, BE.TOLERANZ_PT);
    if (!t.any) return "liegt nicht am Seitenrand (oder hat schon Beschnitt)";
    return method === "mirror" ? BE.applyMirror(frame, fb, t) : BE.applyScale(frame, fb, t.target);
};

// ---------- Ablauf ----------

BE.itemName = function (item) {
    try {
        if (item.allGraphics.length && item.allGraphics[0].itemLink) return item.allGraphics[0].itemLink.name;
    } catch (e) {}
    try { return item.constructor.name + " (ID " + item.id + ")"; } catch (e2) { return "Objekt"; }
};

BE.process = function (items, method, bleed) {
    var res = { done: 0, skipped: [] }, seen = {}, i, r, reason;
    for (i = 0; i < items.length; i++) {
        r = BE.resolveFrame(items[i]);
        if (r.frame) {
            if (seen[r.frame.id]) continue;
            seen[r.frame.id] = true;
        }
        reason = r.reason;
        if (!reason) {
            try { reason = BE.processFrame(r.frame, method, bleed); }
            catch (e) { reason = "Fehler: " + e.message; }
        }
        if (reason) res.skipped.push({ name: BE.itemName(r.frame || items[i]), reason: reason });
        else res.done++;
    }
    return res;
};

BE.formatSummary = function (res) {
    var s = res.done + " Rahmen bearbeitet.", i;
    if (res.skipped.length) {
        s += "\n\n" + res.skipped.length + " \u00fcbersprungen:";
        for (i = 0; i < res.skipped.length; i++) {
            s += "\n\u2022 " + res.skipped[i].name + ": " + res.skipped[i].reason;
        }
    }
    return s;
};

BE.runUndoable = function (fn) {
    app.doScript(fn, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Beschnitt erg\u00e4nzen");
};

BE.mm = function (pt) {
    return (Math.round(pt * 25.4 / 72 * 100) / 100) + " mm";
};

BE.askMethod = function (bleed) {
    var w = new Window("dialog", "Beschnitt erg\u00e4nzen"), pm, pb, g, rScale, rMirror;
    w.alignChildren = "fill";
    pm = w.add("panel", undefined, "Methode");
    pm.alignChildren = "left";
    rScale = pm.add("radiobutton", undefined, "Skalieren");
    rMirror = pm.add("radiobutton", undefined, "Spiegeln");
    rScale.value = true;
    pb = w.add("panel", undefined, "Beschnitt des Dokuments");
    pb.alignChildren = "left";
    pb.add("statictext", undefined, "Oben: " + BE.mm(bleed.top) + "    Unten: " + BE.mm(bleed.bottom));
    pb.add("statictext", undefined, "Innen/Links: " + BE.mm(bleed.inside) + "    Au\u00dfen/Rechts: " + BE.mm(bleed.outside));
    g = w.add("group");
    g.alignment = "right";
    g.add("button", undefined, "Abbrechen", { name: "cancel" });
    g.add("button", undefined, "OK", { name: "ok" });
    if (w.show() !== 1) return null;
    return rMirror.value ? "mirror" : "scale";
};

BE.run = function () {
    var doc, sel, items = [], i, bleed, method, res, unit;
    if (!app.documents.length) { alert("Es ist kein Dokument ge\u00f6ffnet."); return; }
    doc = app.activeDocument;
    sel = app.selection;
    if (!sel.length) { alert("Bitte zuerst einen oder mehrere Bildrahmen ausw\u00e4hlen."); return; }
    for (i = 0; i < sel.length; i++) items.push(sel[i]);

    unit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        bleed = BE.readBleed(doc);
    } finally {
        app.scriptPreferences.measurementUnit = unit;
    }
    if (!bleed.top && !bleed.bottom && !bleed.inside && !bleed.outside) {
        alert("Im Dokument ist kein Beschnitt eingestellt.\n(Datei > Dokument einrichten)");
        return;
    }
    method = BE.askMethod(bleed);
    if (!method) return;

    BE.runUndoable(function () {
        res = BE.withSettings(doc, function () { return BE.process(items, method, bleed); });
    });
    alert(BE.formatSummary(res), "Beschnitt erg\u00e4nzen");
};

// ---------- Start ----------

if (!$.global.BE_TEST) {
    BE.run();
}
