# Add Bleed (InDesign script)

Version 2.2.1 | Author: Sascha Fronczek | [saschafronczek.de](https://saschafronczek.de) | License: [MIT](LICENSE) | free

## Video

[![Watch the video: Free InDesign script – add missing bleed in one click](https://img.youtube.com/vi/6Nsph7fr_Zw/maxresdefault.jpg)](https://youtu.be/6Nsph7fr_Zw)

▶️ [Watch on YouTube: Free InDesign script – add missing bleed in one click](https://youtu.be/6Nsph7fr_Zw)

## What is it for?

Images that run to the edge of the page ("full bleed") have to extend a little beyond
the trim edge for printing – the **bleed**, usually 3 mm (1/8 in). Printers never cut
paper exactly; without bleed you get thin white slivers along the edges.

In practice this extra image is often missing: the photo is cropped too tightly, the
frame ends exactly at the page edge, or a supplied PDF ad has no bleed. Fixing it by
hand is tedious – drag the frame, scale the image, extend the canvas in Photoshop,
fill it, place it again.

**This script does it in one step:** select frames, run the script, pick a method.
It reads the bleed from the document setup, detects which edges touch the page edge
(1 mm tolerance), leaves the spine of facing pages alone, and adds the missing
margin – for one frame or many at once. It works with images as well as placed
PDF and AI files.

The Add Bleed script runs in English and German – English by default, German can be
chosen in the dialog.

### Which method when?

| Method | Good for | Result |
|---|---|---|
| **Scale** | images with some room around the subject | image slightly larger, crop shifts a little |
| **Mirror** | flat areas, sky, patterns, vector art, PDFs | artwork untouched, edge is mirrored; vectors stay vectors |
| **Fill – content-aware** | photos where nothing of the subject may be lost | Photoshop extends the edge to match the image (local, free) |
| **Fill – generative** | difficult images where content-aware isn't enough | Photoshop AI invents the edge (experimental, uses credits) |

## Methods in detail

- **Scale:** The frame is extended into the bleed. If the image doesn't reach far
  enough, it is enlarged proportionally around the frame centre – only as much as needed.
- **Mirror:** Mirrored copies are added as strips (and corners) in the bleed and
  grouped with the unchanged original.
- **Fill (Photoshop):** The missing image is added in Photoshop – *content-aware*
  (local, free) or *generative* (**experimental**: needs internet, uses generative
  credits and relies on an undocumented Photoshop function that may disappear with
  an update). The result is saved as `Name_bleed.psd` with layers next to the
  original and the frame is relinked to it; the original file is never changed.
  PDF/AI files are rasterised at 300 ppi. If the image already covers the bleed,
  only the frame is extended.

Everything can be undone in InDesign with a single undo step (created PSD files stay
on disk).

## Requirements

- Adobe InDesign 2026 (developed and tested on macOS with the German UI).
  InDesign 2025 and Windows should work but are not tested yet – feedback welcome.
- For "Fill": Adobe Photoshop 2026 (tested with 27.10).
- Languages: English (default) and German, selectable in the dialog.

## Installation

1. Download **`AddBleed.jsx`** from [Releases](../../releases).
2. In InDesign open **Window > Utilities > Scripts**, right-click **User** >
   **Reveal in Finder** (Windows: **Reveal in Explorer**).
3. Put the file into the **Scripts Panel** folder that opens.
4. It now appears in the Scripts panel under **User**.

Tip: you can assign a shortcut under **Edit > Keyboard Shortcuts** (area "Scripts").

For developers on macOS: `./install.sh` symlinks the file from the cloned repository
into all Scripts Panel folders it finds.

## Usage

Select one or more image frames, double-click the script, choose a method. A summary
at the end lists what was processed and what was skipped.

The language can be switched at the bottom of the dialog. The choice is remembered
(stored in `AddBleed/settings.txt` in your user application data folder).

**Not supported** (skipped and listed): rotated/skewed or non-rectangular frames,
frames inside groups or anchored, locked frames. For "Fill" also missing or modified
links and graphics that are rotated or flipped inside their frame.

## Bugs and ideas

Please use [Issues](../../issues/new/choose) and include your InDesign/Photoshop
version, operating system and the text of the summary dialog. The script is free and
maintained in spare time, so replies may take a while.

## Development

```bash
test/run_tests.sh
```

Drives InDesign 2026 via AppleScript (and Photoshop 2026 via BridgeTalk) and only
works with its own hidden test documents. Only content-aware fill is tested
automatically – generative fill uses credits and is checked by hand. InDesign is
unresponsive while the tests wait for Photoshop.

Write non-ASCII characters in string literals as `\uXXXX` – ExtendScript reads them
incorrectly otherwise (the test runner checks this). Design notes:
[`docs/superpowers/`](docs/superpowers/README.md).

## License

[MIT](LICENSE) © 2026 Sascha Fronczek – use at your own risk, no warranty.
Adobe, InDesign and Photoshop are trademarks of Adobe Inc.; this project is not
affiliated with Adobe.
