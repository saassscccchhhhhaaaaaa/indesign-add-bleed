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

// ---------- Start ----------

if (!$.global.BE_TEST) {
    BE.run();
}
