# 3.2.0 Release Notes — Elegant Firefox Dark / Elegant Firefox Light

## What changed in this release

3.2.0 adds a pair of themes based on the Firefox DevTools colors, taking the collection from 26 to 28 themes (14 dark + 14 light). The generator, key inventory, Islands structure and build scripts are unchanged.

1. **New palettes** `tools/palettes/firefox-dark.json` and `tools/palettes/firefox-light.json`. `node tools/generate.mjs` renders the JetBrains files `resources/theme/firefox-{dark,light}.theme.{json,xml}` and the VS Code files `vscode/themes/firefox-{dark,light}.json`.
2. **Registration**: the generator appends two `themeProvider` + `colorScheme` pairs inside the `generated-themes` block of `plugin.xml` (`elegant-firefox-dark` / `ElegantFirefoxDark`, `elegant-firefox-light` / `ElegantFirefoxLight`) and two entries to `contributes.themes` in `vscode/package.json`.
3. **Version**: `<version>` in `plugin.xml` and `version` in `vscode/package.json` are both 3.2.0; `since-build` stays at 253.
4. **Artifacts**: `dist/elegant-theme-3.2.0.zip` and `dist/elegant-theme-3.2.0.vsix`. Artifacts from earlier versions remain in `dist/`.

## Color source

The source is [eronh/firefox-theme-vscode](https://github.com/eronh/firefox-theme-vscode) (MIT License, `package.json` version 4.10.8), files `themes/dark.json` and `themes/light.json`. This release borrows only its color language and does not copy its theme files; every UI key and JetBrains file is rendered from palettes by this repository's generator.

The original theme conflicts with this collection's base rules in four places:

| Conflict | Original theme | Handling in this release |
|---|---|---|
| Dark base not black enough | Dark editor `#2A2A2E`, relative luminance 0.0235 | Uses the original tab bar and status bar color `#0C0C0D` (Photon grey-90), relative luminance 0.0037 |
| Neutral-gray body text | Dark `#B1B1B3`, Light `#4A4A4F`, chroma below `0x14` | Dark `#cfd3ec`, Light `#3a3852`, both blue-violet grays |
| Uncolored or shared token colors | Light's generic `string` scope uses the body gray `#4A4A4F` (only quoted strings get `#003EAA`); Dark strings, numbers and regex share `#6B89FF`; Dark function names and properties share `#86DE74` | Split into separate roles, see the table below |
| Light contrast right at the limit | `#DD00A9` 4.52:1, `#0074E8` 4.50:1, `#058B00` 4.47:1 (against `#FFFFFF`) | Same hues, deepened to clear 4.5:1 with margin |

## Role mapping

| Role | Firefox Dark | Source | Firefox Light | Source |
|---|---|---|---|---|
| Keyword | `#ff7de9` | original keyword | `#c5009a` | original `#DD00A9`, deepened |
| Storage modifier | `#f59cff` | original storage family | `#a3168f` | new, magenta family |
| Control flow | `#ff8fb1` | new | `#d7264f` | new |
| Type / class | `#b98eff` / `#cfa8ff` | original class name | `#0062c4` / `#5b3fd4` | original `#0074E8`, deepened / new |
| Function | `#86de74` | original `entity.name.function` | `#8000d7` | original function |
| Variable / parameter | `#75bfff` / `#a3d4ff` | original variable | `#00799e` / `#a8457a` | new |
| Property | `#4fe0e8` | new (was shared with functions) | `#057a00` | original `#058B00`, deepened |
| String | `#6b89ff` | original string | `#003eaa` | original quoted-string color, extended to all strings |
| Number | `#ff9f5c` | new (was shared with strings) | `#b35900` | new |
| Constant | `#ffffb4` | original user-defined constant | `#c4440a` | new |
| Tag / attribute name | `#6fc3ff` / `#ffa3ef` | original tag / attribute family | `#8000d7` / `#b8007a` | original tag / attribute family |

The UI keeps the original signature colors: Photon blue accent (Dark `#0a84ff`; Light uses blue-60 `#0060df` because `#0A84FF` reaches only 3.65:1 against white text), selection Dark `#204e8a` and Light `#b9d7fd`, and the Light tool-window color `#f9f9fa`.

## Design values

| Item | Firefox Dark | Firefox Light |
|---|---|---|
| Editor `bg.editor` | `#0c0c0d`, relative luminance 0.0037 | `#ffffff`, relative luminance 1.0000 |
| Body text `fg.text` | `#cfd3ec`, 13.20:1 | `#3a3852`, 11.25:1 |
| Comment `fg.comment` | `#8f8ca6`, 6.02:1 | `#8a8798`, 3.50:1 |
| Syntax contrast range | 6.19:1 (string) to 18.82:1 (constant) | 4.71:1 (escape) to 9.25:1 (string) |
| Accent against `onAccent` | `#0a84ff` / `#0c0c0d`, 5.36:1 | `#0060df` / `#ffffff`, 5.62:1 |

## Hard constraints

- **Firefox Dark strings stay `#6b89ff`.** It is the original theme's most recognizable color and the lowest-contrast syntax color in the set (6.19:1); brightening it pushes it toward the variable color `#75bfff`.
- **Numbers and properties must not be merged back into the original shared colors.** In the original theme numbers share the string color and properties share the function color, which violates this collection's rule that every kind of code element has its own color.
- All other constraints are the same as in 3.0.0; see "Hard constraints and maintenance notes" in `_docs/release-3.0.0.en.md`.

## Release conventions

- The first `<p>` of `<change-notes>` is the update-notification body and contains no `<a>` link; the notification button points at `_docs/release-3.2.0.en.md`, which is on main at release time.
- No source code changes.
