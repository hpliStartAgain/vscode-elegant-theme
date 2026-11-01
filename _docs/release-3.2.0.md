# 3.2.0 发布文档 — Elegant Firefox Dark / Elegant Firefox Light

## 本版本改动总览

3.2.0 新增一对基于 Firefox DevTools 配色的主题，主题总数从 26 套增至 28 套（14 深 + 14 浅）。生成器、键集、Islands 结构和构建脚本均未改动。

1. **新增调色板** `tools/palettes/firefox-dark.json`、`tools/palettes/firefox-light.json`，由 `node tools/generate.mjs` 生成 JetBrains 的 `resources/theme/firefox-{dark,light}.theme.{json,xml}` 与 VS Code 的 `vscode/themes/firefox-{dark,light}.json`。
2. **注册**：生成器在 `plugin.xml` 的 `generated-themes` 区段内追加两组 `themeProvider` + `colorScheme`（`elegant-firefox-dark` / `ElegantFirefoxDark`、`elegant-firefox-light` / `ElegantFirefoxLight`），并在 `vscode/package.json` 的 `contributes.themes` 中追加两项。
3. **版本**：`plugin.xml` 的 `<version>` 与 `vscode/package.json` 的 `version` 均为 3.2.0；`since-build` 维持 253。
4. **制品**：`dist/elegant-theme-3.2.0.zip`、`dist/elegant-theme-3.2.0.vsix`。旧版本制品保留在 `dist/` 中。

## 取色来源

来源为 [eronh/firefox-theme-vscode](https://github.com/eronh/firefox-theme-vscode)（MIT License，`package.json` 版本 4.10.8）的 `themes/dark.json` 与 `themes/light.json`。本版只借用其色彩语言，不复制该仓库的主题文件；所有 UI 键和 JetBrains 文件由本仓库生成器按调色板渲染。

原主题与本仓库基调有四处冲突，处理如下：

| 冲突 | 原主题 | 本版处理 |
|---|---|---|
| 深色底不够黑 | Dark 编辑器底 `#2A2A2E`，相对亮度 0.0235 | 改用原主题标签栏与状态栏的 `#0C0C0D`（Photon grey-90），相对亮度 0.0037 |
| 正文为中性灰 | Dark `#B1B1B3`、Light `#4A4A4F`，色度低于 `0x14` | Dark `#cfd3ec`、Light `#3a3852`，均为偏蓝紫的灰 |
| 代码 token 无色或同色 | Light 的通用 `string` 作用域为正文灰 `#4A4A4F`（仅引号字符串单独为 `#003EAA`）；Dark 字符串、数字、正则共用 `#6B89FF`；Dark 函数名与属性共用 `#86DE74` | 拆分为独立角色，见下表 |
| Light 对比度贴线 | `#DD00A9` 4.52:1、`#0074E8` 4.50:1、`#058B00` 4.47:1（对 `#FFFFFF`） | 同色相加深，保证 4.5:1 以上有余量 |

## 角色映射

| 角色 | Firefox Dark | 来源 | Firefox Light | 来源 |
|---|---|---|---|---|
| 关键字 | `#ff7de9` | 原 keyword | `#c5009a` | 原 `#DD00A9` 加深 |
| 存储修饰 | `#f59cff` | 原 storage 同族 | `#a3168f` | 新增，洋红族 |
| 控制流 | `#ff8fb1` | 新增 | `#d7264f` | 新增 |
| 类型 / 类 | `#b98eff` / `#cfa8ff` | 原 class name | `#0062c4` / `#5b3fd4` | 原 `#0074E8` 加深 / 新增 |
| 函数 | `#86de74` | 原 `entity.name.function` | `#8000d7` | 原 function |
| 变量 / 参数 | `#75bfff` / `#a3d4ff` | 原 variable | `#00799e` / `#a8457a` | 新增 |
| 属性 | `#4fe0e8` | 新增（原与函数同色） | `#057a00` | 原 `#058B00` 加深 |
| 字符串 | `#6b89ff` | 原 string | `#003eaa` | 原引号字符串色，推广到全部字符串 |
| 数字 | `#ff9f5c` | 新增（原与字符串同色） | `#b35900` | 新增 |
| 常量 | `#ffffb4` | 原 user-defined constant | `#c4440a` | 新增 |
| 标签 / 属性名 | `#6fc3ff` / `#ffa3ef` | 原 tag / attribute 同族 | `#8000d7` / `#b8007a` | 原 tag / attribute 同族 |

UI 沿用原主题的标志色：强调色 Photon blue（Dark `#0a84ff`，Light 改用 blue-60 `#0060df`，因为 `#0A84FF` 对白字只有 3.65:1），选中底 Dark `#204e8a`、Light `#b9d7fd`，Light 工具窗 `#f9f9fa`。

## 设计取值

| 项 | Firefox Dark | Firefox Light |
|---|---|---|
| 编辑器底 `bg.editor` | `#0c0c0d`，相对亮度 0.0037 | `#ffffff`，相对亮度 1.0000 |
| 正文 `fg.text` | `#cfd3ec`，13.20:1 | `#3a3852`，11.25:1 |
| 注释 `fg.comment` | `#8f8ca6`，6.02:1 | `#8a8798`，3.50:1 |
| 语法色对比度区间 | 6.19:1（string）至 18.82:1（constant） | 4.71:1（escape）至 9.25:1（string） |
| 强调色对 `onAccent` | `#0a84ff` / `#0c0c0d`，5.36:1 | `#0060df` / `#ffffff`，5.62:1 |

## 硬约束

- **Firefox Dark 的字符串保持 `#6b89ff`**。这是原主题辨识度最高的颜色；它是全套语法色中对比度最低的一项（6.19:1），调亮会偏向变量的 `#75bfff`。
- **数字与属性不得并回原主题的共享色**。原主题中数字与字符串同色、属性与函数同色，违反本仓库「每类代码元素有独立颜色」的约束。
- 其余约束与 3.0.0 相同，见 `_docs/release-3.0.0.md` 的「硬约束与维护须知」。

## 发布约定

- `<change-notes>` 第一个 `<p>` 是更新通知正文，不含 `<a>` 链接；通知按钮指向 `_docs/release-3.2.0.en.md`，发版时该文件已在 main 上。
- 无源码改动。
