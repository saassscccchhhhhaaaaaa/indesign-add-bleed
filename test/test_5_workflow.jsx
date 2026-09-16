// Workflow
test("process: mixed selection with summary", function () {
    var doc = FIX.doc({ facing: false }), pg = doc.pages[0];
    var a = FIX.frame(pg, [0, 0, 100, 100]);
    var inner = FIX.frame(pg, [120, 50, 150, 100]);
    var txt = pg.textFrames.add({ geometricBounds: [200, 0, 250, 50] });
    var res = BE.process([a, a.allGraphics[0], inner, txt], "scale", B9);
    check(res.done === 1, "1 processed: " + res.done);
    check(res.skipped.length === 2, "2 skipped: " + res.skipped.length);
    var s = BE.formatSummary(res);
    check(s.indexOf("1 frame(s) processed.") === 0, s);
    check(s.indexOf("fixture.png: not at the page edge") > 0, s);
    check(s.indexOf("not an image frame") > 0, s);
});

test("process: an error in one frame does not stop the others", function () {
    var doc = FIX.doc({ facing: false });
    var a = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var b = FIX.frame(doc.pages[0], [200, 100, 300, 200]);
    var orig = BE.processFrame, aid = a.id, res;
    BE.processFrame = function (frame, method, bleed) {
        if (frame.id === aid) throw new Error("broken");
        return orig(frame, method, bleed);
    };
    try { res = BE.process([a, b], "scale", B9); } finally { BE.processFrame = orig; }
    check(res.done === 1, "1 processed");
    check(res.skipped.length === 1 && res.skipped[0].reason === "Error: broken", "reason");
});

test("runUndoable: a single undo step", function () {
    var doc = FIX.doc({ facing: false, visible: true });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    BE.runUndoable(function () {
        BE.withSettings(doc, function () { BE.process([f], "mirror", B9); });
    });
    check(doc.groups.length === 1, "group created");
    doc.undo();
    check(doc.groups.length === 0, "no group after one undo");
    check(doc.rectangles.length === 1, "only the original: " + doc.rectangles.length);
});

test("askMethod: dialog builds without errors and closes", function () {
    var orig = BE.newWindow, res;
    BE.newWindow = function (type, title) {
        var w = orig(type, title);
        if (type === "dialog") w.onShow = function () { w.close(1); };
        return w;
    };
    try { res = BE.askMethod(B9); } finally { BE.newWindow = orig; }
    // close() inside onShow does not return the OK code in InDesign, so only the build is checked
    check(res === null || res === "scale", "result " + res);
});

test("progress: window can be updated and closed", function () {
    var p = BE.progress(3);
    p.update(1, 3, "a.jpg");
    p.update(3, 3, "c.jpg");
    p.close();
    check(true, "no error");
});

test("version info", function () {
    check(/^\d+\.\d+\.\d+$/.test(BE.VERSION), "version " + BE.VERSION);
    check(BE.AUTHOR === "Sascha Fronczek" && BE.WEBSITE === "saschafronczek.de", "author/website");
});
