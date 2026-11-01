# 3.0.0 发布文档 — Elegant Theme Collection：20 套新主题、统一 Islands 圆角、VS Code 同步交付

## 本版本改动总览

3.0.0 把本仓库从「4 套 JetBrains 主题」扩展为「24 套主题、两个平台」：JetBrains 插件与 VS Code 扩展由同一组调色板生成，配色完全一致。

1. **新增 20 套主题**（10 深 + 10 浅），全部由 `tools/palettes/*.json` 经 `tools/generate.mjs` 生成，同时产出 JetBrains（`.theme.json` + `.theme.xml`）与 VS Code（`vscode/themes/*.json`）两端文件。
2. **原有 4 套主题颜色不变**：Elegant Dark、Elegant Islands Dark、Elegant Islands Light、Elegant Ink Light 的 JetBrains 文件继续手工维护；VS Code 端由生成器按各自调色板移植（见「原有主题的处理」）。
3. **JetBrains 全部主题统一 Islands 圆角**：Elegant Dark 增加 `parentTheme: "Islands Dark"` 与 `Island` 键组；新主题一律继承 Islands Dark / Islands Light。因此 `since-build` 由 223 提升到 253（2025.3）。
4. **新增 VS Code 扩展** `vscode/`（`elegant-theme-collection`，publisher `hpliStartAgain`），24 套主题同名收录。
5. **新增构建脚本**：`tools/build-jetbrains.sh`、`tools/build-vscode.sh`、`tools/build.sh`，产物 `dist/elegant-theme-3.0.0.zip` 与 `dist/elegant-theme-3.0.0.vsix` 随仓库提交。不引入 Gradle。
6. **删除未注册残稿** `elegant-light.theme.json` 与空的 `elegant-light.theme.icls`。
7. 更新通知的发行说明链接改指向本仓库 `hpliStartAgain/vscode-elegant-theme`。

## 设计理念

- **近黑与纯白打底**：深色主题编辑器底色在 `#0a0f17` 至 `#120f13` 之间，相对亮度不超过 0.012，并带有各自极淡的色相倾向（藏青、梅紫、墨绿、暖黑等）；浅色主题编辑器底色为 `#ffffff`，仅 Elegant Linen 使用极淡亚麻色 `#fcf8f0`。连同 Ink Light 的宣纸底，米黄系浅色主题共两套。
- **所有代码 token 都有颜色**：23 个语法角色与正文色一律要求色度（RGB 最大通道减最小通道）不低于 `0x14`，不允许白色或中性灰 token。标点、命名空间、文档标签等常被设为灰色的角色也带色相。
- **可读性有量化下限**：语法角色对编辑器底色的 WCAG 对比度不低于 4.5:1，正文不低于 7:1，注释与次级文字不低于 3:1，行号不低于 1.8:1。生成器在渲染前校验，任何一项不满足即中止。
- **一套主题一种色彩语言**：每套主题有自己的主导色族（见「主题清单」），同一角色在两个平台上使用同一色值；深色与浅色主题之间不搬运 hex。
- **Islands 结构统一**：工具窗口与岛边框同色（`Island.borderColor` = `ToolWindow.background`），主窗口底色在深色主题中比岛面亮一阶、在浅色主题中比岛面暗一阶，与 JetBrains 的 Islands 指南一致。

## 主题清单

| 深色主题 | 编辑器底 | 色彩语言 |
|---|---|---|
| Elegant Midnight | `#0e1116` | One Dark Pro 色系重构 |
| Elegant Aurora | `#0b1014` | 极光：薄荷、青、紫 |
| Elegant Sakura Night | `#120f13` | 樱粉、丁香、薄荷点缀 |
| Elegant Ocean Deep | `#0a0f17` | 蓝、青、水绿、珊瑚、沙金 |
| Elegant Neon Candy | `#0d0d12` | 糖果霓虹：洋红、电光蓝、青柠、柠黄 |
| Elegant Forest Night | `#0d110e` | 苔绿、琥珀、沙色、鼠尾草 |
| Elegant Sunset Ember | `#120e0e` | 橙、蜜桃、珊瑚、金、紫、海薄荷 |
| Elegant Lavender Dusk | `#0f0e15` | 薰衣草、长春花蓝、粉、薄荷 |
| Elegant Mint Noir | `#0b1210` | 薄荷、青、柠绿、淡黄、软蓝 |
| Elegant Graphite Pop | `#0f1012` | VS Code Dark Modern 结构加高饱和跳色 |

| 浅色主题 | 编辑器底 | 色彩语言 |
|---|---|---|
| Elegant Snow | `#ffffff` | VS Code Light Modern 结构，冷蓝、青、靛 |
| Elegant Sakura | `#ffffff` | 玫瑰、粉、梅紫、薄荷 |
| Elegant Mint | `#ffffff` | 薄荷、青、绿、琥珀 |
| Elegant Lavender | `#ffffff` | 紫罗兰、靛蓝、粉 |
| Elegant Peach | `#ffffff` | 蜜桃、珊瑚、橙、青 |
| Elegant Sky | `#ffffff` | 天蓝、湖蓝、青、橙 |
| Elegant Lemon | `#ffffff` | 柠黄、黄绿、橄榄、蓝 |
| Elegant Coral Reef | `#ffffff` | 珊瑚、绿松石、沙金 |
| Elegant Candy Pop | `#ffffff` | One Light 式高饱和糖果色 |
| Elegant Linen | `#fcf8f0` | 赤陶、橄榄、靛蓝 |

## 构成

| 路径 | 作用 |
|---|---|
| `tools/palettes/<id>.json` | 每套主题一份调色板，唯一取色来源；24 份 |
| `tools/generate.mjs` | 校验调色板，渲染两端主题文件，回写 `plugin.xml` 与 `vscode/package.json` 的注册列表 |
| `resources/theme/<id>.theme.json` / `.theme.xml` | 20 套新主题的 JetBrains 文件，生成产物，不手工编辑 |
| `resources/theme/{elegant-dark,islands-dark,islands-light,ink-light}.theme.*` | 原有 4 套主题，手工维护 |
| `vscode/themes/<id>.json` | 24 套主题的 VS Code 文件，生成产物 |
| `vscode/package.json` | VS Code 扩展清单，`contributes.themes` 由生成器回写 |
| `tools/build-jetbrains.sh` | 校验 XML/JSON 格式，用 IDE 自带 JBR 的 `javac --release 17` 编译唯一 Java 类，打 jar 并 zip |
| `tools/build-vscode.sh` | `npx @vscode/vsce package` 打 vsix |
| `tools/build.sh` | 依次执行生成与两端打包 |
| `dist/` | 发布产物，随仓库提交 |

## 调色板结构

每份调色板包含以下字段，颜色一律为 `#rrggbb`，alpha 变体由生成器派生：

| 字段 | 内容 |
|---|---|
| `id`、`name`、`type`、`description` | 文件名、显示名、`dark` 或 `light`、一句话描述 |
| `bg` | `editor`、`panel`、`main`、`surface`、`hover`、`selection`、`lineHighlight`、`border` |
| `fg` | `text`、`muted`、`comment`、`lineNumber`、`onAccent` |
| `accent`、`accent2` | 主强调色（按钮、焦点、选中 tab 描边）与次强调色 |
| `syntax` | 23 个语法角色：`keyword`、`control`、`storage`、`type`、`class`、`function`、`variable`、`parameter`、`property`、`constant`、`number`、`string`、`escape`、`regex`、`operator`、`punctuation`、`tag`、`attribute`、`decorator`、`namespace`、`label`、`docTag`、`macro` |
| `status` | `error`、`warning`、`info`、`success`、`hint` |
| `diff` | `added`、`removed`、`modified` |
| `ansi` | 终端 16 色 |
| `jetbrains` | 可选；为 `false` 时只渲染 VS Code 文件 |

## 渲染规则

**VS Code**：每套输出约 570 个 workbench 颜色键、36 组 `tokenColors` 与 26 个 `semanticTokenColors`。`tokenColors` 按语法角色到 TextMate scope 的固定映射生成（例如 `control` 对应 `keyword.control`、`keyword.operator.new`，`namespace` 对应 `entity.name.namespace`、`storage.modifier.import`），注释斜体，`invalid` 用 `status.error`，Markdown 标题用 `accent` 加粗。侧栏、活动栏、状态栏、tab 栏、面板统一为 `bg.panel`，编辑器与激活 tab 为 `bg.editor`。

**JetBrains `.theme.json`**：继承 `Islands Dark` / `Islands Light`，`colors` 块保留调色板命名，`ui` 只引用名称。关键映射：`Island.borderColor`、`ToolWindow.background`、`ToolWindow.Header.*`、`Panel`、`SidePanel`、`Content`、`Table` 为 `panel`；`MainWindow.background` 为 `main`；`EditorTabs.underlinedBorderColor` 为 `accent`，选中 tab 芯片为 `selection` 与 `editor` 的混合色 `tabActive`；树、列表、菜单、补全弹窗选中色为 `selection`，失焦选中为 `hover`；默认按钮为 `accent` 配 `onAccent`；滚动条为 `fg.muted` 的 `40` / `66` alpha 变体。`Island` 键组沿用仓库既有值：`borderWidth` 6 / 5，`arc` 24 / 20。

**JetBrains `.theme.xml`**：`parent_scheme` 为 `Darcula`（深色）或 `Default`（浅色；2025.3+ 平台没有名为 `Light` 的 scheme，与手工维护的 `ink-light`、`islands-light` 一致）。键集取 `ink-light.theme.xml` 与 `elegant-dark.theme.xml` 的并集再加必备键，每套约 66 个 `colors` 与 278 个 `attributes`，覆盖平台默认键及 Go、Rust、Python、JS/TS、Kotlin、Dart、PHP、YAML、JSON、Markdown、CSS、HTML、XML、Shell、SQL 的语言键。键名按后缀归入语法角色（`*KEYWORD*` → `keyword`，`*INSTANCE_FIELD*`、`*PROPERTY*` → `property`，`*BRACES*`、`*COMMA*` → `punctuation` 等），`DEFAULT_IDENTIFIER` 用正文色，注释斜体，diff 背景按约 22% 预混到编辑器底色，终端 16 色取 `ansi`。未能归类的键会在运行结束时列出，当前为空。

## 原有主题的处理

- Elegant Dark 的 `elegant-dark.theme.json` 新增 `parentTheme: "Islands Dark"`、`Island` 键组（`borderColor` 为 `editor`）、`ToolWindow.background` 与 `Header.*` 改为 `editor`、`MainWindow.background` 为 `dark`、`StatusBar.borderColor` 与 `MainToolbar.borderColor` 透明、`EditorTabs.underlinedBorderColor` 与 `inactiveUnderlinedTabBorderColor` 两个 Islands tab 键，并补入 `transparent` 色名。色板内的既有色值一个未改。
- 四套原有主题各有一份带 `"jetbrains": false` 的调色板，字段值从既有 XML/JSON 提取，继承自 Darcula / Light 的键取平台默认值。这四份调色板不参与 lint，只用于渲染 VS Code 文件。
- `elegant-dark.theme.json` 中既有的 `"Label.infoForeground": "gra3"` 是失效引用，保持不变：改成 `gray3` 会让信息文字变成接近底色的深灰。

## 硬约束与维护须知

- **颜色只改调色板**。`resources/theme/` 下 20 套新主题的文件与 `vscode/themes/` 下全部文件是生成产物，手改会在下次 `node tools/generate.mjs` 时被覆盖。改完调色板必须重新运行生成器并重新打包，`dist/` 中的产物与源码一起提交。
- **lint 阈值是设计底线**：语法角色与正文色度不低于 `0x14`，语法角色对比度不低于 4.5:1，正文不低于 7:1，注释与次级文字不低于 3:1，行号不低于 1.8:1，深色底相对亮度不高于 0.012，浅色底不低于 0.9。浅色主题的黄色系只能用芥末、橄榄一类深调（例如 Lemon 的关键字 `#7a6400`），纯柠黄在白底上无法达到 4.5:1。
- **原有 4 套主题的 JetBrains 文件不走生成器**。它们在 lint 中豁免，其调色板只服务 VS Code 移植；若要让它们也进入生成流程，必须先把色值调整到满足 lint，再删除 `"jetbrains": false`。
- **`.theme.xml` 的键集依赖 `ink-light.theme.xml` 与 `elegant-dark.theme.xml`**。在这两个文件中增删键会改变 20 套生成主题的键集；新增语言键后要重新生成并检查运行结束时的「NEEDS MAPPING」列表，为新后缀补充角色规则。
- **`plugin.xml` 的注册列表只改标记之间的部分**。`<!-- generated-themes:start -->` 与 `<!-- generated-themes:end -->` 之间由生成器回写，4 套原有主题的注册保持在标记之外。`vscode/package.json` 的 `contributes.themes` 整体由生成器回写，排序为深色在前、浅色在后，组内按显示名字母序。
- **`since-build` 不得低于 253**。全部主题继承 Islands 父主题，2025.3 以前的 IDE 没有该父主题。
- **版本号有两处**：`plugin.xml` 的 `<version>` 与 `vscode/package.json` 的 `version`，发版时同步修改；两个构建脚本各自从对应文件读取版本号命名产物。
- **构建环境**：`tools/build-jetbrains.sh` 默认 `IDE_HOME=/Applications/GoLand.app/Contents`，优先使用 IDE 自带 JBR 的 `javac`（系统 JDK 21 读不了 2026.2 平台 jar 的 Java 25 class 文件），始终以 `--release 17` 编译。换机器时通过 `IDE_HOME` 指向任意 2025.3+ 的 JetBrains IDE。

## 发布约定

- `plugin.xml`：`<version>` 2.1.1 → 3.0.0，`since-build` 223 → 253；`<change-notes>` 第一个 `<p>` 是更新通知正文，段内不放 `<a>` 链接。
- 通知的「Full release notes」按钮指向 `_docs/release-3.0.0.en.md`，URL 模板已改为本仓库地址，发版时该文件必须已在 `main` 上。
- 已安装 2.1.1 的客户端在 2025.3 以前的 IDE 上不会收到 3.0.0 更新（`since-build` 提升），这是明确接受的取舍。
