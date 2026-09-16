# Design notes

Specifications and implementation plans written while building the script.
They document the decisions behind version 1 (scale, mirror) and version 2
(fill via Photoshop).

They describe the state at that time: the script was called
`Beschnitt_ergaenzen.jsx`, had a German-only UI and created `*_beschnitt.psd`
files. Since version 2.1.0 it is `AddBleed.jsx` (German/English UI) and creates
`*_bleed.psd` files. The code blocks in the plans are kept exactly as planned
back then.

- `specs/` – what the script should do and why
- `plans/` – step-by-step implementation plans with tests
