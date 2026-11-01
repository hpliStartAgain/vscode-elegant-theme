# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A theme collection ("Elegant Theme Collection", 28 themes: 14 dark + 14 light) shipped two ways from one palette source: an IntelliJ Platform UI theme plugin for JetBrains IDEs and a VS Code color-theme extension. The JetBrains plugin is almost entirely resources (theme JSON + editor color scheme XML) packaged into a jar; the only source code is a single Java class under `src` that shows a one-time release-highlights notification after the plugin is installed or updated.

## Building

No Gradle. Since 3.0.0 the build is script-driven (Node 22+, a local JetBrains IDE for the platform classpath):

- `node tools/generate.mjs` — validates every palette in `tools/palettes/`, lints colors (chroma ≥ 0x14 and WCAG 4.5:1 for syntax roles, 7:1 for text, 3:1 for comments/muted, 1.8:1 for line numbers; dark editor luminance ≤ 0.012, light ≥ 0.9), then renders `vscode/themes/*.json` for all palettes and `resources/theme/<id>.theme.json` + `.theme.xml` for palettes without `"jetbrains": false`. It also rewrites the registration block between `<!-- generated-themes:start/end -->` in `plugin.xml` and `contributes.themes` in `vscode/package.json`. A non-empty "NEEDS MAPPING" list at the end means a scheme key has no role rule yet.
- `tools/build-jetbrains.sh` → `dist/elegant-theme-<version>.zip` (`elegant-theme/lib/elegant-theme.jar`). Uses `IDE_HOME` (default `/Applications/GoLand.app/Contents`) for the classpath and prefers the IDE's bundled JBR `javac`, compiling `--release 17`.
- `tools/build-vscode.sh` → `dist/elegant-theme-<version>.vsix` via `npx @vscode/vsce package`.
- `tools/build.sh` runs all three. `dist/` artifacts are **committed**; `build/`, `out`, `*.jar` are gitignored.
- The IDEA DevKit module (`elegant-theme.iml`) still works for IDE-side builds/sandbox runs. `since-build` is **253**: every theme inherits an Islands parent theme, which exists only in 2025.3+.

## Architecture

Everything the plugin ships lives in `resources`:

- `resources/META-INF/plugin.xml` — plugin descriptor. Each theme is registered as a **pair** of extensions: a `themeProvider` (UI theme, `.theme.json`) and a matching `colorScheme` (editor scheme, `.theme.xml`). The plugin version lives in the `<version>` tag here (nowhere else).
- `resources/theme/*.theme.json` — UI themes. Each defines a named color palette under `colors` and maps IntelliJ UI keys under `ui` (keys can reference palette names). Each points to its editor scheme via `editorScheme`.
- `resources/theme/*.theme.xml` — editor color schemes (`parent_scheme` is `Darcula` for dark, `Default` for light — the 2025.3+ platform has no scheme named `Light`).
- `src/com/github/yx208/eleganttheme/UpdateNotificationActivity.java` — the plugin's only class, registered in `plugin.xml` as a `notificationGroup` ("Elegant Theme Updates") plus a `postStartupActivity`. After an install/update it shows a sticky notification once per version (last-notified version stored app-wide via `PropertiesComponent`). The notification body is the first `<p>` of `<change-notes>`; its "Full release notes" button opens `_docs/release-<version>.en.md` on GitHub (URL derived from the plugin version). Only APIs present in both 2022.3 and current platforms may be used here — see the compatibility notes in the class javadoc.

Theme sources:

- `tools/palettes/<id>.json` — one semantic palette per theme (`bg`, `fg`, `accent`, 23 `syntax` roles, `status`, `diff`, 16 `ansi`); the single source of colors for both platforms. Schema and role→key mappings are documented in `_docs/release-3.0.0.md`.
- The four original themes — Elegant Dark, Elegant Islands Dark, Elegant Islands Light, Elegant Ink Light — keep **hand-written** JetBrains files (`elegant-dark`, `islands-dark`, `islands-light`, `ink-light`) and are registered outside the generated markers in `plugin.xml`. Their palettes are flagged `"jetbrains": false`, so the generator only renders their VS Code ports; they are lint-exempt.
- The other 24 themes' JetBrains files and **all** files under `vscode/themes/` are generated — edit the palette, not the output.
- `vscode/` — the VS Code extension (`elegant-theme-collection`, publisher `hpliStartAgain`); `package.json` carries its own `version`, keep it equal to `plugin.xml`'s.

All JetBrains themes set `parentTheme` to Islands Dark / Islands Light (rounded island layout). `color-schema.json` at the repo root is a reference palette document, not consumed by the plugin.

## Conventions

- Releases: bump `<version>` in `plugin.xml` **and** `version` in `vscode/package.json`, update `<change-notes>` with a short summary, run `tools/build.sh`, and commit the regenerated `dist/` artifacts. Keep the release headline in the **first `<p>`** of `<change-notes>` — it is shown verbatim as the update-notification body — and keep `<a>` links out of that paragraph (they are not clickable there). The English release doc must be on `main` at release time because the notification links to it. There is no CHANGELOG (removed after 2.1.0) — the release record for each version is its doc pair under `_docs` (see below). Commit messages before 2.1.0 say "see CHANGELOG.md for details"; that file no longer exists.
- When changing a color, keep the palette-name indirection: for generated themes change `tools/palettes/<id>.json` and regenerate; for the four hand-written themes change the value in the theme JSON's `colors` block (or the scheme XML) rather than hardcoding hex values into individual `ui` keys.
- The generated `.theme.xml` key inventory is the union of the keys in `ink-light.theme.xml` and `elegant-dark.theme.xml` — adding or removing keys there changes all 24 generated schemes; regenerate and check the "NEEDS MAPPING" list afterwards.
- Release docs: every release gets a bilingual pair of documents — `_docs/release-<version>.md` (Chinese) plus `_docs/release-<version>.en.md` (English) — serving as that version's release record: what actually changed, design philosophy, final palette, hard constraints, and maintenance notes. Record only final decisions and constraints — no exploration history, rejected alternatives, or thought process. Keep the two in sync when either changes. Write these files with soft wrapping — one paragraph (or list item) per line, no manual line breaks; let the editor wrap. See `_docs/release-2.1.0.md` / `_docs/release-2.1.0.en.md` (Elegant Ink Light) for a full-featured example and `_docs/release-2.1.1.md` for a small colors-only patch. Docs for 2.1.0 and earlier were named `design-<version>`; the files were renamed in 2.1.1, so links from already-installed 2.1.0 clients now 404.
- Theme JSONs that set `parentTheme` may override the parent's semantic palette tokens in their `colors` block (e.g. `layer-2-bg`, `accent-brand-bg`). Such tokens are consumed by the parent theme's `ui` mappings at load time (`UIThemeBean.importFromParentTheme()` merges palettes, child wins), so the DevKit "unused color" inspection flags them falsely — do not delete them based on that inspection. See the maintenance guide in `_docs/release-2.1.0.md`.
