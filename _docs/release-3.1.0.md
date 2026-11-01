# 3.1.0 发布文档 — Elegant Claude Dark / Elegant Claude Light

## 本版本改动总览

3.1.0 新增一对以 Anthropic Claude 品牌色为基调的主题，主题总数从 24 套增至 26 套（13 深 + 13 浅）。生成器、键集、Islands 结构和构建脚本均未改动。

1. **新增调色板** `tools/palettes/claude-dark.json`、`tools/palettes/claude-light.json`，由 `node tools/generate.mjs` 生成 JetBrains 的 `resources/theme/claude-{dark,light}.theme.{json,xml}` 与 VS Code 的 `vscode/themes/claude-{dark,light}.json`。
2. **注册**：生成器在 `plugin.xml` 的 `generated-themes` 区段内追加两组 `themeProvider` + `colorScheme`（`elegant-claude-dark` / `ElegantClaudeDark`、`elegant-claude-light` / `ElegantClaudeLight`），并在 `vscode/package.json` 的 `contributes.themes` 中追加两项。
3. **版本**：`plugin.xml` 的 `<version>` 与 `vscode/package.json` 的 `version` 均为 3.1.0；`since-build` 维持 253。
4. **制品**：`dist/elegant-theme-3.1.0.zip`、`dist/elegant-theme-3.1.0.vsix`。3.0.0 的两个制品保留在 `dist/` 中。

## 取色来源

品牌色取自 Anthropic 官方 brand-guidelines（`anthropics/skills` 仓库 `skills/brand-guidelines/SKILL.md`）：

| 名称 | 色值 | 本主题中的用途 |
|---|---|---|
| Dark | `#141413` | Claude Dark 编辑器底色与 `onAccent` |
| Light | `#faf9f5` | Claude Light 编辑器底色 |
| Mid Gray | `#b0aea5` | Claude Dark 次级文字 `fg.muted` |
| Light Gray | `#e8e6dc` | Claude Light 主窗口底 `bg.main`、ANSI bright white |
| Orange | `#d97757` | Claude Dark 强调色 `accent` 与 `syntax.tag` |
| Blue | `#6a9bcc` | Claude Dark 次强调色 `accent2`、`status.info`、diff modified；Claude Light ANSI bright blue |
| Green | `#788c5d` | Claude Light ANSI bright green |

品牌色只有三个强调色，不足以覆盖 23 个语法角色。其余角色在三色的色相族内扩展（陶土、赤陶、牛皮纸、燕麦），并补入仙人掌青、无花果紫红、薰衣草、长春花蓝作为对比色，保证主题内多色且相邻角色可区分。补充色是本主题的设计取值，不属于官方品牌色。

## 设计取值

| 项 | Claude Dark | Claude Light |
|---|---|---|
| 编辑器底 `bg.editor` | `#141413`，相对亮度 0.0070 | `#faf9f5`，相对亮度 0.9467 |
| 工具窗 / 主窗口 `bg.panel` / `bg.main` | `#1a1918` / `#1f1e1d` | `#f0eee6` / `#e8e6dc` |
| 选中 `bg.selection` | `#4a2e24`（陶土暗调） | `#f2d9cc`（陶土浅调） |
| 正文 `fg.text` | `#e5d9c6` 暖象牙，13.23:1 | `#3a2c22` 深棕，12.75:1 |
| 注释 `fg.comment` | `#87867f`，5.04:1 | `#8c8273`，3.59:1 |
| 语法色对比度区间 | 5.90:1（tag）至 11.26:1（class） | 4.65:1（docTag）至 7.06:1（class） |
| 强调色 `accent` | `#d97757` | `#c6613f`（品牌橙的加深变体，对白字 4.05:1） |

角色分配沿用全系列的语义约定：关键字为陶土橙，控制流为珊瑚红，类型与类为牛皮纸与燕麦金，函数为天蓝，字符串为橄榄绿，属性为仙人掌青，变量为蜜桃陶土，参数为无花果粉，存储修饰与命名空间为薰衣草与长春花蓝。

## 硬约束

- **Claude Light 是第三套暖白底浅色主题**。与 Ink Light（宣纸底）、Linen（`#fcf8f0`）并列；底色 `#faf9f5` 是品牌标志色，不改为纯白。
- **正文不使用品牌 Dark / Light 原值**。`#141413` 与 `#faf9f5` 的色度分别为 `0x01` 与 `0x05`，低于 lint 要求的 `0x14`；正文改用同色相族的 `#3a2c22` 与 `#e5d9c6`。
- **Claude Light 的标签色不使用品牌橙**。`#d97757` 与 `#c15f3c` 对 `#faf9f5` 分别为 2.96:1 与 4.01:1，不满足 4.5:1；`syntax.tag` 取 `#a8482a`，`accent` 取 `#c6613f`（仅用于按钮与强调 UI，不用于代码 token）。
- 其余约束与 3.0.0 相同，见 `_docs/release-3.0.0.md` 的「硬约束与维护须知」。

## 发布约定

- `<change-notes>` 第一个 `<p>` 是更新通知正文，不含 `<a>` 链接；通知按钮指向 `_docs/release-3.1.0.en.md`，发版时该文件已在 main 上。
- 无源码改动。
