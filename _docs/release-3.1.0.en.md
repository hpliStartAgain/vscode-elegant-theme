# 3.1.0 Release Notes — Elegant Claude Dark / Elegant Claude Light

## What changed in this release

3.1.0 adds a pair of themes built on Anthropic's Claude brand colors, taking the collection from 24 to 26 themes (13 dark + 13 light). The generator, key inventory, Islands structure and build scripts are unchanged.

1. **New palettes** `tools/palettes/claude-dark.json` and `tools/palettes/claude-light.json`. `node tools/generate.mjs` renders the JetBrains files `resources/theme/claude-{dark,light}.theme.{json,xml}` and the VS Code files `vscode/themes/claude-{dark,light}.json`.
2. **Registration**: the generator appends two `themeProvider` + `colorScheme` pairs inside the `generated-themes` block of `plugin.xml` (`elegant-claude-dark` / `ElegantClaudeDark`, `elegant-claude-light` / `ElegantClaudeLight`) and two entries to `contributes.themes` in `vscode/package.json`.
3. **Version**: `<version>` in `plugin.xml` and `version` in `vscode/package.json` are both 3.1.0; `since-build` stays at 253.
4. **Artifacts**: `dist/elegant-theme-3.1.0.zip` and `dist/elegant-theme-3.1.0.vsix`. The two 3.0.0 artifacts remain in `dist/`.

## Color source

Brand colors come from Anthropic's official brand guidelines (`skills/brand-guidelines/SKILL.md` in the `anthropics/skills` repository):

| Name | Value | Use in these themes |
|---|---|---|
| Dark | `#141413` | Claude Dark editor background and `onAccent` |
| Light | `#faf9f5` | Claude Light editor background |
| Mid Gray | `#b0aea5` | Claude Dark secondary text `fg.muted` |
| Light Gray | `#e8e6dc` | Claude Light main window `bg.main`, ANSI bright white |
| Orange | `#d97757` | Claude Dark `accent` and `syntax.tag` |
| Blue | `#6a9bcc` | Claude Dark `accent2`, `status.info`, diff modified; Claude Light ANSI bright blue |
| Green | `#788c5d` | Claude Light ANSI bright green |

The brand has only three accent colors, which is not enough for 23 syntax roles. The remaining roles extend within those three hue families (clay, terracotta, kraft, oat) and add cactus teal, fig, lavender and periwinkle as counterpoints, so each theme stays multi-colored and adjacent roles remain distinguishable. These additional colors are design choices for these themes, not official brand colors.

## Design values

| Item | Claude Dark | Claude Light |
|---|---|---|
| Editor `bg.editor` | `#141413`, relative luminance 0.0070 | `#faf9f5`, relative luminance 0.9467 |
| Tool window / main window `bg.panel` / `bg.main` | `#1a1918` / `#1f1e1d` | `#f0eee6` / `#e8e6dc` |
| Selection `bg.selection` | `#4a2e24` (dark clay) | `#f2d9cc` (light clay) |
| Body text `fg.text` | `#e5d9c6` warm ivory, 13.23:1 | `#3a2c22` dark brown, 12.75:1 |
| Comment `fg.comment` | `#87867f`, 5.04:1 | `#8c8273`, 3.59:1 |
| Syntax contrast range | 5.90:1 (tag) to 11.26:1 (class) | 4.65:1 (docTag) to 7.06:1 (class) |
| `accent` | `#d97757` | `#c6613f` (deeper brand orange, 4.05:1 against white text) |

Role assignment follows the collection's semantic conventions: keywords in clay orange, control flow in coral red, types and classes in kraft and oat gold, functions in sky blue, strings in olive green, properties in cactus teal, variables in peach clay, parameters in fig pink, storage modifiers and namespaces in lavender and periwinkle.

## Hard constraints

- **Claude Light is the third warm-white light theme**, alongside Ink Light (rice paper) and Linen (`#fcf8f0`). Its base `#faf9f5` is the brand's signature color and is not replaced with pure white.
- **Body text does not use the raw brand Dark / Light values.** `#141413` and `#faf9f5` have chroma `0x01` and `0x05`, below the lint minimum of `0x14`; body text uses `#3a2c22` and `#e5d9c6` from the same hue family.
- **Claude Light's tag color is not the brand orange.** `#d97757` and `#c15f3c` reach only 2.96:1 and 4.01:1 against `#faf9f5`, below 4.5:1; `syntax.tag` is `#a8482a`, and `accent` is `#c6613f` (used for buttons and accent UI only, never for code tokens).
- All other constraints are the same as in 3.0.0; see "Hard constraints and maintenance notes" in `_docs/release-3.0.0.en.md`.

## Release conventions

- The first `<p>` of `<change-notes>` is the update-notification body and contains no `<a>` link; the notification button points at `_docs/release-3.1.0.en.md`, which is on main at release time.
- No source code changes.
