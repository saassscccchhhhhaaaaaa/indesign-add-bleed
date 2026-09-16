// Fill: pure functions
test("fillNeed: missing top/left with margin", function () {
    var n = BE.fillNeed([0, 0, 100, 200], [-9, -9, 100, 200], 2);
    near([n.top, n.left, n.bottom, n.right], [0.11, 0.055, 0, 0], "shares", 0.0001);
    check(BE.needsFill(n), "needsFill");
});

test("fillNeed: graphic is big enough", function () {
    var n = BE.fillNeed([-20, -20, 120, 220], [-9, -9, 100, 200], 2);
    near([n.top, n.left, n.bottom, n.right], [0, 0, 0, 0], "shares");
    check(!BE.needsFill(n), "needsFill");
});

test("baseName and nextFreeName", function () {
    check(BE.baseName("a.b.jpg") === "a.b", BE.baseName("a.b.jpg"));
    check(BE.baseName("noext") === "noext", BE.baseName("noext"));
    var taken = { "/x/pic_bleed.psd": 1, "/x/pic_bleed-2.psd": 1 };
    var p = BE.nextFreeName("/x", "pic", function (path) { return taken[path] === 1; });
    check(p === "/x/pic_bleed-3.psd", p);
    check(BE.nextFreeName("/x", "new", function () { return false; }) === "/x/new_bleed.psd", "free");
});

test("parsePsResult", function () {
    var r = BE.parsePsResult("ok|400|200|20|0|0|40");
    check(r.ok && r.origW === 400 && r.origH === 200, "size");
    check(r.add.top === 20 && r.add.left === 0 && r.add.bottom === 0 && r.add.right === 40, "add");
    r = BE.parsePsResult("error|broken|more");
    check(!r.ok && r.message === "broken|more", r.message);
    r = BE.parsePsResult("undefined");
    check(!r.ok && r.message.indexOf("undefined") > 0, r.message);
});

test("filledBounds", function () {
    var r = { origW: 400, origH: 200, add: { top: 20, left: 0, bottom: 0, right: 40 } };
    near(BE.filledBounds([0, 0, 100, 200], r), [-10, 0, 100, 220], "bounds");
});

test("psOverlap and psInnerRect", function () {
    check(BE.psOverlap(1200, 1200) === 12, "1200");
    check(BE.psOverlap(300, 300) === 8, "min 8");
    check(BE.psOverlap(8000, 6000) === 40, "max 40");
    near(BE.psInnerRect(100, 50, { top: 10, left: 0, bottom: 0, right: 5 }, 8), [0, 18, 92, 60], "inner rectangle");
});
