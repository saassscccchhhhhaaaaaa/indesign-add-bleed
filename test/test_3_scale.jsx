// Method: scale
test("scale: enough overlap -> only extend the frame", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], FIX.png, [-20, -20, 120, 120]);
    var r = BE.processFrame(f, "scale", B9);
    check(r === null, "result " + r);
    near(f.geometricBounds, [-9, -9, 100, 100], "frame");
    near(f.allGraphics[0].geometricBounds, [-20, -20, 120, 120], "graphic unchanged");
});

test("scale: image too small -> proportional around frame centre", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var g = f.allGraphics[0], hs = g.absoluteHorizontalScale, vs = g.absoluteVerticalScale;
    check(BE.processFrame(f, "scale", B9) === null, "result");
    near(f.geometricBounds, [-9, -9, 100, 100], "frame");
    near(f.allGraphics[0].geometricBounds, [-9, -9, 109, 109], "graphic");
    near(f.allGraphics[0].absoluteHorizontalScale / hs, 1.18, "horizontal factor");
    near(f.allGraphics[0].absoluteVerticalScale / vs, 1.18, "vertical factor");
});

test("scale: right-hand page of a spread, spine untouched", function () {
    var doc = FIX.doc({ facing: true, pages: 3, bleed: { top: 9, bottom: 6, inside: 3, outside: 12 } });
    var right = doc.spreads[1].pages[1], pb = right.bounds;
    var f = FIX.frame(right, pb, FIX.png, [pb[0] - 50, pb[1] - 50, pb[2] + 50, pb[3] + 50]);
    check(BE.processFrame(f, "scale", BE.readBleed(doc)) === null, "result");
    near(f.geometricBounds, [pb[0] - 9, pb[1], pb[2] + 6, pb[3] + 12], "top/bottom/outside, not spine");
});

test("scale: frame not at the edge", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [50, 50, 100, 100]);
    check(BE.processFrame(f, "scale", B9) === "not at the page edge (or already has bleed)", "reason");
    near(f.geometricBounds, [50, 50, 100, 100], "unchanged");
});

test("scale: PDF", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [200, 100, 300, 200], FIX.pdf);
    check(BE.processFrame(f, "scale", B9) === null, "result");
    near(f.geometricBounds, [200, 100, 309, 209], "frame");
    check(BE.covers(f.allGraphics[0].geometricBounds, [200, 100, 309, 209]), "PDF covers");
});
