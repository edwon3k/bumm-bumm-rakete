#!/bin/bash
# Webseite ohne Claude (GitHub Pages): alles liegt neben index.html, Online direkt von Browser zu Browser
set -e
cd "$(dirname "$0")"
OUT=${1:-site}
mkdir -p "$OUT/samples"
{ echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E"></head><body>';
  grep -v 'fonts.g' shell.html | sed 's#<style>#<style>\n@font-face{font-family:"Bungee";font-weight:400;font-display:swap;src:url(fonts/bungee-latin-400-normal.woff2) format("woff2");}\n@font-face{font-family:"Cinzel";font-weight:500;font-display:swap;src:url(fonts/cinzel-latin-500-normal.woff2) format("woff2");}\n@font-face{font-family:"Cinzel";font-weight:600;font-display:swap;src:url(fonts/cinzel-latin-600-normal.woff2) format("woff2");}\n@font-face{font-family:"Cinzel";font-weight:700;font-display:swap;src:url(fonts/cinzel-latin-700-normal.woff2) format("woff2");}\n@font-face{font-family:"Rubik";font-weight:400;font-display:swap;src:url(fonts/rubik-latin-400-normal.woff2) format("woff2");}\n@font-face{font-family:"Rubik";font-weight:500;font-display:swap;src:url(fonts/rubik-latin-500-normal.woff2) format("woff2");}\n@font-face{font-family:"Rubik";font-weight:600;font-display:swap;src:url(fonts/rubik-latin-600-normal.woff2) format("woff2");}\n@font-face{font-family:"Rubik";font-weight:700;font-display:swap;src:url(fonts/rubik-latin-700-normal.woff2) format("woff2");}#'; echo '<script src="three.min.js"></script><script src="peerjs.min.js"></script>'; echo '<script>';
  cat songs.js audio.js synth_fallback.js instruments.js arrange.js fx.js city3d.js custom.js game.js field.js ui.js p2p.js online.js; echo '</script></body></html>'; } > "$OUT/index.html"
cp three.min.js "$OUT/"; cp ../p2p/node_modules/peerjs/dist/peerjs.min.js "$OUT/"
cp samples/*.mp3 samples/CREDITS.txt "$OUT/samples/"
touch "$OUT/.nojekyll"
mkdir -p "$OUT/fonts"; F=../p2p/node_modules/@fontsource
cp $F/bungee/files/bungee-latin-400-normal.woff2 $F/cinzel/files/cinzel-latin-{500,600,700}-normal.woff2 $F/rubik/files/rubik-latin-{400,500,600,700}-normal.woff2 "$OUT/fonts/"
cp site-extra/* "$OUT/"
echo "site -> $OUT"; du -sh "$OUT"
