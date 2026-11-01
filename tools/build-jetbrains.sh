#!/usr/bin/env bash
# Builds the JetBrains plugin zip into dist/elegant-theme-<version>.zip
# (layout: elegant-theme/lib/elegant-theme.jar).
set -euo pipefail
cd "$(dirname "$0")/.."

IDE_HOME="${IDE_HOME:-/Applications/GoLand.app/Contents}"
PLUGIN_XML="resources/META-INF/plugin.xml"
VERSION=$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' "$PLUGIN_XML" | head -1 | tr -d '[:space:]')
[ -n "$VERSION" ] || { echo "could not read plugin version"; exit 1; }

echo "== validating theme resources =="
for f in resources/theme/*.theme.xml; do
  python3 -c "import xml.etree.ElementTree as ET,sys; ET.parse('$f')" || exit 1
done
for f in resources/theme/*.theme.json; do
  python3 -c "import json; json.load(open('$f'))" || exit 1
done
python3 -c "import xml.etree.ElementTree as ET; ET.parse('$PLUGIN_XML')" || exit 1

echo "== compiling (IDE_HOME=$IDE_HOME) =="
rm -rf build/classes build/zip
rm -f "dist/elegant-theme-${VERSION}.zip"
mkdir -p build/classes dist
# Prefer the JBR javac inside the IDE: modern IDEs ship Java 21+ class files
# that an older system javac cannot read.
JAVAC="$IDE_HOME/jbr/Contents/Home/bin/javac"
[ -x "$JAVAC" ] || JAVAC=javac
"$JAVAC" --release 17 -cp "$IDE_HOME/lib/*" -d build/classes $(find src -name '*.java')
cp -R resources/. build/classes/

jar cf build/elegant-theme.jar -C build/classes .
mkdir -p build/zip/elegant-theme/lib
cp build/elegant-theme.jar build/zip/elegant-theme/lib/
(cd build/zip && zip -qr "../../dist/elegant-theme-${VERSION}.zip" elegant-theme)
echo "built dist/elegant-theme-${VERSION}.zip"
