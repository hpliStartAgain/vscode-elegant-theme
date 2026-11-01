# 3.0.0 Release Notes — Elegant Theme Collection: 20 new themes, Islands corners everywhere, VS Code shipped alongside

## What changed in this release

3.0.0 turns this repository from "4 JetBrains themes" into "24 themes on two platforms": the JetBrains plugin and the VS Code extension are generated from the same palettes, so colors match exactly.

1. **20 new themes** (10 dark + 10 light), all generated from `tools/palettes/*.json` by `tools/generate.mjs`, which emits both JetBrains files (`.theme.json` + `.theme.xml`) and VS Code files (`vscode/themes/*.json`).
2. **The four original themes keep their colors**: the JetBrains files of Elegant Dark, Elegant Islands Dark, Elegant Islands Light and Elegant Ink Light remain hand-maintained; their VS Code ports are rendered by the generator from per-theme palettes (see "Handling of the original themes").
3. **Every JetBrains theme now uses the Islands rounded layout**: Elegant Dark gains `parentTheme: "Islands Dark"` and the `Island` key group; all new themes inherit Islands Dark / Islands Light. `since-build` therefore moves from 223 to 253 (2025.3).
4. **New VS Code extension** under `vscode/` (`elegant-theme-collection`, publisher `hpliStartAgain`) with all 24 themes under the same names.
5. **New build scripts**: `tools/build-jetbrains.sh`, `tools/build-vscode.sh`, `tools/build.sh`. The artifacts `dist/elegant-theme-3.0.0.zip` and `dist/elegant-theme-3.0.0.vsix` are committed with the repository. No Gradle.
6. **Removed the unregistered stub** `elegant-light.theme.json` and the empty `elegant-light.theme.icls`.
7. The update notification's release-notes link now points at this repository, `hpliStartAgain/vscode-elegant-theme`.

## Design principles

- **Near-black and pure-white bases.** Dark editor backgrounds range from `#0a0f17` to `#120f13`, with relative luminance at most 0.012 and a faint hue tint per theme (navy, plum, forest, warm black and so on). Light editor backgrounds are `#ffffff`; only Elegant Linen uses a faint linen cream `#fcf8f0`. Together with Ink Light's rice-paper base that makes two cream light themes.
- **Every code token carries a color.** All 23 syntax roles and the body text must have chroma (max RGB channel minus min channel) of at least `0x14`; white or neutral-gray tokens are not allowed. Roles that are usually gray — punctuation, namespaces, doc tags — are tinted too.
- **Quantified readability floor.** Syntax roles must reach WCAG 4.5:1 against the editor background, body text 7:1, comments and secondary text 3:1, line numbers 1.8:1. The generator checks these before rendering and aborts on any violation.
- **One color language per theme.** Each theme has its own dominant hue family (see "Theme list"); a role uses the same value on both platforms, and hex values are never copied between dark and light themes.
- **Uniform Islands structure.** Tool windows and island borders share one color (`Island.borderColor` = `ToolWindow.background`); the main window is one step lighter than the islands in dark themes and one step darker in light themes, following JetBrains' Islands guideline.

## Theme list

| Dark theme | Editor base | Color language |
|---|---|---|
| Elegant Midnight | `#0e1116` | One Dark Pro hues rebuilt |
| Elegant Aurora | `#0b1014` | Northern lights: mint, cyan, violet |
| Elegant Sakura Night | `#120f13` | Cherry-blossom pink, lilac, mint accents |
| Elegant Ocean Deep | `#0a0f17` | Blue, cyan, aqua, coral, sand-gold |
| Elegant Neon Candy | `#0d0d12` | Candy neon: magenta, electric blue, lime, lemon |
| Elegant Forest Night | `#0d110e` | Moss, amber, sand, sage |
| Elegant Sunset Ember | `#120e0e` | Orange, peach, coral, gold, violet, sea-mint |
| Elegant Lavender Dusk | `#0f0e15` | Lavender, periwinkle, pink, mint |
| Elegant Mint Noir | `#0b1210` | Mint, teal, lime, soft yellow, soft blue |
| Elegant Graphite Pop | `#0f1012` | VS Code Dark Modern structure with saturated pop accents |

| Light theme | Editor base | Color language |
|---|---|---|
| Elegant Snow | `#ffffff` | VS Code Light Modern structure; cool blue, cyan, indigo |
| Elegant Sakura | `#ffffff` | Rose, pink, plum, mint |
| Elegant Mint | `#ffffff` | Mint, teal, green, amber |
| Elegant Lavender | `#ffffff` | Violet, indigo, pink |
| Elegant Peach | `#ffffff` | Peach, coral, orange, teal |
| Elegant Sky | `#ffffff` | Sky blue, azure, cyan, orange |
| Elegant Lemon | `#ffffff` | Lemon, yellow-green, olive, blue |
| Elegant Coral Reef | `#ffffff` | Coral, turquoise, sand-gold |
| Elegant Candy Pop | `#ffffff` | One Light style saturated candy colors |
| Elegant Linen | `#fcf8f0` | Terracotta, olive, indigo |

## Layout

| Path | Role |
|---|---|
| `tools/palettes/<id>.json` | One palette per theme, the single source of colors; 24 files |
| `tools/generate.mjs` | Validates palettes, renders both platforms, rewrites the registration lists in `plugin.xml` and `vscode/package.json` |
| `resources/theme/<id>.theme.json` / `.theme.xml` | JetBrains files of the 20 new themes; generated, never hand-edited |
| `resources/theme/{elegant-dark,islands-dark,islands-light,ink-light}.theme.*` | The four original themes; hand-maintained |
| `vscode/themes/<id>.json` | VS Code files of all 24 themes; generated |
| `vscode/package.json` | VS Code extension manifest; `contributes.themes` is rewritten by the generator |
| `tools/build-jetbrains.sh` | Validates XML/JSON, compiles the single Java class with the IDE's bundled JBR `javac --release 17`, builds the jar and zip |
| `tools/build-vscode.sh` | Packages the vsix with `npx @vscode/vsce package` |
| `tools/build.sh` | Runs generation and both packaging steps |
| `dist/` | Release artifacts, committed with the repository |

## Palette schema

Each palette has the fields below. Colors are `#rrggbb`; alpha variants are derived by the generator.

| Field | Content |
|---|---|
| `id`, `name`, `type`, `description` | File stem, display name, `dark` or `light`, one-line description |
| `bg` | `editor`, `panel`, `main`, `surface`, `hover`, `selection`, `lineHighlight`, `border` |
| `fg` | `text`, `muted`, `comment`, `lineNumber`, `onAccent` |
| `accent`, `accent2` | Primary accent (buttons, focus, selected-tab outline) and secondary accent |
| `syntax` | 23 roles: `keyword`, `control`, `storage`, `type`, `class`, `function`, `variable`, `parameter`, `property`, `constant`, `number`, `string`, `escape`, `regex`, `operator`, `punctuation`, `tag`, `attribute`, `decorator`, `namespace`, `label`, `docTag`, `macro` |
| `status` | `error`, `warning`, `info`, `success`, `hint` |
| `diff` | `added`, `removed`, `modified` |
| `ansi` | The 16 terminal colors |
| `jetbrains` | Optional; `false` renders the VS Code file only |

## Rendering rules

**VS Code.** Each theme emits about 570 workbench color keys, 36 `tokenColors` groups and 26 `semanticTokenColors`. `tokenColors` come from a fixed role-to-TextMate-scope map (for example `control` covers `keyword.control` and `keyword.operator.new`; `namespace` covers `entity.name.namespace` and `storage.modifier.import`). Comments are italic, `invalid` uses `status.error`, Markdown headings use `accent` in bold. Side bar, activity bar, status bar, tab strip and panels use `bg.panel`; the editor and the active tab use `bg.editor`.

**JetBrains `.theme.json`.** Inherits `Islands Dark` / `Islands Light`; the `colors` block keeps the palette names and `ui` references names only. Key mappings: `Island.borderColor`, `ToolWindow.background`, `ToolWindow.Header.*`, `Panel`, `SidePanel`, `Content`, `Table` use `panel`; `MainWindow.background` uses `main`; `EditorTabs.underlinedBorderColor` uses `accent` and the selected-tab chip is `tabActive`, a blend of `selection` and `editor`; tree, list, menu and completion selection use `selection`, inactive selection uses `hover`; the default button is `accent` with `onAccent` text; scroll bars are `fg.muted` at `40` / `66` alpha. The `Island` group keeps the repository's existing values: `borderWidth` 6 / 5, `arc` 24 / 20.

**JetBrains `.theme.xml`.** `parent_scheme` is `Darcula` (dark) or `Default` (light; the 2025.3+ platform has no scheme named `Light`, matching the hand-maintained `ink-light` and `islands-light`). The key set is the union of `ink-light.theme.xml` and `elegant-dark.theme.xml` plus a must-have list — about 66 `colors` and 278 `attributes` per scheme — covering the platform defaults and the language keys for Go, Rust, Python, JS/TS, Kotlin, Dart, PHP, YAML, JSON, Markdown, CSS, HTML, XML, Shell and SQL. Keys are assigned to roles by name suffix (`*KEYWORD*` → `keyword`; `*INSTANCE_FIELD*`, `*PROPERTY*` → `property`; `*BRACES*`, `*COMMA*` → `punctuation`; and so on). `DEFAULT_IDENTIFIER` uses the body text color, comments are italic, diff backgrounds are pre-blended onto the editor base at about 22%, and the 16 console colors come from `ansi`. Keys that cannot be classified are listed at the end of the run; the list is currently empty.

## Handling of the original themes

- `elegant-dark.theme.json` gains `parentTheme: "Islands Dark"`, the `Island` group (`borderColor` = `editor`), `ToolWindow.background` and `Header.*` set to `editor`, `MainWindow.background` = `dark`, transparent `StatusBar.borderColor` and `MainToolbar.borderColor`, the two Islands tab keys `EditorTabs.underlinedBorderColor` and `inactiveUnderlinedTabBorderColor`, and a `transparent` color name. No existing color value in its palette changed.
- Each of the four original themes has a palette flagged `"jetbrains": false`, with values extracted from the existing XML/JSON; keys inherited from Darcula / Light take the platform defaults. These palettes are exempt from lint and are used only to render the VS Code files.
- The pre-existing `"Label.infoForeground": "gra3"` in `elegant-dark.theme.json` is a dangling reference and is left as is: changing it to `gray3` would turn info text into a dark gray close to the background.

## Hard constraints and maintenance notes

- **Change colors only in palettes.** The 20 new themes under `resources/theme/` and everything under `vscode/themes/` are generated; manual edits are overwritten by the next `node tools/generate.mjs`. After editing a palette, re-run the generator and both build scripts, and commit the `dist/` artifacts together with the sources.
- **Lint thresholds are the design floor**: chroma of syntax roles and body text at least `0x14`; contrast of syntax roles at least 4.5:1, body text 7:1, comments and secondary text 3:1, line numbers 1.8:1; dark editor luminance at most 0.012, light editor luminance at least 0.9. Yellows in light themes must be deep mustard or olive tones (for example Lemon's keyword `#7a6400`); a true lemon yellow cannot reach 4.5:1 on white.
- **The four original themes do not go through the generator on the JetBrains side.** They are lint-exempt and their palettes serve only the VS Code ports. To bring them into the generated flow, first adjust their values to pass lint, then remove `"jetbrains": false`.
- **The `.theme.xml` key set depends on `ink-light.theme.xml` and `elegant-dark.theme.xml`.** Adding or removing keys in those two files changes the key set of all 20 generated schemes; after adding language keys, re-run the generator and check the "NEEDS MAPPING" list at the end of the run, adding role rules for new suffixes.
- **Only the marked section of `plugin.xml` is rewritten.** The generator replaces what lies between `<!-- generated-themes:start -->` and `<!-- generated-themes:end -->`; the four original registrations stay outside the markers. `contributes.themes` in `vscode/package.json` is rewritten as a whole, ordered dark first, then light, alphabetical by display name within each group.
- **`since-build` must not drop below 253.** Every theme inherits an Islands parent theme, which does not exist in IDEs before 2025.3.
- **The version lives in two places**: `<version>` in `plugin.xml` and `version` in `vscode/package.json`; bump both at release time. Each build script reads its own file to name the artifact.
- **Build environment**: `tools/build-jetbrains.sh` defaults to `IDE_HOME=/Applications/GoLand.app/Contents` and prefers the IDE's bundled JBR `javac` (the system JDK 21 cannot read the Java 25 class files in the 2026.2 platform jars), always compiling with `--release 17`. On another machine, point `IDE_HOME` at any 2025.3+ JetBrains IDE.

## Release conventions

- `plugin.xml`: `<version>` 2.1.1 → 3.0.0, `since-build` 223 → 253; the first `<p>` of `<change-notes>` is the update-notification body and contains no `<a>` links.
- The notification's "Full release notes" button opens `_docs/release-3.0.0.en.md`; the URL template now points at this repository, and the file must be on `main` when the version ships.
- Clients with 2.1.1 installed on IDEs older than 2025.3 will not be offered 3.0.0 because of the `since-build` bump; this is an accepted trade-off.
