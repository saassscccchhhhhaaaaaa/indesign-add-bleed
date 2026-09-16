// Photoshop-Job ueber BridgeTalk (nur inhaltsbasiert)
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
    check(r.origW === 100 && r.origH === 100, "Originalmass " + r.origW + "x" + r.origH);
    check(r.add.top === 11 && r.add.left === 6 && r.add.bottom === 0 && r.add.right === 0, "add " + r.add.toSource());
    check(File(dst).exists, "PSD vorhanden");
    var info = psInfo(dst).split("|");
    check(info[0] === "106" && info[1] === "111", "PSD-Mass " + info[0] + "x" + info[1]);
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
    check(!r.ok && r.message.indexOf("ge\u00f6ffnet") >= 0, "Meldung: " + r.message);
    var still = psRun("(function(){for(var i=0;i<app.documents.length;i++){if(app.documents[i].name==" +
        FIX.png.name.toSource() + "){app.documents[i].close(SaveOptions.DONOTSAVECHANGES);return 'offen';}}return 'zu';})()");
    check(still === "offen", "Dokument war noch offen: " + still);
});

test("psJob: fehlende Datei", function () {
    var r = job(File(FIX.out.fsName + "/gibtsnicht.png"), FIX.out.fsName + "/tmp_x.psd", { top: 0.1, left: 0, bottom: 0, right: 0 }, {});
    check(!r.ok, "Fehler erwartet");
});
