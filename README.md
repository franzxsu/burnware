# Burnware

A late-90s desktop that runs in your browser, full of games and toys Claude built while burning through a week of tokens on purpose.

Press the power button, wait for the BIOS and the boot screen, and you're on the desktop. Double-click an icon (or tap it on a phone) to open it.

## What's on it

| Program | What it is |
| --- | --- |
| **Omnigacha** | A gacha machine that pulls for everything. Tap it to shake loose tokens, then pull. |
| **Pebble Dash** | A tiny rally game in 3D: loose gravel, big slides, rivals, ghosts and replays. |
| **Sizzle Sand** | A kitchen where every grain is simulated. Heat spreads, water boils off, oil catches fire. |
| **Rain.wav** | A one-minute lo-fi music video. Every pixel and every note was made in code. Plays in the Media Player. |
| **Kaiju Rampage** | Still being built. |

Plus the built-in programs: Paint, Minesweeper, Solitaire, Snake, Notepad, Command Prompt, Wildfire Navigator (the World Wide Web, as it was), Smoke Signals (chat with DialUpDan), MixBurner (the music player) and Display Properties. Tuko the gecko lives on the desktop. There's a locked folder, and he knows the password.

Everything you make (files, paintings, high scores) is saved in your own browser only.

## How it's put together

It's a plain static site: no framework, no packages, no build server.

```
index.html              the Burnware desktop (built)
apps/                   the big programs, one page each (built)
media/                  the video, its poster and the MixBurner songs
favicon.png, apple-touch-icon.png
src/burnware/           the desktop's parts: one file per program or system piece
src/omnigacha/          the parts of each big program
src/pebble-dash/
src/sizzle-sand/
build.sh                glues the parts in src/ into index.html and apps/
```

Each big program runs inside a Burnware window in a frame that loads its page from `apps/`. The window's toolbar has **Restart**, **Full screen** and **New tab**, so any of them can also get the whole screen.

## Run it on your computer

The programs load in frames, so open the site through a small local web server rather than double-clicking `index.html`.

1. Open a terminal in the folder that holds `index.html`.
2. Start a server. Python is usually already installed:
   ```
   python3 -m http.server 8000
   ```
3. Open http://localhost:8000 in your browser.
4. Press `Ctrl+C` in the terminal to stop the server when you're done.

## Change something

1. Edit the parts in `src/` (for example `src/burnware/85-tuko.js` holds Tuko's tips).
2. Rebuild the pages. Run this in the folder that holds `build.sh`:
   ```
   sh build.sh
   ```
3. Commit both your edits and the rebuilt `index.html` / `apps/` files, then push.

## Deploying

Vercel serves the repository as a static site: Framework Preset **Other**, no build command, no output directory. Every push to `main` redeploys it. `.vercelignore` keeps `src/`, `build.sh` and this README out of the deployed site.

## Credits

Every program here, from the boot beep to the last pixel, was built in code by Claude (Anthropic), across a few long chats with franzxsu.
