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

test("askMethod: dialog builds, switches language live, cancel keeps the language", function () {
    var orig = BE.newWindow, origSave = BE.saveLanguage, res, seen = {}, saved = [];
    function find(c, type) {
        if (c.type === type) return c;
        for (var i = 0; c.children && i < c.children.length; i++) {
            var r = find(c.children[i], type);
            if (r) return r;
        }
        return null;
    }
    BE.newWindow = function (type, title) {
        var w = orig(type, title);
        if (type === "dialog") w.onShow = function () {
            seen.before = w.text;
            var dd = find(w, "dropdownlist");
            seen.items = dd ? dd.items.length : 0;
            if (dd) dd.selection = 1;
            seen.after = w.text;
            seen.cancel = find(w, "button").text;
            w.close(2);
        };
        return w;
    };
    BE.saveLanguage = function (code) { saved.push(code); };
    try { res = BE.askMethod(B9); } finally { BE.newWindow = orig; BE.saveLanguage = origSave; }
    check(seen.before === "Add Bleed", "title before: " + seen.before);
    check(seen.items === 2, "languages in list: " + seen.items);
    check(seen.after === "Beschnitt erg\u00e4nzen", "title after switching: " + seen.after);
    check(seen.cancel === "Abbrechen", "button text after switching: " + seen.cancel);
    check(res === null && BE.lang === "en", "cancel restores the language: " + BE.lang);
    check(saved.length === 0, "nothing saved on cancel");
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
