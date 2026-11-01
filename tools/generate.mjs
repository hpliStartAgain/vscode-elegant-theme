#!/usr/bin/env node
// Palette-driven theme generator for Elegant Theme Collection.
// Reads tools/palettes/*.json, lints colors, then renders:
//   - vscode/themes/<id>.json              (every palette)
//   - resources/theme/<id>.theme.json/.xml (palettes without "jetbrains": false)
//   - registration lists in resources/META-INF/plugin.xml and vscode/package.json
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PALETTES_DIR = join(ROOT, 'tools', 'palettes');
const VSCODE_THEMES_DIR = join(ROOT, 'vscode', 'themes');
const JB_THEME_DIR = join(ROOT, 'resources', 'theme');
const PLUGIN_XML = join(ROOT, 'resources', 'META-INF', 'plugin.xml');
const VSCODE_PKG = join(ROOT, 'vscode', 'package.json');

// ---------- color utils ----------
const hex = s => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 0xff, n & 0xff];
};
const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const withAlpha = (color, a) => {
  const [r, g, b] = hex(color);
  return toHex([r, g, b]) + Math.round(a * 255).toString(16).padStart(2, '0');
};
const blend = (fg, bg, t) => {
  const f = hex(fg), b = hex(bg);
  return toHex(f.map((c, i) => c * t + b[i] * (1 - t)));
};
const relLuminance = color => {
  const f = v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hex(color);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (c1, c2) => {
  const l1 = relLuminance(c1), l2 = relLuminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const chroma = color => {
  const [r, g, b] = hex(color);
  return Math.max(r, g, b) - Math.min(r, g, b);
};

// ---------- load + validate ----------
const BG_KEYS = ['editor', 'panel', 'main', 'surface', 'hover', 'selection', 'lineHighlight', 'border'];
const FG_KEYS = ['text', 'muted', 'comment', 'lineNumber', 'onAccent'];
const SYNTAX_KEYS = ['keyword', 'control', 'storage', 'type', 'class', 'function', 'variable', 'parameter',
  'property', 'constant', 'number', 'string', 'escape', 'regex', 'operator', 'punctuation', 'tag',
  'attribute', 'decorator', 'namespace', 'label', 'docTag', 'macro'];
const STATUS_KEYS = ['error', 'warning', 'info', 'success', 'hint'];
const DIFF_KEYS = ['added', 'removed', 'modified'];
const ANSI_KEYS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta',
  'brightCyan', 'brightWhite'];

const files = readdirSync(PALETTES_DIR).filter(f => f.endsWith('.json')).sort();
if (files.length === 0) fail('No palettes found in ' + PALETTES_DIR);
const palettes = files.map(f => JSON.parse(readFileSync(join(PALETTES_DIR, f), 'utf8')));

const errors = [];
for (const p of palettes) {
  const need = [['id'], ['name'], ['type'], ['description'], ['accent'], ['accent2']];
  for (const [k] of need) if (typeof p[k] !== 'string') errors.push(`${p.id}: missing "${k}"`);
  if (!['dark', 'light'].includes(p.type)) errors.push(`${p.id}: type must be "dark"|"light"`);
  for (const [group, keys] of [['bg', BG_KEYS], ['fg', FG_KEYS], ['syntax', SYNTAX_KEYS],
    ['status', STATUS_KEYS], ['diff', DIFF_KEYS], ['ansi', ANSI_KEYS]]) {
    if (typeof p[group] !== 'object' || p[group] === null) { errors.push(`${p.id}: missing "${group}"`); continue; }
    for (const k of keys) {
      const v = p[group][k];
      if (typeof v !== 'string') { errors.push(`${p.id}: missing "${group}.${k}"`); continue; }
      if (!hex(v)) errors.push(`${p.id}: ${group}.${k} "${v}" is not #rrggbb`);
    }
  }
  for (const k of ['accent', 'accent2']) if (p[k] && !hex(p[k])) errors.push(`${p.id}: ${k} "${p[k]}" is not #rrggbb`);
}
if (errors.length) fail('Palette validation failed:\n' + errors.map(e => '  - ' + e).join('\n'));

// ---------- lint ----------
const lintRows = [];   // violations
const infoRows = [];   // measured values for exempt (jetbrains:false) palettes
for (const p of palettes) {
  const exempt = p.jetbrains === false;
  const check = (field, value, rule, measured, ok) => {
    if (ok) return;
    (exempt ? infoRows : lintRows).push({ palette: p.id, field, value, rule, measured });
  };
  for (const k of SYNTAX_KEYS) {
    const v = p.syntax[k];
    check(`syntax.${k}`, v, 'chroma>=0x14', '0x' + chroma(v).toString(16), chroma(v) >= 0x14);
    check(`syntax.${k}`, v, 'contrast>=4.5', contrast(v, p.bg.editor).toFixed(2), contrast(v, p.bg.editor) >= 4.5);
    check(`syntax.${k}`, v, '!=fg.text', '', v.toLowerCase() !== p.fg.text.toLowerCase());
  }
  check('fg.text', p.fg.text, 'chroma>=0x14', '0x' + chroma(p.fg.text).toString(16), chroma(p.fg.text) >= 0x14);
  check('fg.text', p.fg.text, 'contrast>=7', contrast(p.fg.text, p.bg.editor).toFixed(2), contrast(p.fg.text, p.bg.editor) >= 7);
  check('fg.comment', p.fg.comment, 'contrast>=3', contrast(p.fg.comment, p.bg.editor).toFixed(2), contrast(p.fg.comment, p.bg.editor) >= 3);
  check('fg.muted', p.fg.muted, 'contrast>=3', contrast(p.fg.muted, p.bg.editor).toFixed(2), contrast(p.fg.muted, p.bg.editor) >= 3);
  check('fg.lineNumber', p.fg.lineNumber, 'contrast>=1.8', contrast(p.fg.lineNumber, p.bg.editor).toFixed(2), contrast(p.fg.lineNumber, p.bg.editor) >= 1.8);
  const lum = relLuminance(p.bg.editor);
  if (p.type === 'dark') check('bg.editor', p.bg.editor, 'luminance<=0.012', lum.toFixed(4), lum <= 0.012);
  else check('bg.editor', p.bg.editor, 'luminance>=0.9', lum.toFixed(4), lum >= 0.9);
}
if (lintRows.length) {
  console.log('LINT VIOLATIONS');
  printTable(['palette', 'field', 'value', 'rule', 'measured'], lintRows);
  process.exit(1);
}
if (infoRows.length) {
  console.log('LINT INFO (jetbrains:false palettes — measured but exempt)');
  printTable(['palette', 'field', 'value', 'rule', 'measured'], infoRows);
}

function printTable(cols, rows) {
  const w = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c]).length)));
  const line = cols.map((c, i) => c.padEnd(w[i])).join('  ');
  console.log('  ' + line + '\n  ' + w.map(x => '-'.repeat(x)).join('  '));
  for (const r of rows) console.log('  ' + cols.map((c, i) => String(r[c]).padEnd(w[i])).join('  '));
}

// ---------- VS Code theme ----------
function vscodeTheme(p) {
  const b = p.bg, f = p.fg, s = p.syntax, st = p.status, d = p.diff, a = p.ansi;
  const acc = p.accent;
  const colors = {
    'focusBorder': acc,
    'foreground': f.text,
    'disabledForeground': f.lineNumber,
    'widget.shadow': '#00000060',
    'selection.background': b.selection,
    'descriptionForeground': f.muted,
    'errorForeground': st.error,
    'icon.foreground': f.muted,
    'sash.hoverBorder': acc,

    'textLink.foreground': acc,
    'textLink.activeForeground': p.accent2,
    'textPreformat.foreground': s.string,
    'textBlockQuote.background': b.surface,
    'textBlockQuote.border': b.border,
    'textCodeBlock.background': b.surface,
    'textSeparator.foreground': f.lineNumber,

    'button.background': acc,
    'button.foreground': f.onAccent,
    'button.hoverBackground': blend(acc, b.editor, p.type === 'dark' ? 0.85 : 0.9),
    'button.secondaryBackground': b.surface,
    'button.secondaryForeground': f.text,
    'button.secondaryHoverBackground': b.hover,
    'button.border': withAlpha(f.onAccent, 0),
    'checkbox.background': b.surface,
    'checkbox.foreground': f.text,
    'checkbox.border': b.border,

    'dropdown.background': b.surface,
    'dropdown.foreground': f.text,
    'dropdown.border': b.border,
    'dropdown.listBackground': b.surface,

    'input.background': b.surface,
    'input.foreground': f.text,
    'input.border': b.border,
    'input.placeholderForeground': f.lineNumber,
    'inputOption.activeBackground': withAlpha(acc, 0.3),
    'inputOption.activeBorder': acc,
    'inputOption.activeForeground': f.text,
    'inputOption.hoverBackground': b.hover,
    'inputValidation.errorBackground': b.surface,
    'inputValidation.errorForeground': st.error,
    'inputValidation.errorBorder': st.error,
    'inputValidation.warningBackground': b.surface,
    'inputValidation.warningForeground': st.warning,
    'inputValidation.warningBorder': st.warning,
    'inputValidation.infoBackground': b.surface,
    'inputValidation.infoForeground': st.info,
    'inputValidation.infoBorder': st.info,

    'badge.background': acc,
    'badge.foreground': f.onAccent,
    'progressBar.background': acc,
    'activityBar.background': b.panel,
    'activityBar.foreground': acc,
    'activityBar.inactiveForeground': f.lineNumber,
    'activityBar.border': b.border,
    'activityBarBadge.background': acc,
    'activityBarBadge.foreground': f.onAccent,
    'activityBar.activeBorder': acc,
    'activityBar.activeBackground': withAlpha(acc, 0.12),
    'activityBar.dropBorder': acc,
    'activityBarTop.foreground': f.muted,

    'sideBar.background': b.panel,
    'sideBar.foreground': f.text,
    'sideBar.border': b.border,
    'sideBarTitle.foreground': f.muted,
    'sideBarSectionHeader.background': b.panel,
    'sideBarSectionHeader.foreground': f.muted,
    'sideBarSectionHeader.border': b.border,
    'sideBarActivityBarTop.border': b.border,
    'sideBar.dropBackground': withAlpha(acc, 0.12),
    'sideBarStickyScroll.background': b.panel,

    'list.activeSelectionBackground': b.selection,
    'list.activeSelectionForeground': f.text,
    'list.activeSelectionIconForeground': f.text,
    'list.inactiveSelectionBackground': b.hover,
    'list.inactiveSelectionForeground': f.text,
    'list.hoverBackground': b.hover,
    'list.hoverForeground': f.text,
    'list.focusBackground': b.selection,
    'list.focusForeground': f.text,
    'list.focusOutline': acc,
    'list.focusAndSelectionOutline': acc,
    'list.highlightForeground': acc,
    'list.inactiveFocusBackground': b.hover,
    'list.inactiveFocusOutline': b.border,
    'list.errorForeground': st.error,
    'list.warningForeground': st.warning,
    'list.deemphasizedForeground': f.muted,
    'list.invalidItemForeground': st.error,
    'list.filterMatchBackground': withAlpha(acc, 0.25),
    'listFilterWidget.background': b.surface,
    'listFilterWidget.outline': b.border,
    'listFilterWidget.noMatchesOutline': st.error,
    'tree.indentGuidesStroke': b.border,
    'tree.tableColumnsBorder': b.border,
    'tree.inactiveIndentGuidesStroke': withAlpha(b.border, 0.5),

    'titleBar.activeBackground': b.panel,
    'titleBar.activeForeground': f.text,
    'titleBar.inactiveBackground': b.panel,
    'titleBar.inactiveForeground': f.muted,
    'titleBar.border': b.border,

    'menubar.selectionForeground': f.text,
    'menubar.selectionBackground': b.hover,
    'menubar.selectionBorder': b.border,
    'menu.foreground': f.text,
    'menu.background': b.surface,
    'menu.selectionForeground': f.text,
    'menu.selectionBackground': b.selection,
    'menu.selectionBorder': b.border,
    'menu.separatorBackground': b.border,
    'menu.border': b.border,

    'statusBar.background': b.panel,
    'statusBar.foreground': f.muted,
    'statusBar.border': b.border,
    'statusBar.debuggingBackground': st.warning,
    'statusBar.debuggingForeground': f.onAccent,
    'statusBar.debuggingBorder': st.warning,
    'statusBar.noFolderBackground': b.panel,
    'statusBar.noFolderForeground': f.muted,
    'statusBar.noFolderBorder': b.border,
    'statusBar.focusBorder': acc,
    'statusBarItem.remoteBackground': acc,
    'statusBarItem.remoteForeground': f.onAccent,
    'statusBarItem.hoverBackground': b.hover,
    'statusBarItem.activeBackground': b.hover,
    'statusBarItem.focusBorder': acc,
    'statusBarItem.prominentBackground': b.surface,
    'statusBarItem.prominentForeground': f.muted,
    'statusBarItem.prominentHoverBackground': b.hover,
    'statusBarItem.errorBackground': st.error,
    'statusBarItem.errorForeground': f.onAccent,
    'statusBarItem.warningBackground': st.warning,
    'statusBarItem.warningForeground': f.onAccent,
    'statusBarItem.offlineBackground': b.surface,
    'statusBarItem.offlineForeground': f.muted,

    'editorGroup.border': b.border,
    'editorGroup.dropBackground': withAlpha(acc, 0.12),
    'editorGroup.emptyBackground': b.editor,
    'editorGroupHeader.tabsBackground': b.panel,
    'editorGroupHeader.noTabsBackground': b.panel,
    'editorGroupHeader.border': b.border,
    'editorGroupHeader.tabsBorder': b.border,

    'tab.activeBackground': b.editor,
    'tab.activeForeground': f.text,
    'tab.activeBorder': b.editor,
    'tab.activeBorderTop': acc,
    'tab.inactiveBackground': b.panel,
    'tab.inactiveForeground': f.muted,
    'tab.border': b.border,
    'tab.hoverBackground': b.hover,
    'tab.hoverForeground': f.text,
    'tab.unfocusedActiveBackground': b.editor,
    'tab.unfocusedActiveForeground': f.muted,
    'tab.unfocusedInactiveBackground': b.panel,
    'tab.unfocusedHoverBackground': b.hover,
    'tab.unfocusedHoverForeground': f.text,
    'tab.activeModifiedBorder': st.warning,
    'tab.inactiveModifiedBorder': withAlpha(st.warning, 0.6),
    'tab.unfocusedActiveBorderTop': withAlpha(acc, 0.5),
    'tab.lastPinnedBorder': b.border,

    'editor.background': b.editor,
    'editor.foreground': f.text,
    'editorLineNumber.foreground': f.lineNumber,
    'editorLineNumber.activeForeground': f.muted,
    'editorCursor.background': b.editor,
    'editorCursor.foreground': acc,
    'editorLineHighlightBackground': b.lineHighlight,
    'editorLineHighlightBorder': withAlpha(b.border, 0),
    'editor.selectionBackground': b.selection,
    'editor.selectionForeground': f.text,
    'editor.inactiveSelectionBackground': withAlpha(b.selection, 0.6),
    'editor.selectionHighlightBackground': withAlpha(acc, 0.22),
    'editor.selectionHighlightBorder': withAlpha(acc, 0),
    'editor.wordHighlightBackground': withAlpha(acc, 0.2),
    'editor.wordHighlightBorder': withAlpha(acc, 0.4),
    'editor.wordHighlightStrongBackground': withAlpha(acc, 0.28),
    'editor.wordHighlightStrongBorder': withAlpha(acc, 0.5),
    'editor.wordHighlightTextBackground': withAlpha(acc, 0.2),
    'editor.wordHighlightTextBorder': withAlpha(acc, 0.4),
    'editor.findMatchBackground': withAlpha(acc, 0.4),
    'editor.findMatchBorder': acc,
    'editor.findMatchHighlightBackground': withAlpha(acc, 0.25),
    'editor.findRangeHighlightBackground': withAlpha(acc, 0.12),
    'editor.findMatchHighlightBorder': withAlpha(acc, 0.4),
    'editor.hoverHighlightBackground': withAlpha(acc, 0.15),
    'editor.lineHighlightBackground': b.lineHighlight,
    'editor.lineHighlightBorder': withAlpha(b.border, 0),
    'editorLink.activeForeground': acc,
    'editor.rangeHighlightBackground': b.surface,
    'editorWhitespace.foreground': withAlpha(f.text, 0.16),
    'editorIndentGuide.background1': b.border,
    'editorIndentGuide.activeBackground1': f.lineNumber,
    'editorRuler.foreground': b.border,
    'editorCodeLens.foreground': f.lineNumber,
    'editorBracketMatch.background': withAlpha(acc, 0.15),
    'editorBracketMatch.border': acc,
    'editorBracketHighlight.foreground1': acc,
    'editorBracketHighlight.foreground2': s.type,
    'editorBracketHighlight.foreground3': s.string,
    'editorBracketHighlight.foreground4': s.keyword,
    'editorBracketHighlight.foreground5': s.number,
    'editorBracketHighlight.foreground6': s.function,
    'editorBracketHighlight.unexpectedBracket.foreground': st.error,
    'editorBracketPairGuide.background1': b.border,
    'editorBracketPairGuide.background2': b.border,
    'editorBracketPairGuide.background3': b.border,
    'editorBracketPairGuide.background4': b.border,
    'editorBracketPairGuide.background5': b.border,
    'editorBracketPairGuide.background6': b.border,
    'editorBracketPairGuide.activeBackground1': f.lineNumber,
    'editorBracketPairGuide.activeBackground2': f.lineNumber,
    'editorBracketPairGuide.activeBackground3': f.lineNumber,
    'editorBracketPairGuide.activeBackground4': f.lineNumber,
    'editorBracketPairGuide.activeBackground5': f.lineNumber,
    'editorBracketPairGuide.activeBackground6': f.lineNumber,
    'editor.foldBackground': withAlpha(b.selection, 0.4),
    'editorOverviewRuler.border': b.border,
    'editorOverviewRuler.findMatchForeground': withAlpha(acc, 0.8),
    'editorOverviewRuler.selectionHighlightForeground': withAlpha(acc, 0.6),
    'editorOverviewRuler.wordHighlightForeground': withAlpha(acc, 0.6),
    'editorOverviewRuler.wordHighlightStrongForeground': withAlpha(acc, 0.7),
    'editorOverviewRuler.bracketMatchForeground': withAlpha(acc, 0.7),
    'editorOverviewRuler.errorForeground': st.error,
    'editorOverviewRuler.warningForeground': st.warning,
    'editorOverviewRuler.infoForeground': st.info,
    'editorOverviewRuler.addedForeground': d.added,
    'editorOverviewRuler.deletedForeground': d.removed,
    'editorOverviewRuler.modifiedForeground': d.modified,
    'editorOverviewRuler.rangeHighlightForeground': withAlpha(acc, 0.4),

    'editorError.foreground': st.error,
    'editorError.border': b.editor,
    'editorError.background': withAlpha(st.error, 0.1),
    'editorWarning.foreground': st.warning,
    'editorWarning.border': b.editor,
    'editorWarning.background': withAlpha(st.warning, 0.1),
    'editorInfo.foreground': st.info,
    'editorInfo.border': b.editor,
    'editorInfo.background': withAlpha(st.info, 0.1),
    'editorHint.foreground': st.hint,
    'editorHint.border': b.editor,
    'problemsErrorIcon.foreground': st.error,
    'problemsWarningIcon.foreground': st.warning,
    'problemsInfoIcon.foreground': st.info,

    'editorWidget.background': b.surface,
    'editorWidget.foreground': f.text,
    'editorWidget.border': b.border,
    'editorWidget.resizeBorder': acc,
    'editorHoverWidget.background': b.surface,
    'editorHoverWidget.foreground': f.text,
    'editorHoverWidget.border': b.border,
    'editorHoverWidget.highlightForeground': acc,
    'editorHoverWidget.statusBarBackground': b.hover,
    'editorSuggestWidget.background': b.surface,
    'editorSuggestWidget.foreground': f.text,
    'editorSuggestWidget.border': b.border,
    'editorSuggestWidget.highlightForeground': acc,
    'editorSuggestWidget.selectedBackground': b.selection,
    'editorSuggestWidget.selectedForeground': f.text,
    'editorSuggestWidget.selectedIconForeground': f.text,
    'editorSuggestWidget.focusHighlightForeground': acc,
    'editorGhostText.foreground': f.lineNumber,
    'editorGhostText.border': b.border,

    'editorMarkerNavigation.background': b.surface,
    'editorMarkerNavigationError.background': st.error,
    'editorMarkerNavigationWarning.background': st.warning,
    'editorMarkerNavigationInfo.background': st.info,

    'peekView.border': acc,
    'peekViewEditor.background': b.editor,
    'peekViewEditor.matchHighlightBackground': withAlpha(acc, 0.3),
    'peekViewEditorGutter.background': b.editor,
    'peekViewResult.background': b.surface,
    'peekViewResult.fileForeground': f.text,
    'peekViewResult.lineForeground': f.muted,
    'peekViewResult.matchHighlightBackground': withAlpha(acc, 0.3),
    'peekViewResult.selectionBackground': b.selection,
    'peekViewResult.selectionForeground': f.text,
    'peekViewTitle.background': b.surface,
    'peekViewTitleDescription.foreground': f.muted,
    'peekViewTitleLabel.foreground': f.text,

    'diffEditor.insertedTextBackground': withAlpha(d.added, 0.18),
    'diffEditor.removedTextBackground': withAlpha(d.removed, 0.18),
    'diffEditor.insertedLineBackground': withAlpha(d.added, 0.1),
    'diffEditor.removedLineBackground': withAlpha(d.removed, 0.1),
    'diffEditor.border': b.border,
    'diffEditor.diagonalFill': b.border,
    'diffEditor.insertedTextBorder': withAlpha(d.added, 0.35),
    'diffEditor.removedTextBorder': withAlpha(d.removed, 0.35),
    'diffEditorGutter.insertedLineBackground': withAlpha(d.added, 0.15),
    'diffEditorGutter.removedLineBackground': withAlpha(d.removed, 0.15),
    'diffEditorOverview.insertedForeground': d.added,
    'diffEditorOverview.removedForeground': d.removed,

    'merge.currentHeaderBackground': withAlpha(d.added, 0.25),
    'merge.currentContentBackground': withAlpha(d.added, 0.12),
    'merge.incomingHeaderBackground': withAlpha(d.modified, 0.25),
    'merge.incomingContentBackground': withAlpha(d.modified, 0.12),
    'merge.commonHeaderBackground': b.surface,
    'merge.commonContentBackground': withAlpha(b.surface, 0.6),
    'merge.border': b.border,
    'editorOverviewRuler.currentContentForeground': d.added,
    'editorOverviewRuler.incomingContentForeground': d.modified,
    'editorOverviewRuler.commonContentForeground': f.lineNumber,

    'panel.background': b.panel,
    'panel.border': b.border,
    'panelTitle.activeBorder': acc,
    'panelTitle.activeForeground': f.text,
    'panelTitle.inactiveForeground': f.muted,
    'panelInput.border': b.border,
    'panelSection.border': b.border,
    'panelSectionHeader.background': b.surface,
    'panelSectionHeader.foreground': f.muted,
    'panelSectionHeader.border': b.border,
    'panelStickyScroll.background': b.panel,
    'panelSection.dropBackground': withAlpha(acc, 0.12),

    'terminal.background': b.editor,
    'terminal.foreground': f.text,
    'terminal.border': b.border,
    'terminal.selectionBackground': b.selection,
    'terminal.inactiveSelectionBackground': withAlpha(b.selection, 0.6),
    'terminalCursor.background': b.editor,
    'terminalCursor.foreground': acc,
    'terminal.dropBackground': withAlpha(acc, 0.12),
    'terminal.tab.activeBorder': acc,
    'terminal.ansiBlack': a.black,
    'terminal.ansiRed': a.red,
    'terminal.ansiGreen': a.green,
    'terminal.ansiYellow': a.yellow,
    'terminal.ansiBlue': a.blue,
    'terminal.ansiMagenta': a.magenta,
    'terminal.ansiCyan': a.cyan,
    'terminal.ansiWhite': a.white,
    'terminal.ansiBrightBlack': a.brightBlack,
    'terminal.ansiBrightRed': a.brightRed,
    'terminal.ansiBrightGreen': a.brightGreen,
    'terminal.ansiBrightYellow': a.brightYellow,
    'terminal.ansiBrightBlue': a.brightBlue,
    'terminal.ansiBrightMagenta': a.brightMagenta,
    'terminal.ansiBrightCyan': a.brightCyan,
    'terminal.ansiBrightWhite': a.brightWhite,

    'scrollbar.shadow': '#00000040',
    'scrollbarSlider.background': withAlpha(f.muted, 0.22),
    'scrollbarSlider.hoverBackground': withAlpha(f.muted, 0.35),
    'scrollbarSlider.activeBackground': withAlpha(f.muted, 0.45),

    'minimap.background': b.editor,
    'minimap.findMatchHighlight': withAlpha(acc, 0.6),
    'minimap.selectionHighlight': withAlpha(b.selection, 0.9),
    'minimap.errorHighlight': st.error,
    'minimap.warningHighlight': st.warning,
    'minimap.infoHighlight': st.info,
    'minimap.foregroundOpacity': '#000000',
    'minimapSlider.background': withAlpha(f.muted, 0.15),
    'minimapSlider.hoverBackground': withAlpha(f.muted, 0.25),
    'minimapSlider.activeBackground': withAlpha(f.muted, 0.35),
    'minimapGutter.addedBackground': d.added,
    'minimapGutter.deletedBackground': d.removed,
    'minimapGutter.modifiedBackground': d.modified,

    'breadcrumb.foreground': f.muted,
    'breadcrumb.background': b.editor,
    'breadcrumb.focusForeground': f.text,
    'breadcrumb.activeSelectionForeground': f.text,
    'breadcrumbPicker.background': b.surface,

    'quickInput.background': b.surface,
    'quickInput.foreground': f.text,
    'quickInputTitle.background': b.surface,
    'quickInputList.focusBackground': b.selection,
    'quickInputList.focusForeground': f.text,
    'quickInputList.focusIconForeground': f.text,
    'pickerGroup.foreground': acc,
    'pickerGroup.border': b.border,

    'notifications.background': b.surface,
    'notifications.foreground': f.text,
    'notifications.border': b.border,
    'notificationCenter.border': b.border,
    'notificationToast.border': b.border,
    'notificationsErrorIcon.foreground': st.error,
    'notificationsWarningIcon.foreground': st.warning,
    'notificationsInfoIcon.foreground': st.info,
    'notificationCenterHeader.background': b.panel,
    'notificationCenterHeader.foreground': f.muted,
    'notificationLink.foreground': acc,

    'gitDecoration.addedResourceForeground': d.added,
    'gitDecoration.modifiedResourceForeground': d.modified,
    'gitDecoration.deletedResourceForeground': d.removed,
    'gitDecoration.renamedResourceForeground': d.modified,
    'gitDecoration.untrackedResourceForeground': d.added,
    'gitDecoration.ignoredResourceForeground': f.lineNumber,
    'gitDecoration.conflictingResourceForeground': st.warning,
    'gitDecoration.stageModifiedResourceForeground': d.modified,
    'gitDecoration.stageDeletedResourceForeground': d.removed,
    'gitDecoration.submoduleResourceForeground': p.accent2,

    'debugToolBar.background': b.surface,
    'debugToolBar.border': b.border,
    'debugExceptionWidget.background': b.surface,
    'debugExceptionWidget.border': st.error,
    'debugIcon.breakpointForeground': st.error,
    'debugIcon.breakpointDisabledForeground': f.lineNumber,
    'debugIcon.breakpointUnverifiedForeground': st.warning,
    'debugIcon.breakpointCurrentStackframeForeground': st.success,
    'debugIcon.breakpointStackframeForeground': st.success,
    'debugTokenExpression.name': f.muted,
    'debugTokenExpression.value': f.text,
    'debugTokenExpression.error': st.error,
    'debugView.exceptionLabelForeground': f.onAccent,
    'debugView.exceptionLabelBackground': st.error,
    'debugView.stateLabelForeground': f.muted,
    'debugView.stateLabelBackground': b.surface,
    'debugView.valueChangedHighlight': withAlpha(acc, 0.25),
    'debugConsole.infoForeground': st.info,
    'debugConsole.warningForeground': st.warning,
    'debugConsole.errorForeground': st.error,
    'debugConsole.sourceForeground': f.muted,
    'debugConsoleInputIcon.foreground': f.muted,
    'debugIcon.startForeground': st.success,
    'debugIcon.pauseForeground': st.info,
    'debugIcon.stopForeground': st.error,
    'debugIcon.disconnectForeground': st.error,
    'debugIcon.restartForeground': st.success,
    'debugIcon.stepOverForeground': st.info,
    'debugIcon.stepIntoForeground': st.info,
    'debugIcon.stepOutForeground': st.info,
    'debugIcon.continueForeground': st.success,
    'debugIcon.stepBackForeground': st.info,

    'keybindingLabel.background': b.surface,
    'keybindingLabel.foreground': f.text,
    'keybindingLabel.border': b.border,
    'keybindingLabel.bottomBorder': b.border,

    'welcomePage.background': b.editor,
    'welcomePage.progress.background': b.surface,
    'welcomePage.progress.foreground': acc,
    'welcomePage.tileBackground': b.surface,
    'welcomePage.tileHoverBackground': b.hover,
    'welcomePage.tileBorder': b.border,
    'walkThrough.embeddedEditorBackground': b.surface,

    'settings.headerForeground': f.text,
    'settings.modifiedItemIndicator': acc,
    'settings.headerBorder': b.border,
    'settings.focusedRowBackground': b.hover,
    'settings.rowHoverBackground': withAlpha(b.hover, 0.5),
    'settings.focusedRowBorder': acc,
    'settings.numberInputBackground': b.surface,
    'settings.numberInputForeground': s.number,
    'settings.numberInputBorder': b.border,
    'settings.textInputBackground': b.surface,
    'settings.textInputForeground': f.text,
    'settings.textInputBorder': b.border,
    'settings.checkboxBackground': b.surface,
    'settings.checkboxForeground': f.text,
    'settings.checkboxBorder': b.border,
    'settings.dropdownBackground': b.surface,
    'settings.dropdownForeground': f.text,
    'settings.dropdownBorder': b.border,
    'settings.dropdownListBorder': b.border,
    'settings.sashBorder': b.border,

    'searchEditor.findMatchBackground': withAlpha(acc, 0.3),
    'searchEditor.findMatchBorder': withAlpha(acc, 0.5),
    'searchEditor.textInputBorder': b.border,

    'symbolIcon.arrayForeground': s.constant,
    'symbolIcon.booleanForeground': s.constant,
    'symbolIcon.classForeground': s.class,
    'symbolIcon.colorForeground': s.number,
    'symbolIcon.constantForeground': s.constant,
    'symbolIcon.constructorForeground': s.class,
    'symbolIcon.enumeratorForeground': s.class,
    'symbolIcon.enumeratorMemberForeground': s.constant,
    'symbolIcon.eventForeground': s.property,
    'symbolIcon.fieldForeground': s.property,
    'symbolIcon.fileForeground': f.muted,
    'symbolIcon.folderForeground': f.muted,
    'symbolIcon.functionForeground': s.function,
    'symbolIcon.interfaceForeground': s.type,
    'symbolIcon.keyForeground': s.property,
    'symbolIcon.keywordForeground': s.keyword,
    'symbolIcon.methodForeground': s.function,
    'symbolIcon.moduleForeground': s.namespace,
    'symbolIcon.namespaceForeground': s.namespace,
    'symbolIcon.nullForeground': s.constant,
    'symbolIcon.numberForeground': s.number,
    'symbolIcon.objectForeground': s.type,
    'symbolIcon.operatorForeground': s.operator,
    'symbolIcon.packageForeground': s.namespace,
    'symbolIcon.propertyForeground': s.property,
    'symbolIcon.referenceForeground': s.variable,
    'symbolIcon.snippetForeground': f.muted,
    'symbolIcon.stringForeground': s.string,
    'symbolIcon.structForeground': s.class,
    'symbolIcon.textForeground': f.text,
    'symbolIcon.typeParameterForeground': s.type,
    'symbolIcon.unitForeground': s.number,
    'symbolIcon.variableForeground': s.variable,

    'editorGutter.background': b.editor,
    'editorGutter.modifiedBackground': d.modified,
    'editorGutter.addedBackground': d.added,
    'editorGutter.deletedBackground': d.removed,
    'editorGutter.commentRangeForeground': f.lineNumber,
    'editorGutter.foldingControlForeground': f.muted,
    'editorCommentsService.resolvedThreadBorder': b.border,
    'editorCommentsService.unresolvedBorder': st.warning,
    'editorCommentsService.rangeBackground': withAlpha(b.selection, 0.3),

    'editorInlayHint.background': b.surface,
    'editorInlayHint.foreground': f.muted,
    'editorInlayHint.typeBackground': b.surface,
    'editorInlayHint.typeForeground': s.type,
    'editorInlayHint.parameterBackground': b.surface,
    'editorInlayHint.parameterForeground': f.muted,
    'editorInlineEdit.foreground': acc,
    'editorInlineEdit.background': withAlpha(acc, 0.1),

    'extensionIcon.starForeground': st.warning,
    'extensionIcon.verifiedForeground': st.success,
    'extensionIcon.preReleaseForeground': st.hint,
    'extensionIcon.sponsorForeground': p.accent2,
    'extensionBadge.remoteBackground': acc,
    'extensionBadge.remoteForeground': f.onAccent,
    'extensionButton.prominentBackground': acc,
    'extensionButton.prominentForeground': f.onAccent,
    'extensionButton.prominentHoverBackground': blend(acc, b.editor, 0.85),
    'extensionButton.background': acc,
    'extensionButton.foreground': f.onAccent,
    'extensionButton.hoverBackground': blend(acc, b.editor, 0.85),
    'extensionButton.separator': b.border,

    'charts.foreground': f.text,
    'charts.lines': acc,
    'charts.red': st.error,
    'charts.blue': st.info,
    'charts.yellow': st.warning,
    'charts.orange': s.number,
    'charts.green': st.success,
    'charts.purple': p.accent2,

    'testing.iconFailed': st.error,
    'testing.iconErrored': st.error,
    'testing.iconPassed': st.success,
    'testing.iconQueued': st.info,
    'testing.iconUnset': st.hint,
    'testing.iconSkipped': st.hint,
    'testing.runAction': st.success,
    'testing.peekBorder': b.border,
    'testing.peekHeaderBackground': b.surface,
    'testing.message.error.decorationForeground': st.error,
    'testing.message.error.lineBackground': withAlpha(st.error, 0.1),
    'testing.message.info.decorationForeground': st.info,
    'testing.message.info.lineBackground': withAlpha(st.info, 0.1),
    'testing.message.hint.decorationForeground': st.hint,

    'notebook.editorBackground': b.editor,
    'notebook.cellBorderColor': b.border,
    'notebook.cellHoverBackground': b.hover,
    'notebook.cellToolbarSeparator': b.border,
    'notebook.cellEditorBackground': b.editor,
    'notebook.focusedCellBorder': acc,
    'notebook.focusedEditorBorder': acc,
    'notebook.focusedCellBackground': b.surface,
    'notebook.selectedCellBackground': b.surface,
    'notebook.selectedCellBorder': b.border,
    'notebookStatusErrorIcon.foreground': st.error,
    'notebookStatusRunningIcon.foreground': st.info,
    'notebookStatusSuccessIcon.foreground': st.success,

    'interactive.activeCodeBorder': acc,
    'interactive.inactiveCodeBorder': b.border,

    'scm.historyItemAdditionsForeground': d.added,
    'scm.historyItemDeletionsForeground': d.removed,
    'scm.historyItemStatisticsBorder': b.border,
    'scm.historyItemSelectedStatisticsBorder': acc,
    'scm.historyItemLabelHoverBackground': b.hover,
    'scm.historyItemHoverAdditionsForeground': d.added,
    'scm.historyItemHoverDeletionsForeground': d.removed,

    'commandCenter.foreground': f.muted,
    'commandCenter.activeForeground': f.text,
    'commandCenter.background': b.surface,
    'commandCenter.activeBackground': b.hover,
    'commandCenter.border': b.border,

    'editorStickyScroll.background': b.editor,
    'editorStickyScrollHover.background': b.hover,
    'editorStickyScroll.border': b.border,
    'editorStickyScroll.shadow': '#00000040',
  };

  const tc = (name, scopes, foreground, fontStyle) =>
    ({ name, scope: scopes, settings: fontStyle ? { foreground, fontStyle } : { foreground } });
  const tokenColors = [
    tc('Keyword', ['keyword', 'keyword.other', 'storage.modifier'], s.keyword),
    tc('Control', ['keyword.control', 'keyword.operator.new', 'keyword.operator.expression', 'keyword.other.using'], s.control),
    tc('Storage', ['storage.type', 'storage.type.function', 'keyword.declaration', 'keyword.other.fn', 'keyword.other.rust', 'storage.type.class'], s.storage),
    tc('Type', ['support.type', 'entity.name.type', 'meta.type.annotation', 'entity.name.type.primitive', 'storage.type.primitive', 'support.type.primitive', 'entity.name.type.alias'], s.type),
    tc('Class', ['entity.name.class', 'entity.name.type.class', 'entity.other.inherited-class', 'support.class', 'entity.name.type.struct', 'entity.name.type.enum', 'entity.name.type.interface', 'entity.name.type.trait'], s.class),
    tc('Function', ['entity.name.function', 'support.function', 'meta.function-call entity.name.function', 'entity.name.method'], s.function),
    tc('Variable', ['variable', 'variable.other.readwrite', 'variable.language', 'support.variable'], s.variable),
    tc('Parameter', ['variable.parameter', 'meta.function.parameters variable'], s.parameter),
    tc('Property', ['variable.other.property', 'variable.other.object.property', 'support.variable.property', 'meta.object-literal.key', 'variable.other.member', 'entity.name.tag.yaml', 'support.type.property-name.json', 'support.type.property-name.css'], s.property),
    tc('Constant', ['constant.language', 'variable.other.constant', 'support.constant', 'entity.name.constant', 'variable.other.enummember'], s.constant),
    tc('Number', ['constant.numeric', 'keyword.other.unit'], s.number),
    tc('String', ['string', 'string.quoted', 'punctuation.definition.string'], s.string),
    tc('Escape', ['constant.character.escape', 'constant.other.placeholder', 'string.interpolated punctuation.section.embedded'], s.escape),
    tc('Regex', ['string.regexp', 'constant.other.character-class'], s.regex),
    tc('Operator', ['keyword.operator', 'keyword.operator.arithmetic', 'keyword.operator.assignment', 'keyword.operator.comparison', 'keyword.operator.logical'], s.operator),
    tc('Punctuation', ['punctuation', 'meta.brace', 'punctuation.separator', 'punctuation.terminator', 'punctuation.definition.block', 'punctuation.accessor'], s.punctuation),
    tc('Tag', ['entity.name.tag', 'punctuation.definition.tag', 'support.class.component'], s.tag),
    tc('Attribute', ['entity.other.attribute-name', 'entity.other.attribute-name.html', 'entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css'], s.attribute),
    tc('Decorator', ['meta.decorator', 'entity.name.function.decorator', 'punctuation.decorator', 'meta.annotation', 'storage.type.annotation'], s.decorator),
    tc('Namespace', ['entity.name.namespace', 'entity.name.module', 'support.other.namespace', 'storage.modifier.import', 'storage.modifier.package', 'entity.name.type.module', 'entity.name.type.namespace'], s.namespace),
    tc('Label', ['entity.name.label', 'constant.other.label', 'entity.name.section'], s.label),
    tc('Doc Tag', ['comment keyword.other.documentation', 'storage.type.class.jsdoc', 'entity.name.type.instance.jsdoc', 'comment.block.documentation entity.name.type', 'variable.other.jsdoc'], s.docTag),
    tc('Macro', ['entity.name.function.macro', 'meta.preprocessor', 'keyword.control.directive', 'entity.name.function.preprocessor', 'support.function.macro.rust'], s.macro),
    tc('Comment', ['comment', 'punctuation.definition.comment'], f.comment, 'italic'),
    tc('Invalid', ['invalid', 'invalid.illegal'], st.error),
    tc('Invalid deprecated', ['invalid.deprecated'], st.error, 'strikethrough'),
    tc('Markup heading', ['markup.heading'], acc, 'bold'),
    tc('Markup bold', ['markup.bold'], s.constant, 'bold'),
    tc('Markup italic', ['markup.italic'], f.text, 'italic'),
    tc('Markup inline raw', ['markup.inline.raw'], s.string),
    tc('Markup link', ['markup.underline.link', 'string.other.link'], acc, 'underline'),
    tc('Markup inserted', ['markup.inserted'], d.added),
    tc('Markup deleted', ['markup.deleted'], d.removed),
    tc('Markup changed', ['markup.changed'], d.modified),
    tc('Markup quote', ['markup.quote'], f.comment, 'italic'),
    tc('Markup list', ['markup.list punctuation.definition.list'], s.keyword),
  ];

  const semanticTokenColors = {
    'namespace': s.namespace,
    'type': s.type,
    'class': s.class,
    'enum': s.class,
    'interface': s.type,
    'struct': s.class,
    'typeParameter': s.type,
    'parameter': s.parameter,
    'variable': s.variable,
    'variable.readonly': s.constant,
    'variable.defaultLibrary': s.constant,
    'property': s.property,
    'enumMember': s.constant,
    'decorator': s.decorator,
    'event': s.property,
    'function': s.function,
    'method': s.function,
    'macro': s.macro,
    'label': s.label,
    'comment': f.comment,
    'string': s.string,
    'keyword': s.keyword,
    'number': s.number,
    'regexp': s.regex,
    'operator': s.operator,
    '*.deprecated': { strikethrough: true },
  };

  return { name: p.name, type: p.type === 'dark' ? 'dark' : 'light', semanticHighlighting: true, colors, tokenColors, semanticTokenColors };
}

// ---------- JetBrains .theme.json ----------
function jbThemeJson(p) {
  const b = p.bg, f = p.fg, st = p.status;
  const colors = {
    'transparent': '#00000000',
    'editor': b.editor,
    'panel': b.panel,
    'main': b.main,
    'surface': b.surface,
    'hover': b.hover,
    'selection': b.selection,
    'border': b.border,
    'text': f.text,
    'muted': f.muted,
    'comment': f.comment,
    'lineNumber': f.lineNumber,
    'onAccent': f.onAccent,
    'accent': p.accent,
    'accent2': p.accent2,
    'error': st.error,
    'warning': st.warning,
    'info': st.info,
    'success': st.success,
    'hint': st.hint,
    'added': p.diff.added,
    'removed': p.diff.removed,
    'modified': p.diff.modified,
    'tabActive': blend(p.accent, b.editor, 0.25),
    'scrollThumb': withAlpha(f.muted, 0.25),
    'scrollHoverThumb': withAlpha(f.muted, 0.4),
  };
  const ui = {
    'StatusBar.borderColor': 'transparent',
    'MainToolbar.borderColor': 'transparent',
    'Borders.color': 'border',
    'Island': {
      'borderWidth': 6,
      'borderWidth.compact': 5,
      'borderColor': 'panel',
      'arc': 24,
      'arc.compact': 20,
    },
    'ToolWindow': {
      'background': 'panel',
      'Header.background': 'panel',
      'Header.inactiveBackground': 'panel',
    },
    'MainWindow.background': 'main',
    'EditorTabs': {
      'background': 'editor',
      'underlinedBorderColor': 'accent',
      'underlinedTabBackground': 'tabActive',
      'inactiveUnderlinedTabBorderColor': 'border',
      'inactiveUnderlinedTabBackground': 'hover',
    },
    'Tree': {
      'selectionBackground': 'selection',
      'selectionInactiveBackground': 'hover',
      'leftChildIndent': 10,
      'rowHeight': 26,
      'Selection.arc': 12,
    },
    'List.selectionBackground': 'selection',
    'List.selectionInactiveBackground': 'hover',
    'Menu.selectionBackground': 'selection',
    'PopupMenu.selectionBackground': 'selection',
    'MenuItem.selectionBackground': 'selection',
    'CompletionPopup': {
      'selectionBackground': 'selection',
      'selectionInactiveBackground': 'hover',
      'background': 'surface',
    },
    'Button': {
      'default': {
        'foreground': 'onAccent',
        'startBackground': 'accent',
        'endBackground': 'accent',
        'startBorderColor': 'accent',
        'endBorderColor': 'accent',
      },
    },
    'Component.focusColor': 'accent',
    'Link.activeForeground': 'accent',
    'ProgressBar': {
      'progressColor': 'accent',
      'indeterminateStartColor': 'accent',
      'indeterminateEndColor': 'accent2',
      'failedColor': 'error',
      'failedEndColor': 'error',
      'passedColor': 'success',
      'passedEndColor': 'success',
    },
    'ToolTip': {
      'background': 'surface',
      'borderColor': 'border',
      'paintBorder': true,
    },
    'ScrollBar': {
      'thumbColor': 'scrollThumb',
      'thumbBorderColor': 'scrollThumb',
      'hoverThumbColor': 'scrollHoverThumb',
      'hoverThumbBorderColor': 'scrollHoverThumb',
      'trackColor': 'editor',
      'Mac.thumbColor': 'scrollThumb',
      'Mac.thumbBorderColor': 'transparent',
      'Mac.hoverThumbColor': 'scrollHoverThumb',
      'Mac.hoverThumbBorderColor': 'transparent',
      'Mac.Transparent.thumbColor': 'scrollThumb',
      'Mac.Transparent.hoverThumbColor': 'scrollHoverThumb',
    },
    'Panel.background': 'panel',
    'SidePanel.background': 'panel',
    'Content.background': 'panel',
    'Table.background': 'panel',
    'TextPane.background': 'panel',
    'ComboBox.nonEditableBackground': 'panel',
    'TextField.background': 'editor',
    'TextArea.background': 'editor',
    'NotificationsToolwindow': {
      'newNotification.background': 'surface',
      'newNotification.hoverBackground': 'hover',
      'Notification.hoverBackground': 'hover',
    },
    'Notification.background': 'surface',
    'SearchEverywhere.background': 'surface',
    'Popup.background': 'surface',
    'PopupMenu.background': 'surface',
    'Menu.background': 'surface',
    'Label.infoForeground': 'muted',
  };
  return {
    name: p.name,
    dark: p.type === 'dark',
    author: 'yx208',
    editorScheme: `/theme/${p.id}.theme.xml`,
    parentTheme: p.type === 'dark' ? 'Islands Dark' : 'Islands Light',
    colors,
    ui,
  };
}

// ---------- JetBrains .theme.xml ----------
// Key inventory: union of <colors>/<attributes> in the two hand-maintained schemes
// plus a must-have list. Values come from the palette via spec objects:
//   f=FOREGROUND b=BACKGROUND ft=FONT_TYPE e=EFFECT_COLOR et=EFFECT_TYPE
//   es=ERROR_STRIPE_COLOR base=baseAttributes
// Color refs: 'syntax.x' 'fg.x' 'bg.x' 'status.x' 'diff.x' 'ansi.x' 'accent' 'accent2'
//   'blend:<ref>@<t>' (over bg.editor)   'alpha:<ref>@<a>'
function inventoryFromXml(path) {
  const xml = readFileSync(path, 'utf8');
  const grab = tag => {
    const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
    if (!m) return [];
    // drop nested <value> blocks so inner option names don't count as attributes
    const body = m[1].replace(/<value>[\s\S]*?<\/value>/g, '');
    return [...body.matchAll(/<option name="([^"]+)"/g)].map(x => x[1]);
  };
  return { colors: grab('colors'), attributes: grab('attributes') };
}
const invInk = inventoryFromXml(join(JB_THEME_DIR, 'ink-light.theme.xml'));
const invEd = inventoryFromXml(join(JB_THEME_DIR, 'elegant-dark.theme.xml'));
const unionNames = (a, b) => [...new Set([...a, ...b])];
const MUST_COLORS = [];
const MUST_ATTRS = [
  'DIFF_CONFLICT', 'DIFF_INSERTED', 'DIFF_MODIFIED', 'ERRORS_ATTRIBUTES', 'WARNING_ATTRIBUTES',
  'INFO_ATTRIBUTES', 'TYPO', 'IDENTIFIER_UNDER_CARET_ATTRIBUTES', 'UNMATCHED_BRACE_ATTRIBUTES',
  'DEPRECATED_ATTRIBUTES', 'MARKED_FOR_REMOVAL_ATTRIBUTES',
  ...ANSI_KEYS.map(k => 'CONSOLE_' + ({
    black: 'BLACK', red: 'RED', green: 'GREEN', yellow: 'YELLOW', blue: 'BLUE', magenta: 'MAGENTA',
    cyan: 'CYAN', white: 'WHITE', brightBlack: 'DARKGRAY', brightRed: 'RED_BRIGHT',
    brightGreen: 'GREEN_BRIGHT', brightYellow: 'YELLOW_BRIGHT', brightBlue: 'BLUE_BRIGHT',
    brightMagenta: 'MAGENTA_BRIGHT', brightCyan: 'CYAN_BRIGHT', brightWhite: 'WHITE_BRIGHT',
  }[k]) + '_OUTPUT'),
];
const JB_COLOR_NAMES = unionNames(invInk.colors, invEd.colors).concat(MUST_COLORS.filter(n => !unionNames(invInk.colors, invEd.colors).includes(n)));
const JB_ATTR_NAMES = unionNames(invInk.attributes, invEd.attributes).concat(MUST_ATTRS.filter(n => !unionNames(invInk.attributes, invEd.attributes).includes(n)));

const CONSOLE_ANSI = {
  CONSOLE_BLACK_OUTPUT: 'ansi.black', CONSOLE_RED_OUTPUT: 'ansi.red', CONSOLE_GREEN_OUTPUT: 'ansi.green',
  CONSOLE_YELLOW_OUTPUT: 'ansi.yellow', CONSOLE_BLUE_OUTPUT: 'ansi.blue', CONSOLE_MAGENTA_OUTPUT: 'ansi.magenta',
  CONSOLE_CYAN_OUTPUT: 'ansi.cyan', CONSOLE_WHITE_OUTPUT: 'ansi.white', CONSOLE_DARKGRAY_OUTPUT: 'ansi.brightBlack',
  CONSOLE_RED_BRIGHT_OUTPUT: 'ansi.brightRed', CONSOLE_GREEN_BRIGHT_OUTPUT: 'ansi.brightGreen',
  CONSOLE_YELLOW_BRIGHT_OUTPUT: 'ansi.brightYellow', CONSOLE_BLUE_BRIGHT_OUTPUT: 'ansi.brightBlue',
  CONSOLE_MAGENTA_BRIGHT_OUTPUT: 'ansi.brightMagenta', CONSOLE_CYAN_BRIGHT_OUTPUT: 'ansi.brightCyan',
  CONSOLE_WHITE_BRIGHT_OUTPUT: 'ansi.brightWhite', CONSOLE_GRAY_OUTPUT: 'fg.muted',
  CONSOLE_NORMAL_OUTPUT: 'fg.text', CONSOLE_SYSTEM_OUTPUT: 'fg.muted', CONSOLE_ERROR_OUTPUT: 'status.error',
};

const JB_COLORS = {
  ADDED_LINES_COLOR: 'blend:diff.added@0.35',
  ANNOTATIONS_COLOR: 'fg.muted',
  ANNOTATIONS_LAST_COMMIT_COLOR: 'fg.lineNumber',
  CARET_COLOR: 'accent',
  CARET_ROW_COLOR: 'bg.lineHighlight',
  CONSOLE_BACKGROUND_KEY: 'bg.editor',
  DELETED_LINES_COLOR: 'blend:diff.removed@0.35',
  DIFF_SEPARATORS_BACKGROUND: 'bg.panel',
  DOCUMENTATION_COLOR: 'bg.surface',
  DOC_COMMENT_GUIDE: 'fg.comment',
  DOC_COMMENT_LINK: 'accent',
  ERROR_HINT: 'blend:status.error@0.15',
  FILESTATUS_ADDED: 'diff.added',
  FILESTATUS_COPIED: 'diff.added',
  FILESTATUS_DELETED: 'diff.removed',
  FILESTATUS_IDEA_FILESTATUS_DELETED_FROM_FILE_SYSTEM: 'diff.removed',
  FILESTATUS_IDEA_FILESTATUS_IGNORED: 'fg.lineNumber',
  FILESTATUS_IDEA_FILESTATUS_MERGED_WITH_BOTH_CONFLICTS: 'status.warning',
  FILESTATUS_IDEA_FILESTATUS_MERGED_WITH_CONFLICTS: 'status.warning',
  FILESTATUS_IDEA_FILESTATUS_MERGED_WITH_PROPERTY_CONFLICTS: 'status.warning',
  FILESTATUS_MERGED: 'accent2',
  FILESTATUS_MODIFIED: 'diff.modified',
  FILESTATUS_NOT_CHANGED_IMMEDIATE: 'diff.modified',
  FILESTATUS_NOT_CHANGED_RECURSIVE: 'diff.modified',
  FILESTATUS_RENAMED: 'diff.modified',
  FILESTATUS_UNKNOWN: 'status.warning',
  FILESTATUS_addedOutside: 'diff.added',
  FILESTATUS_changelistConflict: 'status.warning',
  FILESTATUS_modifiedOutside: 'diff.modified',
  GUTTER_BACKGROUND: 'bg.editor',
  HINT_BORDER: 'bg.border',
  IGNORED_ADDED_LINES_BORDER_COLOR: 'diff.added',
  IGNORED_DELETED_LINES_BORDER_COLOR: 'diff.removed',
  IGNORED_MODIFIED_LINES_BORDER_COLOR: 'diff.modified',
  INDENT_GUIDE: 'bg.border',
  INFORMATION_HINT: 'bg.surface',
  LINE_NUMBERS_COLOR: 'fg.lineNumber',
  LINE_NUMBER_ON_CARET_ROW_COLOR: 'fg.muted',
  LOOKUP_COLOR: 'bg.editor',
  MATCHED_BRACES_INDENT_GUIDE_COLOR: 'accent',
  METHOD_SEPARATORS_COLOR: 'bg.border',
  MODIFIED_LINES_COLOR: 'blend:diff.modified@0.35',
  NOTIFICATION_BACKGROUND: 'bg.surface',
  PREVIEW_BACKGROUND: 'bg.editor',
  PROMOTION_PANE: 'bg.surface',
  QUESTION_HINT: 'blend:status.info@0.15',
  RECENT_LOCATIONS_SELECTION: 'bg.editor',
  RIGHT_MARGIN_COLOR: 'bg.border',
  SELECTED_INDENT_GUIDE: 'fg.lineNumber',
  SELECTED_TEARLINE_COLOR: 'accent',
  SELECTION_BACKGROUND: 'bg.selection',
  SELECTION_FOREGROUND: 'fg.text',
  TEARLINE_COLOR: 'bg.border',
  VCS_ANNOTATIONS_COLOR_1: 'blend:fg.muted@0.9',
  VCS_ANNOTATIONS_COLOR_2: 'blend:fg.muted@0.75',
  VCS_ANNOTATIONS_COLOR_3: 'blend:fg.muted@0.6',
  VCS_ANNOTATIONS_COLOR_4: 'blend:fg.muted@0.45',
  VCS_ANNOTATIONS_COLOR_5: 'blend:fg.muted@0.3',
  VISUAL_INDENT_GUIDE: 'bg.border',
  WHITESPACES_MODIFIED_LINES_COLOR: 'blend:diff.modified@0.35',
  'ScrollBar.thumbColor': 'alpha:fg.muted@0.25',
  'ScrollBar.hoverThumbColor': 'alpha:fg.muted@0.4',
  'ScrollBar.Transparent.thumbColor': 'alpha:fg.muted@0.25',
  'ScrollBar.Transparent.hoverThumbColor': 'alpha:fg.muted@0.4',
  'ScrollBar.Mac.Transparent.thumbColor': 'alpha:fg.muted@0.25',
  'ScrollBar.Mac.Transparent.hoverThumbColor': 'alpha:fg.muted@0.4',
  'ScrollBar.Mac.thumbColor': 'alpha:fg.muted@0.25',
  'ScrollBar.Mac.hoverThumbColor': 'alpha:fg.muted@0.4',
};

const S = (o) => o;
// Explicit specs for non-pattern attribute names and language keys needing
// different treatment than the generic suffix rules.
const JB_ATTR_EXPLICIT = {
  TEXT: S({ f: 'fg.text', b: 'bg.editor' }),
  ANNOTATION_ATTRIBUTE_NAME_ATTRIBUTES: S({ f: 'syntax.attribute', e: 'syntax.attribute', et: 1 }),
  ANNOTATION_NAME_ATTRIBUTES: S({ f: 'syntax.decorator' }),
  BREADCRUMBS_CURRENT: S({ f: 'fg.text', b: 'bg.surface' }),
  BREADCRUMBS_DEFAULT: S({ f: 'fg.muted' }),
  BREADCRUMBS_HOVERED: S({ f: 'fg.text', b: 'bg.hover' }),
  BREADCRUMBS_INACTIVE: S({ f: 'fg.lineNumber' }),
  CODE_LENS_BORDER_COLOR: S({ e: 'fg.lineNumber' }),
  CONSOLE_RANGE_TO_EXECUTE: S({ e: 'ansi.green' }),
  CONSOLE_USER_INPUT: S({ f: 'ansi.green', ft: 2 }),
  CTRL_CLICKABLE: S({ f: 'accent', e: 'accent', et: 1 }),
  CUSTOM_KEYWORD1_ATTRIBUTES: S({ f: 'syntax.keyword' }),
  CUSTOM_KEYWORD2_ATTRIBUTES: S({ f: 'syntax.control' }),
  CUSTOM_KEYWORD3_ATTRIBUTES: S({ f: 'syntax.type' }),
  CUSTOM_KEYWORD4_ATTRIBUTES: S({ f: 'syntax.constant' }),
  CUSTOM_NUMBER_ATTRIBUTES: S({ f: 'syntax.number' }),
  CUSTOM_STRING_ATTRIBUTES: S({ f: 'syntax.string' }),
  DEPRECATED_ATTRIBUTES: S({ e: 'fg.muted', et: 3 }),
  DIFF_CONFLICT: S({ b: 'blend:status.error@0.22' }),
  DIFF_DELETED: S({ b: 'blend:diff.removed@0.22' }),
  DIFF_INSERTED: S({ b: 'blend:diff.added@0.22' }),
  DIFF_MODIFIED: S({ b: 'blend:diff.modified@0.22' }),
  DOC_CODE_BLOCK: S({ f: 'fg.text', b: 'bg.surface', e: 'bg.border' }),
  DOC_CODE_INLINE: S({ f: 'fg.text', b: 'bg.hover' }),
  DOC_TIPS_SHORTCUT: S({ f: 'fg.text', e: 'fg.lineNumber' }),
  ERRORS_ATTRIBUTES: S({ e: 'status.error', et: 2, es: 'status.error' }),
  WARNING_ATTRIBUTES: S({ e: 'status.warning', et: 2, es: 'status.warning' }),
  INFO_ATTRIBUTES: S({ e: 'status.info', et: 2 }),
  TYPO: S({ e: 'status.hint', et: 2 }),
  FOLDED_TEXT_ATTRIBUTES: S({ f: 'fg.muted', b: 'bg.surface' }),
  FOLLOWED_HYPERLINK_ATTRIBUTES: S({ f: 'accent2', e: 'accent2', et: 1 }),
  HYPERLINK_ATTRIBUTES: S({ f: 'accent', e: 'accent', et: 1 }),
  INACTIVE_HYPERLINK_ATTRIBUTES: S({ e: 'fg.muted', et: 1 }),
  IDENTIFIER_UNDER_CARET_ATTRIBUTES: S({ b: 'bg.hover', es: 'fg.lineNumber', et: 1 }),
  WRITE_IDENTIFIER_UNDER_CARET_ATTRIBUTES: S({ b: 'blend:accent@0.15', es: 'accent', et: 1 }),
  IMPLICIT_ANONYMOUS_CLASS_PARAMETER_ATTRIBUTES: S({ f: 'syntax.property', e: 'accent2', et: 1 }),
  INJECTED_LANGUAGE_FRAGMENT: S({ b: 'blend:syntax.string@0.12' }),
  INLAY_DEFAULT: S({ f: 'fg.muted', b: 'bg.surface' }),
  INLAY_TEXT_WITHOUT_BACKGROUND: S({ f: 'fg.muted' }),
  INLAY_BUTTON_DEFAULT: S({ f: 'fg.text', e: 'fg.lineNumber' }),
  INLAY_BUTTON_FOCUSED: S({ f: 'fg.text', e: 'accent' }),
  INLAY_BUTTON_HOVERED: S({ f: 'fg.text', e: 'fg.comment' }),
  INLINE_PARAMETER_HINT: S({ f: 'fg.muted', b: 'bg.surface' }),
  INLINE_PARAMETER_HINT_CURRENT: S({ f: 'accent', b: 'blend:accent@0.2' }),
  INLINE_PARAMETER_HINT_HIGHLIGHTED: S({ f: 'fg.text', b: 'bg.hover' }),
  INSTANCE_FIELD_ATTRIBUTES: S({ f: 'syntax.property' }),
  STATIC_FIELD_ATTRIBUTES: S({ f: 'syntax.property', ft: 2 }),
  STATIC_FINAL_FIELD_ATTRIBUTES: S({ f: 'syntax.constant', ft: 2 }),
  STATIC_METHOD_ATTRIBUTES: S({ f: 'syntax.function', ft: 2 }),
  SEARCH_RESULT_ATTRIBUTES: S({ b: 'blend:accent@0.2', e: 'accent', et: 4, es: 'accent' }),
  TEXT_SEARCH_RESULT_ATTRIBUTES: S({ b: 'blend:accent@0.2', e: 'accent', et: 4, es: 'accent' }),
  WRITE_SEARCH_RESULT_ATTRIBUTES: S({ b: 'blend:accent@0.3', e: 'accent', et: 4, es: 'accent' }),
  MARKED_FOR_REMOVAL_ATTRIBUTES: S({ e: 'status.error', et: 3 }),
  MATCHED_BRACE_ATTRIBUTES: S({ f: 'accent', b: 'bg.hover', ft: 1 }),
  MATCHED_TAG_NAME: S({ b: 'bg.surface' }),
  NOT_USED_ELEMENT_ATTRIBUTES: S({ f: 'fg.muted' }),
  TODO_DEFAULT_ATTRIBUTES: S({ f: 'status.success', ft: 2, es: 'status.success' }),
  UNMATCHED_BRACE_ATTRIBUTES: S({ f: 'status.error' }),
  WRONG_REFERENCES_ATTRIBUTES: S({ f: 'status.error', e: 'status.error', et: 2 }),
  TYPE_PARAMETER_NAME_ATTRIBUTES: S({ f: 'syntax.type' }),
  TEMPLATE_VARIABLE_ATTRIBUTES: S({ f: 'accent2', ft: 2 }),
  PROPERTIES_KEY: S({ f: 'syntax.keyword' }),
  'List/map to object conversion': S({ f: 'syntax.function' }),

  // DEFAULT_* (generic TextMate-ish keys)
  DEFAULT_IDENTIFIER: S({ f: 'fg.text', et: 5 }),
  DEFAULT_KEYWORD: S({ f: 'syntax.keyword' }),
  DEFAULT_STRING: S({ f: 'syntax.string' }),
  DEFAULT_NUMBER: S({ f: 'syntax.number' }),
  DEFAULT_LINE_COMMENT: S({ f: 'fg.comment', ft: 2 }),
  DEFAULT_BLOCK_COMMENT: S({ f: 'fg.comment', ft: 2 }),
  DEFAULT_DOC_COMMENT: S({ f: 'fg.comment' }),
  DEFAULT_DOC_COMMENT_TAG: S({ f: 'syntax.docTag', e: 'syntax.docTag', et: 1 }),
  DEFAULT_DOC_COMMENT_TAG_VALUE: S({ f: 'fg.muted', ft: 2 }),
  DEFAULT_DOC_MARKUP: S({ f: 'syntax.docTag' }),
  DEFAULT_OPERATION_SIGN: S({ f: 'syntax.operator' }),
  DEFAULT_PARENTHS: S({ f: 'syntax.punctuation' }),
  DEFAULT_BRACKETS: S({ f: 'syntax.punctuation' }),
  DEFAULT_BRACES: S({ f: 'syntax.punctuation' }),
  DEFAULT_COMMA: S({ f: 'syntax.punctuation' }),
  DEFAULT_SEMICOLON: S({ f: 'syntax.punctuation' }),
  DEFAULT_DOT: S({ f: 'syntax.punctuation' }),
  DEFAULT_FUNCTION_CALL: S({ f: 'syntax.function' }),
  DEFAULT_FUNCTION_DECLARATION: S({ f: 'syntax.function' }),
  DEFAULT_LOCAL_VARIABLE: S({ f: 'syntax.variable', et: 5 }),
  DEFAULT_GLOBAL_VARIABLE: S({ f: 'syntax.variable' }),
  DEFAULT_REASSIGNED_LOCAL_VARIABLE: S({ f: 'syntax.variable', e: 'fg.lineNumber', et: 1 }),
  DEFAULT_REASSIGNED_PARAMETER: S({ f: 'syntax.parameter', e: 'fg.lineNumber', et: 1 }),
  DEFAULT_PARAMETER: S({ f: 'syntax.parameter' }),
  DEFAULT_INSTANCE_FIELD: S({ f: 'syntax.property' }),
  DEFAULT_STATIC_FIELD: S({ f: 'syntax.property', ft: 2 }),
  DEFAULT_INSTANCE_METHOD: S({ f: 'syntax.function' }),
  DEFAULT_STATIC_METHOD: S({ f: 'syntax.function', ft: 2 }),
  DEFAULT_CLASS_NAME: S({ f: 'syntax.class' }),
  DEFAULT_INTERFACE_NAME: S({ f: 'syntax.type', ft: 2 }),
  DEFAULT_CLASS_REFERENCE: S({ f: 'syntax.class' }),
  DEFAULT_CONSTANT: S({ f: 'syntax.constant', ft: 2 }),
  DEFAULT_PREDEFINED_SYMBOL: S({ f: 'syntax.constant' }),
  DEFAULT_METADATA: S({ f: 'syntax.decorator' }),
  DEFAULT_ATTRIBUTE: S({ f: 'syntax.attribute' }),
  DEFAULT_TAG: S({ f: 'syntax.tag' }),
  DEFAULT_ENTITY: S({ f: 'syntax.class' }),
  DEFAULT_LABEL: S({ f: 'syntax.label', e: 'syntax.label', et: 1 }),
  DEFAULT_VALID_STRING_ESCAPE: S({ f: 'syntax.escape' }),
  DEFAULT_INVALID_STRING_ESCAPE: S({ f: 'status.error', e: 'status.error', et: 2 }),
  DEFAULT_HIGHLIGHTED_REFERENCE: S({ e: 'fg.lineNumber', et: 1 }),

  // IGNORE.*
  'IGNORE.COMMENT': S({ f: 'fg.comment', ft: 2 }),
  'IGNORE.HEADER': S({ f: 'fg.text', b: 'bg.surface', ft: 1 }),
  'IGNORE.SECTION': S({ f: 'fg.text', b: 'bg.surface' }),
  'IGNORE.SLASH': S({ f: 'accent2' }),
  'IGNORE.SYNTAX': S({ f: 'syntax.number', b: 'bg.surface', ft: 1 }),
  'IGNORE.UNUSED_ENTRY': S({ f: 'fg.comment', ft: 2 }),
  'IGNORE.VALUE': S({ f: 'syntax.string' }),

  // LOG_* / CSS / markup-ish
  LOG_DEBUG_OUTPUT: S({ f: 'fg.muted' }),
  LOG_INFO_OUTPUT: S({ f: 'status.info' }),
  'CSS.COLOR': S({ f: 'syntax.constant' }),
  'CSS.URL': S({ f: 'syntax.string' }),

  // HTML / XML
  HTML_TAG: S({ base: 'DEFAULT_TAG' }),
  HTML_TAG_NAME: S({ f: 'syntax.tag' }),
  HTML_CUSTOM_TAG_NAME: S({ f: 'syntax.class' }),
  HTML_ATTRIBUTE_NAME: S({ f: 'syntax.attribute' }),
  HTML_ATTRIBUTE_VALUE: S({ f: 'syntax.string' }),
  HTML_ENTITY_REFERENCE: S({ f: 'syntax.constant' }),
  XML_TAG: S({ base: 'DEFAULT_TAG' }),
  XML_TAG_NAME: S({ f: 'syntax.tag' }),
  XML_TAG_DATA: S({ base: 'TEXT' }),
  XML_CUSTOM_TAG_NAME: S({ f: 'syntax.class' }),
  XML_ATTRIBUTE_NAME: S({ f: 'syntax.attribute' }),
  XML_PROLOGUE: S({ f: 'syntax.tag', et: 5 }),

  // MARKDOWN
  MARKDOWN_AUTO_LINK: S({ f: 'accent', e: 'accent', et: 1 }),
  MARKDOWN_IMAGE: S({ f: 'fg.text' }),
  MARKDOWN_INLINE_HTML: S({ f: 'syntax.tag' }),
  MARKDOWN_LINK_DEFINITION: S({}),
  MARKDOWN_LINK_DESTINATION: S({}),
  MARKDOWN_LINK_TEXT: S({ f: 'accent', e: 'accent', et: 1 }),
  MARKDOWN_REFERENCE_LINK: S({}),

  // GHERKIN / misc file types
  GHERKIN_PYSTRING: S({ f: 'syntax.string' }),
  GHERKIN_REGEXP_PARAMETER: S({ f: 'syntax.function' }),
  'XPATH.FUNCTION': S({ f: 'syntax.function' }),
  'XPATH.KEYWORD': S({ f: 'syntax.keyword' }),
  'XPATH.XPATH_NAME': S({ f: 'syntax.variable' }),
  YAML_ANCHOR: S({ f: 'syntax.constant' }),
  YAML_SCALAR_KEY: S({ f: 'syntax.property' }),
  YAML_SCALAR_LIST: S({ f: 'syntax.variable', et: 5 }),
  YAML_SCALAR_VALUE: S({ f: 'syntax.string', et: 5 }),
  YAML_SIGN: S({ f: 'syntax.punctuation' }),
  YAML_TEXT: S({ f: 'fg.text', et: 5 }),
  'org.toml.KEY': S({ f: 'syntax.property' }),
  'NG.SIGNAL': S({ f: 'syntax.function' }),
  SASS_MIXIN: S({ f: 'syntax.macro' }),
  SASS_VARIABLE: S({ f: 'syntax.variable' }),
  SASS_PROPERTY_NAME: S({ f: 'syntax.property' }),
  SASS_COMMENT: S({ f: 'fg.comment', ft: 2 }),

  // JS / TS
  'JS.EXPORTED.FUNCTION': S({ f: 'syntax.function' }),
  'JS.GLOBAL_FUNCTION': S({ f: 'syntax.function' }),
  'JS.GLOBAL_VARIABLE': S({ f: 'syntax.constant', ft: 2 }),
  'JS.INSTANCE_MEMBER_FUNCTION': S({ f: 'syntax.function' }),
  'JS.JSX_CLIENT_COMPONENT': S({ f: 'syntax.class' }),
  'JS.LOCAL_VARIABLE': S({ f: 'syntax.variable', et: 5 }),
  'JS.MODULE_NAME': S({ f: 'syntax.namespace' }),
  'JS.REGEXP': S({ f: 'syntax.regex' }),
  'TS.ENUM_MEMBER': S({ f: 'syntax.constant', ft: 3 }),
  'TS.MODULE_NAME': S({ f: 'syntax.namespace' }),
  'TS.TYPE.ALIAS': S({ f: 'syntax.type', ft: 2 }),
  'TS.TYPE_PARAMETER': S({ f: 'syntax.type' }),

  // Kotlin / Dart
  KOTLIN_ABSTRACT_CLASS: S({ f: 'syntax.class', ft: 2 }),
  KOTLIN_ANNOTATION: S({ f: 'syntax.decorator', et: 1 }),
  KOTLIN_DYNAMIC_FUNCTION_CALL: S({ f: 'syntax.function', ft: 3 }),
  KOTLIN_ENUM_ENTRY: S({ f: 'syntax.constant', ft: 2 }),
  KOTLIN_FUNCTION_LITERAL_BRACES_AND_ARROW: S({}),
  KOTLIN_PACKAGE_FUNCTION_CALL: S({ f: 'syntax.function', ft: 2 }),
  KOTLIN_TRAIT: S({ f: 'syntax.type', ft: 2 }),
  DART_ENUM: S({ f: 'syntax.class', ft: 1 }),
  DART_IMPORT_PREFIX: S({ f: 'syntax.namespace', ft: 2 }),
  DART_PARAMETER_REFERENCE: S({ f: 'syntax.parameter' }),
  DART_SYMBOL_LITERAL: S({ f: 'syntax.constant', ft: 2 }),

  // Objective-C
  'OC.CONDITIONALLY_NOT_COMPILED': S({ f: 'fg.muted' }),
  'OC.MACRONAME': S({ f: 'syntax.macro', ft: 1 }),
  'OC.OPERATION_SIGN': S({ f: 'syntax.operator' }),
  'OC.OVERLOADED_OPERATOR': S({ f: 'syntax.operator' }),
  'OC.STRUCT_FIELD': S({ f: 'syntax.property' }),
  'OC.STRUCT_LIKE': S({ f: 'syntax.class' }),
  'OC.TYPEDEF': S({ f: 'syntax.type' }),

  // Python
  'PY.BUILTIN_NAME': S({ f: 'syntax.constant' }),
  'PY.DECORATOR': S({ f: 'syntax.decorator' }),
  'PY.PREDEFINED_DEFINITION': S({ f: 'syntax.constant', ft: 2 }),
  'PY.PREDEFINED_USAGE': S({ f: 'syntax.constant', ft: 2 }),
  'PY.SELF_PARAMETER': S({ f: 'syntax.keyword', ft: 2 }),
  'PY.KEYWORD_ARGUMENT': S({ f: 'syntax.parameter' }),
  'PY.TYPE_PARAMETER': S({ f: 'syntax.type' }),
  'PY.FSTRING_FORMAT_SPEC_NUMBER': S({ f: 'syntax.escape' }),
  'PY.FSTRING_FORMAT_SPEC_SPECIAL_CHAR': S({ f: 'syntax.escape' }),
  'PY.FSTRING_FRAGMENT_BRACES': S({ f: 'syntax.escape' }),
  'PY.FSTRING_FRAGMENT_COLON': S({ f: 'syntax.escape' }),
  'PY.FSTRING_FRAGMENT_TYPE_CONVERSION': S({ f: 'syntax.escape' }),

  // Go
  GO_BUILTIN_CONSTANT: S({ f: 'syntax.constant' }),
  GO_BUILTIN_FUNCTION_CALL: S({ f: 'syntax.function' }),
  GO_BUILTIN_TYPE_REFERENCE: S({ f: 'syntax.type' }),
  GO_BUILTIN_VARIABLE: S({ f: 'syntax.variable' }),
  GO_COMMENT_REFERENCE: S({ f: 'fg.muted' }),
  GO_EXPORTED_FUNCTION: S({ f: 'syntax.function' }),
  GO_EXPORTED_FUNCTION_CALL: S({ f: 'syntax.function' }),
  GO_LOCAL_CONSTANT: S({ f: 'syntax.constant' }),
  GO_LOCAL_FUNCTION: S({ f: 'syntax.function' }),
  GO_LOCAL_FUNCTION_CALL: S({ f: 'syntax.function' }),
  GO_METHOD_RECEIVER: S({ f: 'syntax.type' }),
  GO_PACKAGE: S({ f: 'syntax.namespace' }),
  GO_PACKAGE_EXPORTED_CONSTANT: S({ f: 'syntax.constant' }),
  GO_PACKAGE_LOCAL_CONSTANT: S({ f: 'syntax.constant' }),
  GO_SHADOWING_VARIABLE: S({ f: 'syntax.variable' }),
  GO_STRUCT_EXPORTED_MEMBER: S({ f: 'syntax.property' }),
  GO_STRUCT_LOCAL_MEMBER: S({ f: 'syntax.property' }),
  GO_SYNTAX_UPDATE: S({ e: 'accent', et: 2 }),
  GO_TYPE_REFERENCE: S({ f: 'syntax.type' }),

  // Rust
  'org.rust.ASSOC_FUNCTION': S({ f: 'syntax.function', ft: 2 }),
  'org.rust.ASSOC_FUNCTION_CALL': S({ f: 'syntax.function', ft: 2 }),
  'org.rust.ASSOC_TRAIT_FUNCTION': S({ f: 'syntax.function', ft: 2 }),
  'org.rust.ASSOC_TRAIT_FUNCTION_CALL': S({ f: 'syntax.function', ft: 2 }),
  'org.rust.CFG_DISABLED_CODE': S({ f: 'fg.muted' }),
  'org.rust.CONSTANT': S({ f: 'syntax.constant', ft: 1 }),
  'org.rust.CONST_PARAMETER': S({ f: 'syntax.parameter', ft: 2 }),
  'org.rust.CRATE': S({ f: 'syntax.namespace' }),
  'org.rust.DIMMED_TEXT': S({ f: 'fg.muted' }),
  'org.rust.DOC_CODE': S({ f: 'fg.muted' }),
  'org.rust.DOC_EMPHASIS': S({ ft: 3 }),
  'org.rust.DOC_LINK': S({ f: 'accent', e: 'accent', et: 1 }),
  'org.rust.DOC_STRONG': S({ ft: 1 }),
  'org.rust.ENUM': S({ f: 'syntax.class' }),
  'org.rust.ENUM_VARIANT': S({ f: 'syntax.constant', ft: 3 }),
  'org.rust.FORMAT_PARAMETER': S({ f: 'syntax.escape' }),
  'org.rust.FORMAT_SPECIFIER': S({ f: 'syntax.escape' }),
  'org.rust.FUNCTION': S({ f: 'syntax.function' }),
  'org.rust.FUNCTION_CALL': S({ f: 'syntax.function' }),
  'org.rust.GENERATED_ITEM': S({ f: 'syntax.variable' }),
  'org.rust.INLINE_ERROR_DESCRIPTION': S({ f: 'status.error', ft: 2 }),
  'org.rust.INLINE_EXPLANATION': S({ f: 'status.info', ft: 2 }),
  'org.rust.INLINE_WARNING_DESCRIPTION': S({ f: 'status.warning', ft: 2 }),
  'org.rust.KEYWORD_UNSAFE': S({ f: 'status.error' }),
  'org.rust.LIFETIME': S({ f: 'syntax.number', ft: 2 }),
  'org.rust.MACRO': S({ f: 'syntax.macro', ft: 2 }),
  'org.rust.METHOD': S({ f: 'syntax.function' }),
  'org.rust.METHOD_CALL': S({ f: 'syntax.function' }),
  'org.rust.MODULE': S({ f: 'syntax.namespace' }),
  'org.rust.MUT_BINDING': S({ e: 'fg.muted', et: 1 }),
  'org.rust.MUT_PARAMETER': S({ f: 'syntax.parameter', e: 'syntax.parameter', et: 1 }),
  'org.rust.MUT_SELF_PARAMETER': S({ f: 'syntax.keyword', ft: 2, e: 'fg.muted', et: 1 }),
  'org.rust.MUT_STATIC': S({ f: 'syntax.constant', ft: 1, e: 'syntax.constant', et: 1 }),
  'org.rust.PARAMETER': S({ f: 'syntax.parameter' }),
  'org.rust.Q_OPERATOR': S({ f: 'syntax.keyword', ft: 1 }),
  'org.rust.SECONDARY_SPOT': S({ e: 'status.info', et: 2 }),
  'org.rust.SELF_EXPRESSION': S({ f: 'syntax.keyword', ft: 2 }),
  'org.rust.SELF_PARAMETER': S({ f: 'syntax.keyword', ft: 2 }),
  'org.rust.STATIC': S({ f: 'syntax.constant', ft: 1 }),
  'org.rust.STRING': S({ f: 'syntax.string' }),
  'org.rust.STRUCT': S({ f: 'syntax.class' }),
  'org.rust.TRAIT': S({ f: 'syntax.type', ft: 2, et: 1 }),
  'org.rust.TRAIT_METHOD': S({ f: 'syntax.function', ft: 2 }),
  'org.rust.TRAIT_METHOD_CALL': S({ f: 'syntax.function', ft: 2 }),
  'org.rust.TYPE_ALIAS': S({ f: 'syntax.type', ft: 2 }),
  'org.rust.TYPE_PARAMETER': S({ f: 'syntax.type' }),
  'org.rust.UNION': S({ f: 'syntax.class' }),
  'org.rust.UNSAFE_CODE': S({ b: 'blend:status.error@0.15' }),
  'org.rust.VARIABLE': S({ f: 'syntax.variable', et: 5 }),
};

// Generic suffix rules, first match wins. Returns a syntax role name or null.
function roleFromName(name) {
  const n = name.toUpperCase();
  if (/INVALID_STRING_ESCAPE|UNMATCHED/.test(n)) return 'status.error';
  if (/DOC_COMMENT_TAG|DOC_TAG|DOC_MARKUP/.test(n)) return 'syntax.docTag';
  if (/DOC_COMMENT/.test(n)) return 'fg.comment.plain';
  if (/COMMENT/.test(n)) return 'fg.comment';
  if (/VALID_STRING_ESCAPE|ESC_CHARACTER|ESCAPE/.test(n)) return 'syntax.escape';
  if (/UNSAFE/.test(n)) return 'status.error';
  if (/KEYWORD/.test(n)) return 'syntax.keyword';
  if (/CONTROL|FLOW/.test(n)) return 'syntax.control';
  if (/MACRO|PREPROCESSOR|DIRECTIVE/.test(n)) return 'syntax.macro';
  if (/METADATA|ANNOTATION|DECORATOR|ATTRIBUTE_MACRO/.test(n)) return 'syntax.decorator';
  if (/ENUM_MEMBER|ENUM_VARIANT|ENUM_ENTRY/.test(n)) return 'syntax.constant';
  if (/STRUCT_FIELD|STRUCT_(EXPORTED_|LOCAL_)?MEMBER|INSTANCE_FIELD|STATIC_FIELD|FIELD|PROPERTY|MEMBER/.test(n)) return 'syntax.property';
  if (/OPERATION_SIGN|OPERATOR|Q_OPERATOR/.test(n)) return 'syntax.operator';
  if (/REGEXP|REGEX/.test(n)) return 'syntax.regex';
  if (/STRING|PYSTRING/.test(n)) return 'syntax.string';
  if (/NUMBER/.test(n)) return 'syntax.number';
  if (/LABEL/.test(n)) return 'syntax.label';
  if (/ATTRIBUTE_NAME|\bATTRIBUTE\b/.test(n)) return 'syntax.attribute';
  if (/PARAMETER/.test(n)) return 'syntax.parameter';
  if (/METHOD|FUNCTION/.test(n)) return 'syntax.function';
  if (/INTERFACE|TYPE_PARAMETER|TYPE_REFERENCE|BUILTIN_TYPE|PRIMITIVE|TYPEDEF|TYPE\.ALIAS|TYPE_ALIAS/.test(n)) return 'syntax.type';
  if (/CONSTANT|BOOLEAN|\bNULL\b|\bSELF\b|\bTHIS\b|PREDEFINED|\bSTATIC\b|SYMBOL_LITERAL/.test(n)) return 'syntax.constant';
  if (/CLASS_NAME|CLASS_REFERENCE|STRUCT_LIKE|ABSTRACT_CLASS|TRAIT\b|\bUNION\b|TYPE\b|\bENUM\b|STRUCT\b/.test(n)) return 'syntax.class';
  if (/VARIABLE|IDENTIFIER|BUILTIN/.test(n)) return 'syntax.variable';
  if (/PACKAGE|NAMESPACE|MODULE|\bIMPORT\b|CRATE/.test(n)) return 'syntax.namespace';
  if (/TAG_NAME|TAG/.test(n)) return 'syntax.tag';
  if (/BRACES|BRACKETS|PARENTHS|COMMA|SEMICOLON|\bDOT\b|COLON/.test(n)) return 'syntax.punctuation';
  if (/ANCHOR|\bKEY\b|SCALAR_KEY/.test(n)) return 'syntax.property';
  return null;
}

const needsMapping = [];
function attrSpec(name) {
  if (CONSOLE_ANSI[name]) return { f: CONSOLE_ANSI[name] };
  const dot = name.replace(/\./g, '_');
  if (JB_ATTR_EXPLICIT[name] !== undefined) return JB_ATTR_EXPLICIT[name];
  if (JB_ATTR_EXPLICIT[dot] !== undefined) return JB_ATTR_EXPLICIT[dot];
  const role = roleFromName(name);
  if (!role) { needsMapping.push(name); return { f: 'fg.text' }; }
  if (role === 'fg.comment.plain') return { f: 'fg.comment' };
  if (role === 'fg.comment') return { f: 'fg.comment', ft: 2 };
  if (role.startsWith('syntax.') || role.startsWith('status.')) return { f: role };
  return { f: 'fg.text' };
}

function resolveColor(p, ref) {
  if (ref.startsWith('#')) return ref.slice(1).toUpperCase();
  const m = /^(blend|alpha):(.+)@([0-9.]+)$/.exec(ref);
  if (m) {
    const [, op, inner, t] = m;
    const c = '#' + resolveColorRaw(p, inner);
    if (op === 'blend') return blend(c, p.bg.editor, parseFloat(t)).slice(1).toUpperCase();
    return withAlpha(c, parseFloat(t)).slice(1).toUpperCase();
  }
  return resolveColorRaw(p, ref);
}
function resolveColorRaw(p, ref) {
  if (ref === 'accent') return p.accent.slice(1).toUpperCase();
  if (ref === 'accent2') return p.accent2.slice(1).toUpperCase();
  const [group, key] = ref.split('.');
  const v = p[group] && p[group][key];
  if (!v) throw new Error(`unknown color ref "${ref}"`);
  return v.slice(1).toUpperCase();
}

function jbThemeXml(p) {
  const dark = p.type === 'dark';
  const lines = [];
  lines.push(`<scheme name="${xmlEsc(p.name)}" version="142" parent_scheme="${dark ? 'Darcula' : 'Default'}">`);
  lines.push('  <metaInfo>');
  lines.push('    <property name="ide">idea</property>');
  lines.push('    <property name="ideVersion">2025.3.0.0</property>');
  lines.push('  </metaInfo>');
  lines.push('  <colors>');
  for (const name of JB_COLOR_NAMES) {
    const ref = JB_COLORS[name];
    if (ref === undefined) { needsMapping.push('color:' + name); continue; }
    lines.push(`    <option name="${xmlEsc(name)}" value="${resolveColor(p, ref)}" />`);
  }
  lines.push('  </colors>');
  lines.push('  <attributes>');
  for (const name of JB_ATTR_NAMES) {
    const spec = attrSpec(name);
    const attrs = spec.base ? ` baseAttributes="${xmlEsc(spec.base)}"` : '';
    const inner = [];
    if (spec.f !== undefined) inner.push(['FOREGROUND', spec.f]);
    if (spec.b !== undefined) inner.push(['BACKGROUND', spec.b]);
    if (spec.e !== undefined) inner.push(['EFFECT_COLOR', spec.e]);
    if (spec.ft !== undefined) inner.push(['FONT_TYPE', String(spec.ft)]);
    if (spec.et !== undefined) inner.push(['EFFECT_TYPE', String(spec.et)]);
    if (spec.es !== undefined) inner.push(['ERROR_STRIPE_COLOR', spec.es]);
    lines.push(`    <option name="${xmlEsc(name)}"${attrs}>`);
    if (inner.length) {
      lines.push('      <value>');
      for (const [k, v] of inner) {
        const val = k === 'FONT_TYPE' || k === 'EFFECT_TYPE' ? v : resolveColor(p, v);
        lines.push(`        <option name="${k}" value="${val}" />`);
      }
      lines.push('      </value>');
    }
    lines.push('    </option>');
  }
  lines.push('  </attributes>');
  lines.push('</scheme>');
  return lines.join('\n') + '\n';
}
const xmlEsc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- registrations ----------
const pascal = id => id.split(/[-_]/).map(w => w[0].toUpperCase() + w.slice(1)).join('');
const sorted = [...palettes].sort((a, b) =>
  (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dark' ? -1 : 1));

function updatePluginXml() {
  const xml = readFileSync(PLUGIN_XML, 'utf8');
  const start = '<!-- generated-themes:start -->';
  const end = '<!-- generated-themes:end -->';
  const i = xml.indexOf(start), j = xml.indexOf(end);
  if (i < 0 || j < 0) fail('plugin.xml is missing generated-themes markers');
  const block = sorted
    .filter(p => p.jetbrains !== false)
    .map(p => [
      `        <themeProvider id="elegant-${p.id}" path="/theme/${p.id}.theme.json"/>`,
      `        <colorScheme id="Elegant${pascal(p.id)}" path="/theme/${p.id}.theme.xml"${p.type === 'dark' ? ' dark="true"' : ''} />`,
    ].join('\n'))
    .join('\n');
  writeFileSync(PLUGIN_XML, xml.slice(0, i + start.length) + '\n' + block + '\n        ' + xml.slice(j));
}

function updateVscodePackage() {
  const pkg = JSON.parse(readFileSync(VSCODE_PKG, 'utf8'));
  pkg.contributes = pkg.contributes || {};
  pkg.contributes.themes = sorted.map(p => ({
    label: p.name,
    uiTheme: p.type === 'dark' ? 'vs-dark' : 'vs',
    path: `./themes/${p.id}.json`,
  }));
  writeFileSync(VSCODE_PKG, JSON.stringify(pkg, null, 2) + '\n');
}

// ---------- run ----------
mkdirSync(VSCODE_THEMES_DIR, { recursive: true });
const summary = [];
for (const p of palettes) {
  writeFileSync(join(VSCODE_THEMES_DIR, `${p.id}.json`), JSON.stringify(vscodeTheme(p), null, 2) + '\n');
  const targets = ['vscode'];
  if (p.jetbrains !== false) {
    writeFileSync(join(JB_THEME_DIR, `${p.id}.theme.json`), JSON.stringify(jbThemeJson(p), null, 2) + '\n');
    writeFileSync(join(JB_THEME_DIR, `${p.id}.theme.xml`), jbThemeXml(p));
    targets.push('jetbrains');
  }
  summary.push({ id: p.id, type: p.type, targets: targets.join('+'), lint: p.jetbrains === false ? 'exempt' : 'pass' });
}
updatePluginXml();
updateVscodePackage();

console.log('GENERATED THEMES');
printTable(['id', 'type', 'targets', 'lint'], summary);
if (needsMapping.length) {
  console.log('\nNEEDS MAPPING (fell back to fg.text — decide a role and add to JB_ATTR_EXPLICIT/roleFromName):');
  for (const n of [...new Set(needsMapping)]) console.log('  - ' + n);
}
console.log(`\nDone: ${palettes.length} palettes, ${sorted.filter(p => p.jetbrains !== false).length} jetbrains targets.`);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
