// Fill in InDesign (content-aware, real Photoshop)
test("fill: image top/left, relinked, original pixels stay in place", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var r = BE.processFrame(f, "fill-ca", B9);
    check(r === null, "result " + r);
    var g = f.allGraphics[0];
    check(/^fixture_bleed(-\d+)?\.psd$/.test(g.itemLink.name), "link " + g.itemLink.name);
    near(f.geometricBounds, [-9, -9, 100, 100], "frame");
    near(g.geometricBounds, [-12, -12, 100, 100], "graphic (12 px = 12 pt added)");
});

test("fill: image big enough -> no Photoshop, link unchanged", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], FIX.png, [-20, -20, 120, 120]);
    check(BE.processFrame(f, "fill-ca", B9) === null, "result");
    check(f.allGraphics[0].itemLink.name === "fixture.png", "link " + f.allGraphics[0].itemLink.name);
    near(f.geometricBounds, [-9, -9, 100, 100], "frame");
});

test("fill: PDF bottom/right becomes an image", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [200, 100, 300, 200], FIX.pdf);
    check(BE.processFrame(f, "fill-ca", B9) === null, "result");
    var g = f.allGraphics[0], gb = g.geometricBounds;
    check(g.constructor.name === "Image", "type " + g.constructor.name);
    near([gb[0], gb[1]], [200, 100], "top/left unchanged");
    check(gb[2] >= 309 - BE.EPS && gb[3] >= 209 - BE.EPS, "covers target: " + gb);
    near(f.geometricBounds, [200, 100, 309, 209], "frame");
});

test("checkFillable: missing link", function () {
    var doc = FIX.doc({ facing: false });
    var tmp = File(FIX.out.fsName + "/tmp_missing.png");
    FIX.png.copy(tmp);
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], tmp);
    tmp.remove();
    check(BE.checkFillable(f) === "link missing or out of date", "reason: " + BE.checkFillable(f));
});

test("process: fill reports new PSD files", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var calls = [];
    var res = BE.process([f], "fill-ca", B9, function (i, n, name) { calls.push(i + "/" + n); });
    check(res.done === 1 && res.created.length === 1, "created " + res.created.length);
    check(calls.join(",") === "1/1", "progress " + calls.join(","));
    check(BE.formatSummary(res).indexOf("1 new PSD file") > 0, BE.formatSummary(res));
});
