// Reine Geometrie, ohne Dokument
var PAGE = [0, 0, 300, 200];

test("computeTarget: Rahmen oben links an der Seite", function () {
    var t = BE.computeTarget([0, 0, 100, 100], PAGE, 0, 200, "inside", "outside", B9, BE.TOLERANZ_PT);
    check(t.any, "any");
    check(t.edges.top && t.edges.left && !t.edges.bottom && !t.edges.right, "Kanten oben+links");
    near(t.target, [-9, -9, 100, 100], "Ziel");
});

test("computeTarget: Toleranz 1 mm, Ziel an Seitenkante ausgerichtet", function () {
    var t = BE.computeTarget([2, 1, 298, 199], PAGE, 0, 200, "inside", "outside", B9, BE.TOLERANZ_PT);
    check(t.edges.top && t.edges.left && t.edges.bottom && t.edges.right, "alle Kanten");
    near(t.target, [-9, -9, 309, 209], "Ziel");
});

test("computeTarget: ausserhalb der Toleranz", function () {
    var t = BE.computeTarget([3, 10, 100, 100], PAGE, 0, 200, "inside", "outside", B9, BE.TOLERANZ_PT);
    check(!t.any, "keine Kante");
    near(t.target, [3, 10, 100, 100], "Ziel unveraendert");
});

test("computeTarget: innen/aussen je Seite, Beschnitt 0 zaehlt nicht", function () {
    var b = { top: 0, bottom: 5, inside: 3, outside: 7 };
    var t = BE.computeTarget([0, 0, 300, 200], PAGE, 0, 200, "outside", "inside", b, BE.TOLERANZ_PT);
    check(!t.edges.top, "oben ohne Beschnitt");
    near(t.target, [0, -7, 305, 203], "Ziel");
});

test("computeTarget: Druckbogen-Kanten statt Seitenkanten", function () {
    var t = BE.computeTarget([0, 0, 300, 200], PAGE, 0, 400, "outside", "inside", B9, BE.TOLERANZ_PT);
    check(t.edges.left && !t.edges.right, "nur links, nicht am Bund");
});

test("covers", function () {
    check(BE.covers([-10, -10, 110, 110], [-9, -9, 100, 100]), "deckt ab");
    check(!BE.covers([0, -10, 110, 110], [-9, -9, 100, 100]), "oben zu kurz");
});

test("scaleFactor", function () {
    near(BE.scaleFactor([0, 0, 100, 100], [0, 0, 100, 100], [-9, -9, 100, 100]), 59 / 50, "Faktor");
    near(BE.scaleFactor([0, 0, 100, 100], [-20, -20, 120, 120], [-9, -9, 100, 100]), 1, "gross genug -> 1");
    check(BE.scaleFactor([0, 0, 100, 100], [60, 0, 100, 100], [-9, 0, 100, 100]) === null, "Grafik unter Mitte -> null");
});

test("scaleBounds", function () {
    near(BE.scaleBounds([0, 0, 100, 100], 50, 50, 1.18), [-9, -9, 109, 109], "skaliert um Mitte");
});

test("mirrorPieces: oben + links ergibt 3 Teile", function () {
    var p = BE.mirrorPieces([0, 0, 100, 100], [-9, -9, 100, 100], { top: true, left: true, bottom: false, right: false });
    check(p.length === 3, "Anzahl " + p.length);
    check(!p[0].flipH && p[0].flipV, "oben vertikal");
    near(p[0].axisY, 0, "Achse oben");
    near(p[0].rect, [-9, 0, 0, 100], "Streifen oben");
    check(p[1].flipH && !p[1].flipV, "links horizontal");
    near(p[1].axisX, 0, "Achse links");
    near(p[1].rect, [0, -9, 100, 0], "Streifen links");
    check(p[2].flipH && p[2].flipV, "Ecke beidseitig");
    near(p[2].rect, [-9, -9, 0, 0], "Ecke");
});

test("mirrorPieces: alle Kanten ergibt 8 Teile", function () {
    var p = BE.mirrorPieces([0, 0, 100, 100], [-9, -9, 109, 109], { top: true, left: true, bottom: true, right: true });
    check(p.length === 8, "Anzahl " + p.length);
    near(p[1].axisY, 100, "Achse unten");
    near(p[3].axisX, 100, "Achse rechts");
    near(p[7].rect, [100, 100, 109, 109], "Ecke unten rechts");
    near([p[7].axisX, p[7].axisY], [100, 100], "Achsen unten rechts");
});
