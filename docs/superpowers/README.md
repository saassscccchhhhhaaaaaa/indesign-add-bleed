# Design notes

Specifications and implementation plans written while building the script
(in German). They document the decisions behind version 1 (scale, mirror) and
version 2 (fill via Photoshop). File and function names in these notes refer to
the state at that time: the script was called `Beschnitt_ergaenzen.jsx` then and
created `*_beschnitt.psd` files; since version 2.1.0 it is `AddBleed.jsx` and
creates `*_bleed.psd` files.

- `specs/` – what the script should do and why
- `plans/` – step-by-step implementation plans with tests
