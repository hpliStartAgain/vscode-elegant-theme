# Elegant Theme Collection — JetBrains IDEs & VS Code

26 color themes (13 dark, 13 light) shipped as one JetBrains plugin and one VS Code extension, generated from a single set of palettes. Dark themes sit on a near-black base with a faint hue tint; light themes sit on pure white (three on a faint cream: linen, rice paper, and Claude's warm ivory). Every syntax token carries a color — no white or neutral tokens — and every token meets WCAG 4.5:1 against the editor background.

![elegant-theme example](https://raw.githubusercontent.com/hpliStartAgain/vscode-elegant-theme/main/examples/code.png)

## Themes

### Dark

| Theme | Base | Color language |
|---|---|---|
| Elegant Dark | `#1a1c1f` | The original Elegant dark theme, now on the Islands rounded layout |
| Elegant Islands Dark | `#1d1f21` | Refinements layered on JetBrains' Islands Dark |
| Elegant Midnight | navy near-black | One Dark Pro hues rebuilt on a near-black base |
| Elegant Aurora | blue-black | Northern lights: mint, cyan, violet |
| Elegant Sakura Night | plum near-black | Cherry-blossom pink, lilac, mint accents |
| Elegant Ocean Deep | deep-sea near-black | Blue, cyan, aqua, coral, sand-gold |
| Elegant Neon Candy | neutral near-black | Candy neon: magenta, electric blue, lime, lemon |
| Elegant Forest Night | green-black | Moss, amber, sand, sage |
| Elegant Sunset Ember | warm black | Orange, peach, coral, gold, violet, sea-mint |
| Elegant Lavender Dusk | violet-gray near-black | Lavender, periwinkle, pink, mint |
| Elegant Mint Noir | teal-black | Mint, teal, lime, soft yellow, soft blue |
| Elegant Graphite Pop | graphite black | VS Code Dark Modern structure with saturated pop accents |
| Elegant Claude Dark | `#141413` slate black | Anthropic Claude brand: clay orange, sky blue, olive, kraft, cactus, fig |

### Light

| Theme | Base | Color language |
|---|---|---|
| Elegant Islands Light | `#fefefe` | Refinements layered on JetBrains' Islands Light |
| Elegant Ink Light | rice-paper cream | Ink-wash (水墨) theme: ink-tone text and low-saturation traditional Chinese colors |
| Elegant Snow | pure white | VS Code Light Modern structure, cool blue, cyan, indigo |
| Elegant Sakura | pure white | Rose, pink, plum, mint |
| Elegant Mint | pure white | Mint, teal, green, amber |
| Elegant Lavender | pure white | Violet, purple, indigo, pink |
| Elegant Peach | pure white | Peach, coral, orange, teal |
| Elegant Sky | pure white | Sky blue, azure, cyan, orange |
| Elegant Lemon | pure white | Lemon, yellow-green, olive, blue |
| Elegant Coral Reef | pure white | Coral, turquoise, sand-gold |
| Elegant Candy Pop | pure white | One Light style saturated candy colors |
| Elegant Linen | linen cream | Terracotta, olive, indigo |
| Elegant Claude Light | `#faf9f5` warm ivory | Anthropic Claude brand: deep clay, sky blue, olive, kraft, cactus, fig |

## Install

Prebuilt artifacts are committed under `dist/`:

- **JetBrains IDEs (2025.3+)**: `dist/elegant-theme-<version>.zip` — Settings → Plugins → ⚙ → Install Plugin from Disk. Then Settings → Appearance & Behavior → Appearance → Theme, and pick the matching Editor color scheme under Settings → Editor → Color Scheme if the editor does not follow automatically.
- **VS Code**: `dist/elegant-theme-<version>.vsix` — Extensions view → ⋯ → Install from VSIX, then Preferences → Color Theme.

All JetBrains themes inherit from the official Islands Dark / Islands Light themes (rounded island layout), so the plugin requires build 253 (2025.3) or newer.

## Build from source

Requirements: Node.js 22+, JDK 17+, and a local JetBrains IDE installation for the platform classpath (defaults to `/Applications/GoLand.app/Contents`, override with `IDE_HOME`).

```sh
node tools/generate.mjs        # palettes -> VS Code themes + JetBrains theme JSON/XML + registrations
tools/build-jetbrains.sh       # -> dist/elegant-theme-<version>.zip
tools/build-vscode.sh          # -> dist/elegant-theme-<version>.vsix
tools/build.sh                 # all of the above
```

Palettes live in `tools/palettes/*.json`; one file per theme. The four original themes (Elegant Dark, Elegant Islands Dark, Elegant Islands Light, Elegant Ink Light) keep their hand-written JetBrains files and are marked `"jetbrains": false` — the generator only renders their VS Code ports.

## Reference

- [IntelliJ Platform UI Guidelines](https://plugins.jetbrains.com/docs/intellij/ui-guidelines-welcome.html)
- [Supporting Islands Theme](https://plugins.jetbrains.com/docs/intellij/supporting-islands-theme.html)
- [VS Code Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)

## Feedback

If you have an idea or find a bug, open an issue.
