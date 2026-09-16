// Photoshop job via BridgeTalk (content-aware only)
function psInfo(path) {
    return psRun("(function(){var d=app.open(File(" + path.toSource() + "));" +
        "var n=[];for(var i=0;i<d.layers.length;i++)n.push(d.layers[i].name);" +
        "var r=[d.width.as('px'),d.height.as('px'),n.join(','),String(d.mode)].join('|');" +
        "d.close(SaveOptions.DONOTSAVECHANGES);return r;})()");
}

function job(src, dst, need, extra) {
    var p = {
        src: src.fsName, dst: dst, need: need, mode: "contentAware", isPdf: false, pdfPage: 1, pdfCrop: "BOUNDINGBOX",
        msg: { fileMissing: BE.t("psFileMissing"), fileOpen: BE.t("psFileOpen") }
    };
    for (var k in extra) p[k] = extra[k];
    return BE.parsePsResult(BE.callPhotoshop(BE.psSource(p), 60000));
}

test("psSource contains helpers and parameters", function () {
    var s = BE.psSource({ mode: "contentAware" });
    check(s.indexOf("BE.psOverlap = ") >= 0 && s.indexOf("BE.psJob(") >= 0 && s.indexOf("contentAware") > 0, s.substring(0, 80));
});

test("pdfCropName", function () {
    check(BE.pdfCropName(PDFCrop.CROP_CONTENT_VISIBLE_LAYERS) === "BOUNDINGBOX", "bounding box");
    check(BE.pdfCropName(PDFCrop.CROP_MEDIA) === "MEDIABOX", "media");
    check(BE.pdfCropName(PDFCrop.CROP_PDF) === "CROPBOX", "crop");
    check(BE.pdfCropName(PDFCrop.CROP_TRIM) === "TRIMBOX", "trim");
    check(BE.pdfCropName(PDFCrop.CROP_BLEED) === "BLEEDBOX", "bleed");
    check(BE.pdfCropName(PDFCrop.CROP_ART) === "ARTBOX", "art");
});

test("Photoshop found", function () {
    check(BE.psSpecifier() !== null, "specifier");
});

test("psJob: PNG top/left content-aware", function () {
    var dst = FIX.out.fsName + "/tmp_job.psd", mod = FIX.png.modified.getTime();
    var r = job(FIX.png, dst, { top: 0.11, left: 0.055, bottom: 0, right: 0 }, {});
    check(r.ok, "ok: " + r.message);
    if (!r.ok) return;
    check(r.origW === 100 && r.origH === 100, "original size " + r.origW + "x" + r.origH);
    check(r.add.top === 11 && r.add.left === 6 && r.add.bottom === 0 && r.add.right === 0, "add " + r.add.toSource());
    check(File(dst).exists, "PSD exists");
    var info = psInfo(dst).split("|");
    check(info[0] === "106" && info[1] === "111", "PSD size " + info[0] + "x" + info[1]);
    check(info[2] === "Bleed,Original", "layers " + info[2]);
    check(FIX.png.modified.getTime() === mod, "original unchanged");
});

test("psJob: PDF right/bottom", function () {
    var dst = FIX.out.fsName + "/tmp_pdf.psd";
    var r = job(FIX.pdf, dst, { top: 0, left: 0, bottom: 0.1, right: 0.1 }, { isPdf: true });
    check(r.ok, "ok: " + r.message);
    if (r.ok) check(r.origW > 400 && r.add.right > 40 && r.add.top === 0, "300 ppi: " + r.origW + ", add " + r.add.right);
});

test("psJob: CMYK image", function () {
    var tif = FIX.out.fsName + "/tmp_cmyk.tif";
    var made = psRun("(function(){var d=app.open(File(" + FIX.png.fsName.toSource() + "));" +
        "d.changeMode(ChangeMode.CMYK);d.saveAs(File(" + tif.toSource() + "),new TiffSaveOptions(),true);" +
        "d.close(SaveOptions.DONOTSAVECHANGES);return 'ok';})()");
    check(made === "ok", "CMYK TIFF: " + made);
    var r = job(File(tif), FIX.out.fsName + "/tmp_cmyk.psd", { top: 0.1, left: 0, bottom: 0, right: 0 }, {});
    check(r.ok, "ok: " + r.message);
    check(psInfo(FIX.out.fsName + "/tmp_cmyk.psd").split("|")[3].indexOf("CMYK") >= 0, "stays CMYK");
});

test("psJob: file already open in Photoshop -> error, document stays open", function () {
    psRun("app.open(File(" + FIX.png.fsName.toSource() + "));'ok'");
    var r = job(FIX.png, FIX.out.fsName + "/tmp_open.psd", { top: 0.1, left: 0, bottom: 0, right: 0 }, {});
    check(!r.ok && r.message === BE.t("psFileOpen"), "message: " + r.message);
    var still = psRun("(function(){for(var i=0;i<app.documents.length;i++){if(app.documents[i].name==" +
        FIX.png.name.toSource() + "){app.documents[i].close(SaveOptions.DONOTSAVECHANGES);return 'open';}}return 'closed';})()");
    check(still === "open", "document was still open: " + still);
});

test("psJob: missing file", function () {
    var r = job(File(FIX.out.fsName + "/doesnotexist.png"), FIX.out.fsName + "/tmp_x.psd", { top: 0.1, left: 0, bottom: 0, right: 0 }, {});
    check(!r.ok && r.message.indexOf("file not found: ") === 0, "message: " + r.message);
});
