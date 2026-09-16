// Ablauf
test("process: gemischte Auswahl mit Zusammenfassung", function () {
    var doc = FIX.doc({ facing: false }), pg = doc.pages[0];
    var a = FIX.frame(pg, [0, 0, 100, 100]);
    var inner = FIX.frame(pg, [120, 50, 150, 100]);
    var txt = pg.textFrames.add({ geometricBounds: [200, 0, 250, 50] });
    var res = BE.process([a, a.allGraphics[0], inner, txt], "scale", B9);
    check(res.done === 1, "1 bearbeitet: " + res.done);
    check(res.skipped.length === 2, "2 uebersprungen: " + res.skipped.length);
    var s = BE.formatSummary(res);
    check(s.indexOf("1 Rahmen bearbeitet.") === 0, s);
    check(s.indexOf("fixture.png: liegt nicht am Seitenrand") > 0, s);
    check(s.indexOf("kein Bildrahmen") > 0, s);
});

test("process: Fehler in einem Rahmen stoppt die anderen nicht", function () {
    var doc = FIX.doc({ facing: false });
    var a = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var b = FIX.frame(doc.pages[0], [200, 100, 300, 200]);
    var orig = BE.processFrame, aid = a.id, res;
    BE.processFrame = function (frame, method, bleed) {
        if (frame.id === aid) throw new Error("kaputt");
        return orig(frame, method, bleed);
    };
    try { res = BE.process([a, b], "scale", B9); } finally { BE.processFrame = orig; }
    check(res.done === 1, "1 bearbeitet");
    check(res.skipped.length === 1 && res.skipped[0].reason === "Fehler: kaputt", "Fehlergrund");
});

test("runUndoable: ein Rueckgaengig-Schritt", function () {
    var doc = FIX.doc({ facing: false, visible: true });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    BE.runUndoable(function () {
        BE.withSettings(doc, function () { BE.process([f], "mirror", B9); });
    });
    check(doc.groups.length === 1, "Gruppe angelegt");
    doc.undo();
    check(doc.groups.length === 0, "nach einem Undo keine Gruppe");
    check(doc.rectangles.length === 1, "nur Original: " + doc.rectangles.length);
});

test("askMethod: Dialog baut sich fehlerfrei auf und schliesst", function () {
    var orig = BE.newWindow, res;
    BE.newWindow = function (type, title) {
        var w = orig(type, title);
        if (type === "dialog") w.onShow = function () { w.close(1); };
        return w;
    };
    try { res = BE.askMethod(B9); } finally { BE.newWindow = orig; }
    // close() aus onShow liefert in InDesign nicht den OK-Code, daher nur Aufbau pruefen
    check(res === null || res === "scale", "Ergebnis " + res);
});

test("progress: Fenster laesst sich aktualisieren und schliessen", function () {
    var p = BE.progress(3);
    p.update(1, 3, "a.jpg");
    p.update(3, 3, "c.jpg");
    p.close();
    check(true, "ohne Fehler");
});

test("Versionsangaben", function () {
    check(/^\d+\.\d+\.\d+$/.test(BE.VERSION), "Version " + BE.VERSION);
    check(BE.AUTHOR === "Sascha Fronczek" && BE.WEBSITE === "saschafronczek.de", "Autor/Website");
});
