# Add Bleed – Design (version 1)

> Written for version 1, when the script was still called `Beschnitt_ergaenzen.jsx`.
> Since 2.1.0 it is `AddBleed.jsx` with a German/English UI.

## Goal
InDesign script that adds bleed to the selected image frames (image, PDF, AI …) on the
edges that touch the page edge. Two methods: **Scale** and **Mirror**.
Filling via Photoshop (content-aware/generative) is version 2 and not part of this design.

## Constraints
- ExtendScript (`.jsx`), a single file, runs in InDesign 2025 and 2026.
- Source: `Bleed_Area/Beschnitt_ergaenzen.jsx`; used via an alias in the Scripts Panel folder
  `~/Library/Preferences/Adobe InDesign/Version 21.0/de_DE/Scripts/Scripts Panel/`.
- The whole run is one undo step (`app.doScript(..., UndoModes.ENTIRE_SCRIPT)`).
- Points as the internal unit; the original units and ruler origin are restored in `finally`.

## Flow
1. **Check the selection**
   - No document / no selection → message, stop.
   - Accepted: rectangular frames (Rectangle, or Polygon with 4 right-angled points)
     that contain exactly one graphic. If the graphic itself is selected, its parent frame is used.
   - Skipped (with reason): empty frames, text frames, groups, frames with rotation
     or shear ≠ 0, all other shapes (ovals, polygons with ≠ 4 points, multiple paths).
   - No valid frames → message, stop.
2. **Dialog (ScriptUI)**: radio buttons "Scale" (default) / "Mirror"; shows the
   document bleed in mm; OK / Cancel.
3. **Read the bleed** from `documentPreferences`:
   `documentBleedTopOffset`, `documentBleedBottomOffset`,
   `documentBleedInsideOrLeftOffset`, `documentBleedOutsideOrRightOffset`.
   All four = 0 → message, stop.
   Left/right mapping per frame via `parentPage.side`:
   - `RIGHT_HAND` or `SINGLE_SIDED`: left = inside, right = outside.
   - `LEFT_HAND`: left = outside, right = inside.
   For frames spanning two pages: the left edge follows the page it lies on, the right
   edge likewise. (Inner edges are excluded by step 4 anyway.)
4. **Detect edges** (tolerance 1 mm = 2.835 pt, `geometricBounds`):
   - top: |frame.top − page.top| ≤ tolerance
   - bottom: |frame.bottom − page.bottom| ≤ tolerance
   - left: |frame.left − spread.left| ≤ tolerance
   - right: |frame.right − spread.right| ≤ tolerance
   "Page" = the page the edge lies on; "spread" = outer bounds of all pages of the
   spread. This way the spine never gets bleed.
   An edge whose bleed value is 0 does not count as detected.
   No edge detected → frame skipped ("not at the page edge").
5. **Add bleed** (see methods). Target bounds: edges are set to page/spread edge + bleed
   (not frame edge + bleed), so frames within the tolerance end up exactly on the
   bleed edge.
6. **Summary**: number processed / skipped, each with its reason.

## Method "Scale"
- Target frame T = frame, extended to the bleed edge on the detected edges.
- Graphic bounds G (`graphic.geometricBounds`). If G fully covers T →
  only set the frame to T, the graphic stays unchanged.
- Otherwise compute a factor s (≥ 1) around the centre C of the original frame so that
  the scaled graphic covers T; per side, e.g. top: s ≥ (C.y − T.top) / (C.y − G.top),
  likewise for bottom/left/right; s = maximum. Scale the graphic by s around C
  (proportionally), then set the frame to T.

## Method "Mirror"
- For each detected edge: duplicate the frame, mirror the duplicate at the edge line
  (left/right horizontally, top/bottom vertically), crop the duplicate frame to the strip
  between edge and bleed edge (the graphic keeps its position).
- For each pair of adjacent detected edges (top-left, top-right, bottom-left,
  bottom-right): mirror a duplicate in both directions, crop it to the corner square.
- Strips/corners: remove the stroke (`strokeWeight = 0`), text wrap off.
- Group the original and all strips/corners. The original stays unchanged.

## Error handling
- Error in one frame → frame skipped, error text in the summary,
  the remaining frames are still processed.
- Settings are always restored.

## Tests
Automated via AppleScript (`do script … language javascript`) against InDesign 2026:
create test documents (single and facing pages, equal and different bleed,
frames at the edge / spine / inside / across a spread, graphic with and without
overlap), run the script logic, compare the resulting bounds with expected values.
Visual check with a real image and PDF by the user.
