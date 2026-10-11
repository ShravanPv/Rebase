# REBASE

*Rewrite history. Ship your future.* — a black & white stickman time-loop game, by ShraSquad Productions.

You are Stix, a junior engineer in the AI era. Fail the day and your AI assistant ECHO rewinds time to 09:00.

## Run locally

No build step. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8770
```

Then open http://localhost:8770.

## Code map

| File | What it does |
|---|---|
| `index.html` | Stage canvas, text overlays, Three.js import map |
| `style.css` | Black & white look, letterbox, panels |
| `src/main.js` | Renderer, scene, cast, game loop |
| `src/anim.js` | Easing, tweens, camera director |
| `src/world.js` | Ink-outlined office, smashable props |
| `src/stickman.js` | Stickman rig, poses, scarf physics |
| `src/ui.js` | Dialogue, choices, puzzles, QTE, HUD, sound |
| `src/story.js` | Chapter 1 script, loop logic, scoring |

© 2026 ShraSquad Productions. All rights reserved. See `LICENSE`.
