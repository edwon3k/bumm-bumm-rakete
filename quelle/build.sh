#!/bin/bash
set -e
cd "$(dirname "$0")"
{ cat shell.html; echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'; echo '<script>'; cat songs.js audio.js synth_fallback.js instruments.js techno.js arrange.js fx.js gfx.js city3d.js custom.js game.js field.js ui.js progress.js p2p.js online.js; echo '</script>'; } > bumm-bumm-rakete.html
cat songs.js audio.js synth_fallback.js instruments.js techno.js arrange.js fx.js gfx.js city3d.js custom.js game.js field.js ui.js progress.js p2p.js online.js > /tmp/claude-0/-home-claude/c31ff70d-bebc-53c9-b44c-ad4a53f661a5/scratchpad/all.js
node --check /tmp/claude-0/-home-claude/c31ff70d-bebc-53c9-b44c-ad4a53f661a5/scratchpad/all.js && echo SYNTAX_OK
wc -c bumm-bumm-rakete.html
