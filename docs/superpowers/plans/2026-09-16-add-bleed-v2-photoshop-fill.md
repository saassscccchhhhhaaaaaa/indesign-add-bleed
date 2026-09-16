# Beschnitt v2 – Füllen über Photoshop – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Methode „Füllen (Photoshop)“ (inhaltsbasiert/generativ) in `Beschnitt_ergaenzen.jsx` (Spec: `docs/superpowers/specs/2026-09-16-add-bleed-v2-photoshop-fill-design.md`).

**Architecture:** Neue reine Funktionen (Bedarf, Dateiname, Ergebnis-Parser, Grafik-Bounds, Überlappung/Innenrechteck), ein Photoshop-Job `BE.psJob` der per `Function.toString()` zusammen mit seinen Helfern als BridgeTalk-Quelltext gesendet wird, synchroner BridgeTalk-Aufruf, `BE.applyFill` in InDesign, Dialog-/Ablauf-Erweiterung.

**Tech Stack:** ExtendScript (InDesign 2026 + Photoshop 2026), BridgeTalk, ScriptUI.

## Global Constraints

- Alle Regeln aus dem v1-Plan gelten (eine Datei, ES3, `\uXXXX` in Strings – nach jedem Write/Edit mit perl nachescapen, Test-Runner prüft).
- Methoden-Strings: `"scale"`, `"mirror"`, `"fill-ca"`, `"fill-gen"`.
- PSD-Ziel: `<Basis>_beschnitt.psd`, dann `-2`, `-3`; nie überschreiben.
- Sicherheitszugabe `BE.TOLERANZ_PT` (1 mm); Überlappung `min(40, max(8, round(0.01·min(w,h))))` px.
- Timeouts: 60 s inhaltsbasiert, 180 s generativ, 180 s Photoshop-Start.
- Tests nutzen nur inhaltsbasiertes Füllen (keine Credits). Generativ nur manuell nach Freigabe.
- Photoshop-Dokumente, die schon offen sind, nie schließen: Job bricht dann mit Fehler ab.

---

### Task 1: Reine Füll-Funktionen

**Files:** Modify `Beschnitt_ergaenzen.jsx` (neuer Abschnitt „Füllen – Geometrie“ nach `BE.mirrorPieces`); Create `test/test_6_fuellen_geometrie.jsx`

**Interfaces – Produces:**
- `BE.fillNeed(gb, tb, marginPt)` → `{top,left,bottom,right}` Anteile
- `BE.needsFill(need)` → bool
- `BE.baseName(fileName)` → String
- `BE.nextFreeName(folderPath, base, exists)` → Pfad; `exists(path)` → bool
- `BE.parsePsResult(s)` → `{ok:true, origW, origH, add:{top,left,bottom,right}}` | `{ok:false, message}`
- `BE.filledBounds(gb, r)` → Bounds
- `BE.psOverlap(w, h)` → px
- `BE.psInnerRect(w, h, add, ov)` → `[links, oben, rechts, unten]` px im neuen Bild

- [ ] **Step 1: Tests** – `test/test_6_fuellen_geometrie.jsx`:

```js
// Füllen: reine Funktionen
test("fillNeed: fehlend oben/links mit Zugabe", function () {
    var n = BE.fillNeed([0, 0, 100, 200], [-9, -9, 100, 200], 2);
    near([n.top, n.left, n.bottom, n.right], [0.11, 0.055, 0, 0], "Anteile", 0.0001);
    check(BE.needsFill(n), "needsFill");
});

test("fillNeed: Grafik reicht", function () {
    var n = BE.fillNeed([-20, -20, 120, 220], [-9, -9, 100, 200], 2);
    near([n.top, n.left, n.bottom, n.right], [0, 0, 0, 0], "Anteile");
    check(!BE.needsFill(n), "needsFill");
});

test("baseName und nextFreeName", function () {
    check(BE.baseName("a.b.jpg") === "a.b", BE.baseName("a.b.jpg"));
    check(BE.baseName("ohne") === "ohne", BE.baseName("ohne"));
    var taken = { "/x/bild_beschnitt.psd": 1, "/x/bild_beschnitt-2.psd": 1 };
    var p = BE.nextFreeName("/x", "bild", function (path) { return taken[path] === 1; });
    check(p === "/x/bild_beschnitt-3.psd", p);
    check(BE.nextFreeName("/x", "neu", function () { return false; }) === "/x/neu_beschnitt.psd", "frei");
});

test("parsePsResult", function () {
    var r = BE.parsePsResult("ok|400|200|20|0|0|40");
    check(r.ok && r.origW === 400 && r.origH === 200, "Maße");
    check(r.add.top === 20 && r.add.left === 0 && r.add.bottom === 0 && r.add.right === 40, "add");
    r = BE.parsePsResult("error|kaputt|mehr");
    check(!r.ok && r.message === "kaputt|mehr", r.message);
    r = BE.parsePsResult("undefined");
    check(!r.ok && r.message.indexOf("undefined") > 0, r.message);
});

test("filledBounds", function () {
    var r = { origW: 400, origH: 200, add: { top: 20, left: 0, bottom: 0, right: 40 } };
    near(BE.filledBounds([0, 0, 100, 200], r), [-10, 0, 100, 220], "Bounds");
});

test("psOverlap und psInnerRect", function () {
    check(BE.psOverlap(1200, 1200) === 12, "1200");
    check(BE.psOverlap(300, 300) === 8, "min 8");
    check(BE.psOverlap(8000, 6000) === 40, "max 40");
    near(BE.psInnerRect(100, 50, { top: 10, left: 0, bottom: 0, right: 5 }, 8), [0, 18, 92, 60], "Innenrechteck");
});
```

- [ ] **Step 2:** `test/run_tests.sh` → FAIL (Funktionen fehlen).
- [ ] **Step 3: Implementieren** (nach `BE.mirrorPieces`):

```js
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
```

- [ ] **Step 4:** Tests → 0 fehlgeschlagen. **Step 5:** Commit „Fuellen: reine Funktionen“.

---

### Task 2: Photoshop-Job und BridgeTalk

**Files:** Modify `Beschnitt_ergaenzen.jsx` (Abschnitt „Photoshop“ nach „Dokument-Helfer“), `test/run_tests.jsx` (Aufräumen alter PSDs); Create `test/test_7_photoshop.jsx`

**Interfaces – Produces:**
- `BE.psJob(p)` → String (läuft in Photoshop); `p = {src, dst, need, mode:"contentAware"|"generative", isPdf, pdfPage, pdfCrop}`
- `BE.pdfCropName(crop)` → `"BOUNDINGBOX"|"MEDIABOX"|"CROPBOX"|"TRIMBOX"|"BLEEDBOX"|"ARTBOX"`
- `BE.psSpecifier()` → String|null
- `BE.psSource(params)` → Quelltext
- `BE.callPhotoshop(source, timeoutMs)` → Antwort-String (Fehler als `"error|…"`)
- Runner: `psRun(code)` → Antwort-String (Test-Helfer)

- [ ] **Step 1: Runner aufräumen** – in `test/run_tests.jsx` direkt nach `FIX.out.create();` einfügen:

```js
    var old = FIX.out.getFiles(function (f) { return /_beschnitt(-\d+)?\.psd$|^tmp_/.test(f.name); });
    for (var o = 0; o < old.length; o++) old[o].remove();
```

und nach `pieceAt` den Helfer:

```js
// Quelltext in Photoshop ausführen (für Tests)
function psRun(code) {
    return BE.callPhotoshop(code, 60000);
}
```

- [ ] **Step 2: Tests** – `test/test_7_photoshop.jsx`:

```js
// Photoshop-Job über BridgeTalk (nur inhaltsbasiert)
function psInfo(path) {
    return psRun("(function(){var d=app.open(File(" + path.toSource() + "));" +
        "var n=[];for(var i=0;i<d.layers.length;i++)n.push(d.layers[i].name);" +
        "var r=[d.width.as('px'),d.height.as('px'),n.join(','),String(d.mode)].join('|');" +
        "d.close(SaveOptions.DONOTSAVECHANGES);return r;})()");
}

function job(src, dst, need, extra) {
    var p = { src: src.fsName, dst: dst, need: need, mode: "contentAware", isPdf: false, pdfPage: 1, pdfCrop: "BOUNDINGBOX" };
    for (var k in extra) p[k] = extra[k];
    return BE.parsePsResult(BE.callPhotoshop(BE.psSource(p), 60000));
}

test("psSource enthaelt Helfer und Parameter", function () {
    var s = BE.psSource({ mode: "contentAware" });
    check(s.indexOf("BE.psOverlap = ") >= 0 && s.indexOf("BE.psJob(") >= 0 && s.indexOf("contentAware") > 0, s.substring(0, 80));
});

test("pdfCropName", function () {
    check(BE.pdfCropName(PDFCrop.CROP_CONTENT_VISIBLE_LAYERS) === "BOUNDINGBOX", "Begrenzung");
    check(BE.pdfCropName(PDFCrop.CROP_MEDIA) === "MEDIABOX", "Media");
    check(BE.pdfCropName(PDFCrop.CROP_PDF) === "CROPBOX", "Crop");
    check(BE.pdfCropName(PDFCrop.CROP_TRIM) === "TRIMBOX", "Trim");
    check(BE.pdfCropName(PDFCrop.CROP_BLEED) === "BLEEDBOX", "Bleed");
    check(BE.pdfCropName(PDFCrop.CROP_ART) === "ARTBOX", "Art");
});

test("Photoshop gefunden", function () {
    check(BE.psSpecifier() !== null, "Specifier");
});

test("psJob: PNG oben/links inhaltsbasiert", function () {
    var dst = FIX.out.fsName + "/tmp_job.psd", mod = FIX.png.modified.getTime();
    var r = job(FIX.png, dst, { top: 0.11, left: 0.055, bottom: 0, right: 0 }, {});
    check(r.ok, "ok: " + r.message);
    if (!r.ok) return;
    check(r.origW === 100 && r.origH === 100, "Originalmaß " + r.origW + "x" + r.origH);
    check(r.add.top === 11 && r.add.left === 6 && r.add.bottom === 0 && r.add.right === 0, "add " + r.add.toSource());
    check(File(dst).exists, "PSD vorhanden");
    var info = psInfo(dst).split("|");
    check(info[0] === "106" && info[1] === "111", "PSD-Maß " + info[0] + "x" + info[1]);
    check(info[2] === "Beschnitt,Original", "Ebenen " + info[2]);
    check(FIX.png.modified.getTime() === mod, "Original unveraendert");
});

test("psJob: PDF rechts/unten", function () {
    var dst = FIX.out.fsName + "/tmp_pdf.psd";
    var r = job(FIX.pdf, dst, { top: 0, left: 0, bottom: 0.1, right: 0.1 }, { isPdf: true });
    check(r.ok, "ok: " + r.message);
    if (r.ok) check(r.origW > 400 && r.add.right > 40 && r.add.top === 0, "300 ppi: " + r.origW + ", add " + r.add.right);
});

test("psJob: CMYK-Bild", function () {
    var tif = FIX.out.fsName + "/tmp_cmyk.tif";
    var made = psRun("(function(){var d=app.open(File(" + FIX.png.fsName.toSource() + "));" +
        "d.changeMode(ChangeMode.CMYK);d.saveAs(File(" + tif.toSource() + "),new TiffSaveOptions(),true);" +
        "d.close(SaveOptions.DONOTSAVECHANGES);return 'ok';})()");
    check(made === "ok", "CMYK-TIFF: " + made);
    var r = job(File(tif), FIX.out.fsName + "/tmp_cmyk.psd", { top: 0.1, left: 0, bottom: 0, right: 0 }, {});
    check(r.ok, "ok: " + r.message);
    check(psInfo(FIX.out.fsName + "/tmp_cmyk.psd").split("|")[3].indexOf("CMYK") >= 0, "bleibt CMYK");
});

test("psJob: Datei in Photoshop schon offen -> Fehler, Dokument bleibt offen", function () {
    psRun("app.open(File(" + FIX.png.fsName.toSource() + "));'ok'");
    var r = job(FIX.png, FIX.out.fsName + "/tmp_offen.psd", { top: 0.1, left: 0, bottom: 0, right: 0 }, {});
    check(!r.ok && r.message.indexOf("geöffnet") >= 0, "Meldung: " + r.message);
    var still = psRun("(function(){for(var i=0;i<app.documents.length;i++){if(app.documents[i].name==" +
        FIX.png.name.toSource() + "){app.documents[i].close(SaveOptions.DONOTSAVECHANGES);return 'offen';}}return 'zu';})()");
    check(still === "offen", "Dokument war noch offen: " + still);
});

test("psJob: fehlende Datei", function () {
    var r = job(File(FIX.out.fsName + "/gibtsnicht.png"), FIX.out.fsName + "/tmp_x.psd", { top: 0.1, left: 0, bottom: 0, right: 0 }, {});
    check(!r.ok, "Fehler erwartet");
});
```

- [ ] **Step 3:** Tests → FAIL.
- [ ] **Step 4: Implementieren** (nach Abschnitt „Dokument-Helfer“):

```js
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
            if (fn === src.fsName) return "error|Datei ist in Photoshop geöffnet, bitte dort schließen";
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
            clio.putString(s("gi_ADVANCED"), "{\"enable_mts\":true}");
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
    bt.body = source;
    bt.onResult = function (m) { res = m.body; };
    bt.onError = function (m) { err = m.body; };
    t0 = new Date().getTime();
    bt.send();
    while (res === null && err === null) {
        if (new Date().getTime() - t0 > timeoutMs) return "error|Zeitüberschreitung (" + Math.round(timeoutMs / 1000) + " s)";
        BridgeTalk.pump();
        $.sleep(100);
    }
    return res !== null ? res : "error|" + err;
};
```

- [ ] **Step 5:** perl-Escape, Tests → 0 fehlgeschlagen. Falls der inhaltsbasierte Fill auf der Ebene mit transparentem Rand scheitert: Ursache untersuchen (systematic-debugging), z. B. Rand vor dem Füllen auf „Beschnitt“-Ebene nicht transparent lassen.
- [ ] **Step 6:** Commit „Photoshop-Job und BridgeTalk“.

---

### Task 3: applyFill in InDesign

**Files:** Modify `Beschnitt_ergaenzen.jsx` (`BE.checkFillable`, `BE.applyFill` nach `BE.applyMirror`; `BE.processFrame`, `BE.process`, `BE.formatSummary`); Create `test/test_8_fuellen.jsx`

**Interfaces:**
- Consumes: Task 1 + 2
- Produces: `BE.checkFillable(frame)` → Grund|null; `BE.applyFill(frame, fb, tb, mode)` → Grund|null (legt Pfad in `BE.createdFiles` ab); `BE.process(items, method, bleed, onProgress)` → `{done, skipped, created}`; `onProgress(i, n, name)` optional

- [ ] **Step 1: Tests** – `test/test_8_fuellen.jsx`:

```js
// Füllen in InDesign (inhaltsbasiert, echtes Photoshop)
test("Fuellen: Bild oben/links, neu verknuepft, Originalpixel bleiben", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var r = BE.processFrame(f, "fill-ca", B9);
    check(r === null, "Ergebnis " + r);
    var g = f.allGraphics[0];
    check(/^fixture_beschnitt(-\d+)?\.psd$/.test(g.itemLink.name), "Link " + g.itemLink.name);
    near(f.geometricBounds, [-9, -9, 100, 100], "Rahmen");
    near(g.geometricBounds, [-12, -12, 100, 100], "Grafik (12 px = 12 pt ergaenzt)");
});

test("Fuellen: Bild reicht -> kein Photoshop, Link bleibt", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], FIX.png, [-20, -20, 120, 120]);
    check(BE.processFrame(f, "fill-ca", B9) === null, "Ergebnis");
    check(f.allGraphics[0].itemLink.name === "fixture.png", "Link " + f.allGraphics[0].itemLink.name);
    near(f.geometricBounds, [-9, -9, 100, 100], "Rahmen");
});

test("Fuellen: PDF unten/rechts wird Bild", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [200, 100, 300, 200], FIX.pdf);
    check(BE.processFrame(f, "fill-ca", B9) === null, "Ergebnis");
    var g = f.allGraphics[0], gb = g.geometricBounds;
    check(g.constructor.name === "Image", "Typ " + g.constructor.name);
    near([gb[0], gb[1]], [200, 100], "oben/links unveraendert");
    check(gb[2] >= 309 - BE.EPS && gb[3] >= 209 - BE.EPS, "deckt Ziel ab: " + gb);
    near(f.geometricBounds, [200, 100, 309, 209], "Rahmen");
});

test("checkFillable: fehlende Verknuepfung", function () {
    var doc = FIX.doc({ facing: false });
    var tmp = File(FIX.out.fsName + "/tmp_missing.png");
    FIX.png.copy(tmp);
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], tmp);
    tmp.remove();
    check(BE.checkFillable(f) === "Verknüpfung fehlt oder ist nicht aktuell", "Grund: " + BE.checkFillable(f));
});

test("process: Fuellen meldet neue PSD-Dateien", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    var calls = [];
    var res = BE.process([f], "fill-ca", B9, function (i, n, name) { calls.push(i + "/" + n); });
    check(res.done === 1 && res.created.length === 1, "created " + res.created.length);
    check(calls.join(",") === "1/1", "Fortschritt " + calls.join(","));
    check(BE.formatSummary(res).indexOf("1 neue PSD-Datei") > 0, BE.formatSummary(res));
});
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3: Implementieren** – nach `BE.applyMirror`:

```js
BE.createdFiles = [];

BE.checkFillable = function (frame) {
    var g = frame.allGraphics[0], t = g.constructor.name, link = g.itemLink;
    if (t !== "Image" && t !== "PDF") return "Dateityp wird für Füllen nicht unterstützt";
    if (!link || link.status != LinkStatus.NORMAL) return "Verknüpfung fehlt oder ist nicht aktuell";
    if (Math.abs(g.rotationAngle) > BE.EPS || Math.abs(g.shearAngle) > BE.EPS || g.absoluteFlip != Flip.NONE) {
        return "Grafik im Rahmen gedreht oder gespiegelt";
    }
    return null;
};

// Fehlendes Bild in Photoshop ergänzen, neue PSD verknüpfen, Rahmen erweitern.
BE.applyFill = function (frame, fb, tb, mode) {
    var reason = BE.checkFillable(frame), g, gb, need, link, src, dst, params, r;
    if (reason) return reason;
    g = frame.allGraphics[0];
    gb = g.geometricBounds;
    need = BE.fillNeed(gb, tb, BE.TOLERANZ_PT);
    if (!BE.needsFill(need)) {
        BE.setFrameBounds(frame, tb);
        return null;
    }
    link = g.itemLink;
    src = File(link.filePath);
    dst = BE.nextFreeName(src.parent.fsName, BE.baseName(src.name), function (path) { return File(path).exists; });
    params = { src: src.fsName, dst: dst, need: need, mode: mode, isPdf: g.constructor.name === "PDF", pdfPage: 1, pdfCrop: "BOUNDINGBOX" };
    if (params.isPdf) {
        params.pdfPage = g.pdfAttributes.pageNumber;
        params.pdfCrop = BE.pdfCropName(g.pdfAttributes.pdfCrop);
    }
    r = BE.parsePsResult(BE.callPhotoshop(BE.psSource(params), mode === "generative" ? 180000 : 60000));
    if (!r.ok) return "Photoshop: " + r.message;
    BE.createdFiles.push(dst);
    link.relink(File(dst));
    frame.allGraphics[0].geometricBounds = BE.filledBounds(gb, r);
    BE.setFrameBounds(frame, tb);
    return null;
};
```

`BE.processFrame` letzte Zeile ersetzen durch:

```js
    if (method === "mirror") return BE.applyMirror(frame, fb, t);
    if (method === "fill-ca" || method === "fill-gen") {
        return BE.applyFill(frame, fb, t.target, method === "fill-gen" ? "generative" : "contentAware");
    }
    return BE.applyScale(frame, fb, t.target);
```

`BE.process` ersetzen durch:

```js
BE.process = function (items, method, bleed, onProgress) {
    var res = { done: 0, skipped: [], created: [] }, seen = {}, i, r, reason;
    BE.createdFiles = res.created;
    for (i = 0; i < items.length; i++) {
        r = BE.resolveFrame(items[i]);
        if (onProgress) onProgress(i + 1, items.length, BE.itemName(r.frame || items[i]));
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
```

In `BE.formatSummary` vor `return s;`:

```js
    if (res.created && res.created.length) {
        s += "\n\n" + res.created.length + (res.created.length === 1 ? " neue PSD-Datei" : " neue PSD-Dateien") +
            " neben den Originalen angelegt (bleiben beim Rückgängigmachen erhalten).";
    }
```

- [ ] **Step 4:** perl-Escape, Tests → 0 fehlgeschlagen. Der Missing-Link-Test: falls InDesign den Status erst nach Prüfung aktualisiert, im Test vor der Prüfung `doc.links.everyItem().getElements()` abfragen bzw. kurz warten – nicht die Produktlogik aufweichen.
- [ ] **Step 5:** Commit „Fuellen in InDesign“.

---

### Task 4: Dialog, Fortschritt, Ablauf, Doku

**Files:** Modify `Beschnitt_ergaenzen.jsx` (`BE.askMethod`, `BE.run`, neues `BE.progress`), `README.md`

- [ ] **Step 1: `BE.askMethod` ersetzen:**

```js
BE.askMethod = function (bleed) {
    var w = new Window("dialog", "Beschnitt ergänzen"), pm, pb, g, rScale, rMirror, rFill, pf, rCa, rGen, note;
    w.alignChildren = "fill";
    pm = w.add("panel", undefined, "Methode");
    pm.alignChildren = "left";
    rScale = pm.add("radiobutton", undefined, "Skalieren");
    rMirror = pm.add("radiobutton", undefined, "Spiegeln");
    rFill = pm.add("radiobutton", undefined, "Füllen (Photoshop)");
    pf = pm.add("group");
    pf.orientation = "column";
    pf.alignChildren = "left";
    pf.margins = [20, 0, 0, 0];
    rCa = pf.add("radiobutton", undefined, "inhaltsbasiert");
    rGen = pf.add("radiobutton", undefined, "generativ");
    rCa.value = true;
    note = pf.add("statictext", undefined, "PDF/AI werden in Pixel umgewandelt (300 ppi).\nNeue PSD-Dateien entstehen neben den Originalen.", { multiline: true });
    note.preferredSize.width = 320;
    var genNote = pf.add("statictext", undefined, "Generativ braucht Internet, verbraucht generative Credits\nund nutzt eine nicht offiziell dokumentierte Photoshop-Funktion.", { multiline: true });
    genNote.preferredSize.width = 320;
    rScale.value = true;
    function sync() {
        pf.enabled = rFill.value;
        genNote.visible = rFill.value && rGen.value;
    }
    rScale.onClick = rMirror.onClick = rFill.onClick = rCa.onClick = rGen.onClick = sync;
    sync();
    pb = w.add("panel", undefined, "Beschnitt des Dokuments");
    pb.alignChildren = "left";
    pb.add("statictext", undefined, "Oben: " + BE.mm(bleed.top) + "    Unten: " + BE.mm(bleed.bottom));
    pb.add("statictext", undefined, "Innen/Links: " + BE.mm(bleed.inside) + "    Außen/Rechts: " + BE.mm(bleed.outside));
    g = w.add("group");
    g.alignment = "right";
    g.add("button", undefined, "Abbrechen", { name: "cancel" });
    g.add("button", undefined, "OK", { name: "ok" });
    if (w.show() !== 1) return null;
    if (rMirror.value) return "mirror";
    if (rFill.value) return rGen.value ? "fill-gen" : "fill-ca";
    return "scale";
};
```

- [ ] **Step 2: Fortschritt** – nach `BE.askMethod`:

```js
// Fortschrittsfenster; liefert {update(i, n, name), close()}
BE.progress = function (total) {
    var w = new Window("palette", "Beschnitt ergänzen"), bar, label;
    w.alignChildren = "fill";
    label = w.add("statictext", undefined, "");
    label.preferredSize.width = 360;
    bar = w.add("progressbar", undefined, 0, total);
    bar.preferredSize.width = 360;
    w.show();
    return {
        update: function (i, n, name) {
            label.text = "Rahmen " + i + " von " + n + " – " + name;
            bar.value = i - 1;
            w.update();
        },
        close: function () { w.close(); }
    };
};
```

- [ ] **Step 3: `BE.run` anpassen** – nach `if (!method) return;`:

```js
    var isFill = method === "fill-ca" || method === "fill-gen", prog = null;
    if (isFill && !BE.psSpecifier()) {
        alert("Photoshop wurde nicht gefunden.");
        return;
    }
    if (isFill) prog = BE.progress(items.length);
    try {
        BE.runUndoable(function () {
            res = BE.withSettings(doc, function () {
                return BE.process(items, method, bleed, prog ? prog.update : null);
            });
        });
    } finally {
        if (prog) prog.close();
    }
    alert(BE.formatSummary(res), "Beschnitt ergänzen");
```

(den bisherigen `BE.runUndoable(...)`-Block und das `alert` am Ende ersetzen).

- [ ] **Step 4:** perl-Escape; Tests → 0 fehlgeschlagen; Syntax des Dialogs prüfen: Script per `osascript` mit `BE_TEST` laden und `BE.askMethod` **nicht** aufrufen (Dialog ist manuell zu testen).
- [ ] **Step 5: README** – Abschnitt „Methoden“ ergänzen:

```markdown
- **Füllen (Photoshop):** fehlendes Bild wird in Photoshop ergänzt – *inhaltsbasiert*
  (lokal, kostenlos) oder *generativ* (Internet, verbraucht generative Credits,
  nicht offiziell dokumentierte Photoshop-Funktion). Ergebnis: `Name_beschnitt.psd`
  mit Ebenen neben dem Original, der Rahmen wird darauf neu verknüpft.
  PDF/AI werden dabei mit 300 ppi gerastert. Die PSD-Dateien bleiben beim
  Rückgängigmachen erhalten.
```

- [ ] **Step 6:** Commit „Dialog und Fortschritt fuer Fuellen“; Push.
- [ ] **Step 7: Manuell mit Nutzer:** Dialog; inhaltsbasiert an echtem Foto; generativ **nur nach Freigabe** (Credits) an RGB- und ggf. CMYK-Bild.
