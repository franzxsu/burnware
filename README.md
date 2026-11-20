# Burnware

A late-90s desktop that runs in your browser, full of games and toys Claude built while burning through a week of tokens on purpose.

Press the power button, wait for the BIOS and the boot screen, and you're on the desktop. Double-click an icon (or tap it on a phone) to open it.

## What's on it

| Program | What it is |
| --- | --- |
| **Omnigacha** | A gacha machine that pulls for everything. Tap it to shake loose tokens, then pull. |
| **WRC 1988** | A fan-made 3D rally game dressed like a late-80s arcade cabinet: loose gravel, big slides, rivals, ghosts and replays. (It started life as Pebble Dash. Not affiliated with the FIA World Rally Championship.) |
| **Sizzle Sand** | A kitchen where every grain is simulated. Heat spreads, water boils off, oil catches fire. |
| **Rain.wav** | A one-minute lo-fi music video. Every pixel and every note was made in code. Plays in the Media Player. |
| **Burn Studio** | A music maker in the spirit of GarageBand: drums, bass, keys and synth tracks, four scenes to arrange, a loop library that always fits your key, a playable keyboard and drum pads (or A to K on a computer), recording, and WAV export. Every sound is synthesized live. |
| **Dream Machine** | A procedural surreal-world generator in three.js: floating islands, impossible monuments, moons and mist. Six rules change the dream: gravity (down, up, sideways, none, inward), time (slow, stopped, fast, backwards), scale, geometry (impossible, echoes, melted, crystal), colour and physics. Seeds make dreams repeatable and shareable; a dream can become the Burnware wallpaper. |
| **Games folder** | Pinball (a full table with real ball physics: bumpers, slingshots, B-U-R-N lanes, targets, a jackpot hole, ball save, tilt and a self-playing demo), Number Place (sudoku with unique-answer puzzles), Blockfall (falling blocks), Five Letters (a daily 5-letter word guess), Typing Racer (race three rivals by typing) and Spider Solitaire (1, 2 or 4 suits), styled like the games that shipped with a 1998 PC. Word list: [word-list](https://github.com/sindresorhus/word-list) (MIT). |
| **Station 7** (a mystery) | Not a program: a story hidden in the OS itself. Somebody used this computer in 1997 and left a locked program on it for a friend who never came. You open it with the tools Burnware already has (Recycle Bin, Command Prompt, Paint, Burn Studio, the clock), and by visiting one website, `www.alitaptap.net`, in different years: it is rebuilt in the style of each era from 1996 to today. Tuko keeps case notes and gives hints. Starts when Tuko mentions a folder that isn't yours, or open `C:\STATION7`. |
| **Kaiju Rampage** | You're Tuko the gecko, 40 metres tall, in a 3D city made of 30,000 blocks. Stomp, tail-spin, roar and beam; buildings collapse when a floor gives way; police, tanks, helicopters and jets try to stop you. Three minutes, scored in dollars of damage. Nobody gets hurt. |

Plus the built-in programs: Paint, Minesweeper, Solitaire, Snake, Notepad, Command Prompt, Torch (the World Wide Web, as it was), Smoke Signals (chat with DialUpDan), MixBurner (the music player) and Display Properties. Tuko the gecko lives on the desktop. There's a locked folder, and he knows the password.

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
src/wrc-1988/
src/sizzle-sand/
src/kaiju-rampage/
src/burn-studio/
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


## Station 7 walkthrough (spoilers)

<details><summary>Only open this if you are properly stuck. Tuko's Case Notes have gentler hints.</summary>

1. Read `C:\STATION7\READ ME MIGS.txt` and `diary.txt`. Five words ("lights") open `JAR.EXE`.
2. **Light 1:** Recycle Bin, restore `not important.txt`, open it. NINGNING.
3. **Light 2:** Command Prompt: `cd station7`, `dir /a`, `lantern`, answer `extend`. KISLAP.
4. **Light 3:** open `night.bmp` in Paint, Fill bucket with any bright colour on the sky. LIWANAG.
5. **Light 4:** set the clock to 1996, open `www.alitaptap.net` in Torch. SINAG.
6. **Light 5:** open `our song.bsg`; the four notes in Burn Studio are B, A, G, A. BAGA.
7. Type all five into `JAR.EXE`, read the letter, catch all seven fireflies. The last is PANGAKO.
8. Set the clock to the current year, open `www.alitaptap.net`, and tell her the last firefly's name.

</details>
