# Pixel Rumble

A playable single-screen pixel-art auto-battler. Eight autonomous fighters, five arenas, nine round rules, spectator predictions, and a fictional event-driven token market. No real money, payments, wallets, blockchain, deposits, or withdrawals. No external runtime services.

## Run

```sh
npm install
npm run dev
npm run build
npm test
```

Vite prints the local URL. `npm run preview` serves the production build. Browser checks use `npx playwright test`; point `baseURL` in `playwright.config.ts` at your running server and set `executablePath` to your installed Chromium (or remove it to use Playwright's installed browser).

## Rules

Each round is 22 seconds of open predictions, a 3-second lock/countdown, up to 58 seconds of combat, an 8-second result reveal, and 4 seconds of reconstruction. Speed controls affect the simulation and phase timers. Closing or hiding the tab pauses the local game; reload starts a new open round and refunds any unsettled prediction exactly once.

Most round eliminations wins; total damage, then health, breaks a tie. Standard rounds resurrect defeated fighters after 5 seconds, with brief spawn protection. No-respawn rounds favor the remaining survivor. Every completed round earns 150 fictional spectator credits.

Prediction stakes are deducted immediately. A winning prediction returns `stake × quoted decimal odds`, including the stake. A losing prediction returns zero. One prediction per round, from RC 50 to RC 5,000. The UI displays the full return before commitment. Odds are frozen when accepted and remain separate from combat RNG.

Boss invasions give fighters one life to cooperate against the Overlord. The boss wins if still alive at the deadline or if all fighters die; fighters win by defeating it. Individual predictions can choose top damage, longest survival, or the top fighter (boss damage rank). Survival ties break on health. No user controls fighter movement.

Special rounds cycle through Standard Rumble, Double Rewards, Underdog Bonus, Token Surge, Boss Invasion, Sudden Death, Token Crash, Chaos Mode, and No Respawn. Arenas rotate every two rounds. Underdog Bonus applies to base odds of at least 8×. Tokens are display-only simulated assets; no trading or external economy exists.

## Architecture and balancing

- `src/config/game.ts`: fighters, classes, weapons, arena traits, phase timing, stakes, odds, rewards, respawn rules, volatility, particles, and default audio settings.
- `src/game/engine.ts`: renderer-independent simulation, class AI, hazards, boss combat, round state machine, statistics, market event updates, and effect events. Accepts an RNG and persistence adapter for deterministic checks. Publishes immutable UI snapshots five times per second; positions remain in the simulation.
- `src/game/renderer.ts`: lazy-loaded PixiJS renderer, texture atlas, depth sorting, pooled particles/damage labels/projectiles, hazards, rain, adaptive effect density, GSAP reconstruction and announcements. Rendering and combat pause in hidden tabs; resources and event handlers are cleaned up on unmount.
- `src/game/sprites.ts`: original native pixel character designs, shared between sprite atlas and profile avatars.
- `src/game/audio.ts`: lazy Web Audio synthesis with independent music/effects/master controls. Muted by default; never starts before a user gesture.
- `src/economy/`: quoted odds, validation, idempotent settlement, and a replaceable `PersistenceAdapter`. Local storage holds credits, activity, predictions, achievements, discoveries, and settings. Completed fighter match stats and market history are session-local; the initial fictional backstory provides historical form on a fresh session.
- `src/components/`: React spectator UI, native accessible dialogs, Motion interactions. `src/styles.css` uses CSS layers and responsive layouts; mobile switches between prediction and fighter panels below the arena.

The simulation is intentionally local and spectator-only. A future backend must own simulation and credit accounting if multiple spectators need to share one authoritative arena; browser storage is not a secure ledger.

## Verification

`npm test` checks complete rounds, non-finite/invalid wagers, credit conservation, exactly-once settlement and interrupted-round refunds, odds locks, all nine events, boss predictions, arena rotation, reconstruction, and corrupted storage recovery. `tests/browser.spec.ts` covers desktop and mobile selection, predictions, profiles, settings, market, full-round settlement, reload behavior, browser errors, and horizontal overflow.

## Artwork

`public/images/neon-district.png` is an original backdrop generated with the built-in Imagegen tool. Final prompt: “Detailed 16-bit pixel-art rainy midnight cyberpunk city rooftop fight arena; no fighters, text UI or HUD; broad open tiled rooftop, indigo skyline, lavender moon, cyan and fuchsia edge lighting, atmospheric reflections, crisp square pixels, spacious low-contrast combat floor.” Other arenas and all fighter sprites are rendered from native game geometry and the shared sprite atlas.

PixiJS integration follows the [official v8 Application documentation](https://pixijs.com/8.x/guides/components/application).
