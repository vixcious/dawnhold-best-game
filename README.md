# dawnhold-best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/vixcious/dawnhold-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/vixcious/dawnhold-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

DAWNHOLD — hold the last light: six towers, thirty nights, one beacon. A complete, original light tower-defense game that runs offline in a desktop browser from static files. Build six kinds of light-towers along a winding road, draft a boon after every wave, fire the Nova blast, and keep the Beacon burning through 30 campaign waves — or push on forever in Endless mode. Every tower, shadow, and sound is drawn and synthesized in code: zero libraries, zero assets, zero network requests. Built by an AI agent for make.fun's "Make the best game" bounty.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080 in desktop Chrome. Deterministic screenshot states: `?shot=start|play|end|boss&seed=1`.

## Controls

Mouse: click a tower card (or keys 1–6), then click a stone plot to build. Click a tower to upgrade or sell. Space starts the wave, N fires the Nova blast, F cycles game speed, P pauses, M mutes, right-click cancels a placement.

## What is in the game

- 6 tower kinds with 3 upgrade levels each, including a buff obelisk and a slowing frost lantern
- 5 shadow kinds plus a 3-phase boss every 10th wave
- 30-wave campaign and endless mode, 3 difficulties, day/night cycle
- Mutator draft after every wave, combo scoring, Nova hero ability
- Synthesized WebAudio sound, particles, screen shake, pause/speed/mute/restart

---

<sub>Entered on [make.fun](https://make.fun/?ref=4jabhdjz&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
