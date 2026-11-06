#!/bin/sh
# Rebuilds the site from the parts in src/:
#   index.html             the Burnware desktop
#   apps/omnigacha.html    apps/wrc-1988.html    apps/sizzle-sand.html    apps/kaiju-rampage.html
# It only glues files together, so there is nothing to install. Run it from anywhere:  sh build.sh
set -e
cd "$(dirname "$0")"
mkdir -p apps

# the live address, used for link previews (the picture shown when someone shares the link)
SITE_URL="https://burnware-three.vercel.app"
DESC_BW="A late-90s desktop that runs in your browser, full of games and toys Claude built while burning through a week of tokens."
BASE_BW='[hidden]{display:none!important}body{margin:0}'
BASE_APP=':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}'

# open a page: $1 description, $2 base css, $3 path prefix back to the site root ("" or "../")
open_page() {
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  printf '<meta name="description" content="%s">\n' "$1"
  printf '<meta name="theme-color" content="#5c1408">\n'
  printf '<link rel="icon" type="image/png" href="%sfavicon.png">\n<link rel="apple-touch-icon" href="%sapple-touch-icon.png">\n' "$3" "$3"
  printf '<style>%s</style>\n' "$2"
}
# the parts were first made as Claude artifacts; this one tag only meant something there
head_part() { sed '/claude:viewport-fit-sides/d' "$1"; }

# ---------- Burnware ----------
D=src/burnware
BW="00-core.js 05-icons.js 06-icons-more.js 10-sound.js 15-fs.js 20-wm.js 30-files.js 35-notepad.js 40-paint.js 45-mines.js 50-solitaire.js 55-snake.js 60-terminal.js 65-browser.js 66-news.js 67-newsboard.js 70-music.js 72-tracks.js 75-chat.js 80-settings.js 85-tuko.js 88-programs.js 90-boot.js 99-main.js"
{
  open_page "$DESC_BW" "$BASE_BW" ""
  printf '<meta property="og:title" content="Burnware">\n<meta property="og:description" content="%s">\n<meta property="og:type" content="website">\n<meta name="twitter:card" content="summary_large_image">\n' "$DESC_BW"
  if [ -n "$SITE_URL" ]; then printf '<meta property="og:url" content="%s/">\n<meta property="og:image" content="%s/preview.png">\n<meta name="twitter:image" content="%s/preview.png">\n' "$SITE_URL" "$SITE_URL" "$SITE_URL"; fi
  head_part $D/00-head.html
  printf '</head>\n<body>\n'
  cat $D/01-body.html
  echo '<script>'
  for f in $BW; do echo "/* ---- $f ---- */"; cat "$D/$f"; done
  echo '</script>'
  printf '</body>\n</html>\n'
} > index.html

# ---------- Omnigacha ----------
D=src/omnigacha
{
  open_page "Omnigacha: a gacha machine that pulls for everything." "$BASE_APP" "../"
  head_part $D/01-head.html
  printf '</head>\n<body>\n'
  cat $D/02-body.html
  echo '<script>'; cat $D/03-data.js $D/04-audio.js $D/05-core.js $D/06-ui.js; echo '</script>'
  printf '</body>\n</html>\n'
} > apps/omnigacha.html

# ---------- WRC 1988 (it started life as Pebble Dash) ----------
D=src/wrc-1988
JS="10-util.js 11-tracks.js 12-world.js 13-scenery.js 14-car.js 15-ai.js 20-render-world.js 21-render-scenery.js 22-render-car.js 23-fx.js 24-audio.js 25-ui.js 26-game.js 27-rules.js 28-replay.js 29-boot.js"
{
  open_page "WRC 1988: a fan-made rally game. Flat out on loose gravel." "$BASE_APP" "../"
  head_part $D/01-head.html
  printf '</head>\n<body>\n'
  cat $D/02-body.html
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
  echo '<script>'; for f in $JS; do cat $D/$f; echo; done; echo '</script>'
  printf '</body>\n</html>\n'
} > apps/wrc-1988.html

# ---------- Sizzle Sand ----------
D=src/sizzle-sand
JS="10-core.js 11-elements.js 12-sim.js 13-kitchen.js 14-tools.js 15-recipes.js 16-render.js 16b-cat.js 17-audio.js 18-service.js 19-ui.js 20-main.js"
{
  open_page "Sizzle Sand: a kitchen where every grain is simulated." "$BASE_APP" "../"
  head_part $D/00-head.html
  printf '</head>\n<body>\n'
  cat $D/01-body.html
  echo '<script>'; for f in $JS; do [ -f $D/$f ] && { cat $D/$f; echo; }; done; echo '</script>'
  printf '</body>\n</html>\n'
} > apps/sizzle-sand.html

# ---------- Kaiju Rampage ----------
D=src/kaiju-rampage
JS="10-core.js 15-audio.js 20-world.js 30-voxels.js 32-city.js 34-damage.js 35-fx.js 40-kaiju.js 45-moves.js 50-units.js 55-army.js 60-game.js 62-hud.js 99-main.js"
{
  open_page "Kaiju Rampage: Tuko, 40 metres tall, loose in a city made of blocks." "$BASE_BW" "../"
  head_part $D/00-head.html
  printf '</head>\n<body>\n'
  cat $D/01-body.html
  echo '<script>'; for f in $JS; do echo "/* ---- $f ---- */"; cat "$D/$f"; done; echo '</script>'
  printf '</body>\n</html>\n'
} > apps/kaiju-rampage.html

# ---------- Burn Studio ----------
D=src/burn-studio
JS="10-core.js 20-synth.js 30-seq.js 40-ui.js 50-play.js 60-extras.js 99-main.js"
{
  open_page "Burn Studio: a music maker. Drums, bass, keys and synths, loops, a piano and WAV export." "$BASE_BW" "../"
  head_part $D/00-head.html
  printf '</head>\n<body>\n'
  cat $D/01-body.html
  echo '<script>'; for f in $JS; do echo "/* ---- $f ---- */"; cat "$D/$f"; done; echo '</script>'
  printf '</body>\n</html>\n'
} > apps/burn-studio.html

wc -c index.html apps/*.html
