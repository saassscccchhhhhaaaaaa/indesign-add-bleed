// Pure geometry, no document
var PAGE = [0, 0, 300, 200];

test("computeTarget: frame at top left of the page", function () {
    var t = BE.computeTarget([0, 0, 100, 100], PAGE, 0, 200, "inside", "outside", B9, BE.TOLERANCE_PT);
    check(t.any, "any");
    check(t.edges.top && t.edges.left && !t.edges.bottom && !t.edges.right, "edges top+left");
    near(t.target, [-9, -9, 100, 100], "target");
});

test("computeTarget: 1 mm tolerance, target aligned to the page edge", function () {
    var t = BE.computeTarget([2, 1, 298, 199], PAGE, 0, 200, "inside", "outside", B9, BE.TOLERANCE_PT);
    check(t.edges.top && t.edges.left && t.edges.bottom && t.edges.right, "all edges");
    near(t.target, [-9, -9, 309, 209], "target");
});

test("computeTarget: outside the tolerance", function () {
    var t = BE.computeTarget([3, 10, 100, 100], PAGE, 0, 200, "inside", "outside", B9, BE.TOLERANCE_PT);
    check(!t.any, "no edge");
    near(t.target, [3, 10, 100, 100], "target unchanged");
});

test("computeTarget: inside/outside per side, zero bleed does not count", function () {
    var b = { top: 0, bottom: 5, inside: 3, outside: 7 };
    var t = BE.computeTarget([0, 0, 300, 200], PAGE, 0, 200, "outside", "inside", b, BE.TOLERANCE_PT);
    check(!t.edges.top, "top without bleed");
    near(t.target, [0, -7, 305, 203], "target");
});

test("computeTarget: spread edges instead of page edges", function () {
    var t = BE.computeTarget([0, 0, 300, 200], PAGE, 0, 400, "outside", "inside", B9, BE.TOLERANCE_PT);
    check(t.edges.left && !t.edges.right, "only left, not at the spine");
});

test("covers", function () {
    check(BE.covers([-10, -10, 110, 110], [-9, -9, 100, 100]), "covers");
    check(!BE.covers([0, -10, 110, 110], [-9, -9, 100, 100]), "top too short");
});

test("scaleFactor", function () {
    near(BE.scaleFactor([0, 0, 100, 100], [0, 0, 100, 100], [-9, -9, 100, 100]), 59 / 50, "factor");
    near(BE.scaleFactor([0, 0, 100, 100], [-20, -20, 120, 120], [-9, -9, 100, 100]), 1, "big enough -> 1");
    check(BE.scaleFactor([0, 0, 100, 100], [60, 0, 100, 100], [-9, 0, 100, 100]) === null, "graphic below centre -> null");
});

test("scaleBounds", function () {
    near(BE.scaleBounds([0, 0, 100, 100], 50, 50, 1.18), [-9, -9, 109, 109], "scaled around centre");
});

test("mirrorPieces: top + left gives 3 pieces", function () {
    var p = BE.mirrorPieces([0, 0, 100, 100], [-9, -9, 100, 100], { top: true, left: true, bottom: false, right: false });
    check(p.length === 3, "count " + p.length);
    check(!p[0].flipH && p[0].flipV, "top vertical");
    near(p[0].axisY, 0, "top axis");
    near(p[0].rect, [-9, 0, 0, 100], "top strip");
    check(p[1].flipH && !p[1].flipV, "left horizontal");
    near(p[1].axisX, 0, "left axis");
    near(p[1].rect, [0, -9, 100, 0], "left strip");
    check(p[2].flipH && p[2].flipV, "corner both ways");
    near(p[2].rect, [-9, -9, 0, 0], "corner");
});

test("mirrorPieces: all edges give 8 pieces", function () {
    var p = BE.mirrorPieces([0, 0, 100, 100], [-9, -9, 109, 109], { top: true, left: true, bottom: true, right: true });
    check(p.length === 8, "count " + p.length);
    near(p[1].axisY, 100, "bottom axis");
    near(p[3].axisX, 100, "right axis");
    near(p[7].rect, [100, 100, 109, 109], "bottom right corner");
    near([p[7].axisX, p[7].axisY], [100, 100], "bottom right axes");
});
