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

// ---------- Start ----------

if (!$.global.BE_TEST) {
    BE.run();
}
