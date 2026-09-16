// Method: mirror
test("mirror: top + left, group with strips and corner", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100], FIX.png, [-10, -20, 110, 120]);
    var fid = f.id;
    check(BE.processFrame(f, "mirror", B9) === null, "result");
    check(doc.groups.length === 1, "one group");
    var grp = doc.groups[0];
    check(grp.pageItems.length === 4, "4 items: " + grp.pageItems.length);
    var orig = grp.pageItems.itemByID(fid);
    near(orig.geometricBounds, [0, 0, 100, 100], "original unchanged");
    near(orig.allGraphics[0].geometricBounds, [-10, -20, 110, 120], "original graphic unchanged");
    var top = pieceAt(grp, [-9, 0, 0, 100]);
    check(top !== null, "top strip exists");
    if (top) {
        near(top.allGraphics[0].geometricBounds, [-110, -20, 10, 120], "top graphic mirrored");
        check(!BE.hasStroke(top), "no stroke");
    }
    var left = pieceAt(grp, [0, -9, 100, 0]);
    check(left !== null, "left strip exists");
    if (left) near(left.allGraphics[0].geometricBounds, [-10, -120, 110, 20], "left graphic mirrored");
    var corner = pieceAt(grp, [-9, -9, 0, 0]);
    check(corner !== null, "corner exists");
    if (corner) near(corner.allGraphics[0].geometricBounds, [-110, -120, 10, 20], "corner graphic mirrored");
});

test("mirror: right edge of a spread, no strip at the spine", function () {
    var doc = FIX.doc({ facing: true, pages: 3, bleed: { top: 0, bottom: 0, inside: 3, outside: 12 } });
    var right = doc.spreads[1].pages[1], pb = right.bounds;
    var f = FIX.frame(right, [100, pb[1], 200, pb[3]]);
    check(BE.processFrame(f, "mirror", BE.readBleed(doc)) === null, "result");
    var grp = doc.groups[0];
    check(grp.pageItems.length === 2, "original + 1 strip: " + grp.pageItems.length);
    var strip = pieceAt(grp, [100, pb[3], 200, pb[3] + 12]);
    check(strip !== null, "right strip");
    if (strip) near(strip.allGraphics[0].geometricBounds, [100, pb[3], 200, pb[3] + 200], "graphic mirrored");
});

test("mirror: PDF bottom right", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [200, 100, 300, 200], FIX.pdf);
    check(BE.processFrame(f, "mirror", B9) === null, "result");
    var grp = doc.groups[0];
    check(grp.pageItems.length === 4, "original + 2 strips + corner: " + grp.pageItems.length);
    check(pieceAt(grp, [300, 200, 309, 209]) !== null, "bottom right corner");
    var items = grp.pageItems.everyItem().getElements(), pdfs = 0, i;
    for (i = 0; i < items.length; i++) if (items[i].allGraphics[0].constructor.name === "PDF") pdfs++;
    check(pdfs === 4, "all pieces contain the PDF: " + pdfs);
});

test("mirror: stroke and text wrap only on the original", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 50, 100, 150]);
    f.strokeWeight = 4;
    f.textWrapPreferences.textWrapMode = TextWrapModes.BOUNDING_BOX_TEXT_WRAP;
    check(BE.processFrame(f, "mirror", B9) === null, "result");
    var grp = doc.groups[0];
    var strip = pieceAt(grp, [-9, 50, 0, 150]);
    check(strip !== null, "top strip");
    if (strip) {
        check(!BE.hasStroke(strip), "stroke removed");
        check(strip.textWrapPreferences.textWrapMode == TextWrapModes.NONE, "no text wrap");
    }
    var orig = pieceAt(grp, [0, 50, 100, 150]);
    check(orig !== null && orig.strokeWeight === 4 && BE.hasStroke(orig), "original keeps its stroke");
});

// Regression: setting strokeWeight = 0 on a frame whose stroke colour is [None]
// makes InDesign apply a 1 pt black stroke.
test("mirror: frame without stroke colour gets no stroke on the strips", function () {
    var doc = FIX.doc({ facing: false });
    var f = FIX.frame(doc.pages[0], [0, 0, 100, 100]);
    f.strokeColor = doc.swatches.itemByName("None");
    check(f.strokeColor.name === "None", "precondition: stroke colour None");
    check(BE.processFrame(f, "mirror", B9) === null, "result");
    var items = doc.groups[0].pageItems.everyItem().getElements(), i, bad = [];
    for (i = 0; i < items.length; i++) {
        if (BE.hasStroke(items[i])) bad.push(items[i].strokeWeight + " pt " + items[i].strokeColor.name);
    }
    check(bad.length === 0, "pieces with stroke: " + bad.join(", "));
});
