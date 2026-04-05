# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Livia Game (mobile)
- **Type**: Expo mobile app
- **Path**: `artifacts/mobile/`
- **Preview**: `/`
- Side-scrolling platformer "Livia e il Regno Incantato" (Italian)
- Character Livia: runs, jumps, collects donuts, stomps enemies
- Built with React Native WebView embedding a full HTML5 Canvas game
- Game HTML embedded as TS module in `artifacts/mobile/assets/game-html.ts` (~11.7 MB)
- Web fallback via `<iframe>` for browser preview
- **Working temp file**: `/tmp/current_game.html` — always read/write this, then regenerate the TS module

### API Server
- **Type**: Express API
- **Path**: `artifacts/api-server/`
- **Preview**: `/api`

---

## Game Engine — Technical Reference

### Architecture
- Single self-contained HTML file; all assets (images, audio) are **base64 data-URLs** embedded inline
- JS helpers must be inside `<script>` — never before `<html>` (causes visible text bug)
- Canvas size: `W × H` (landscape); scale factors `SX, SY` map game coords → CSS pixels
- **CRITICAL string replacement rule**: never use `indexOf('";')` on data URLs. Always match exact surrounding code context (5-10 lines) for replacements.

### Regenerating game-html.ts
```js
const html = fs.readFileSync('/tmp/current_game.html', 'utf8');
const ts = '// Auto-generated game HTML\nconst GAME_HTML: string = ' + JSON.stringify(html) + ';\nexport default GAME_HTML;\n';
fs.writeFileSync('artifacts/mobile/assets/game-html.ts', ts);
```

### Level Flow
- **Level 1** (rainbow kingdom, broccoli enemies): rect-based collision
- **Level 2** (forest, wolf enemies): pixel-perfect terrain collision via PNG collision map
- **End L1** → `showLevelComplete()` → overlay with "▶ Continua" (starts L2) and "🏠 Menu"
- **End L2** → `showEndScreen('win', {donuts, score})` → final win screen
- **Death** → `showEndScreen('dead')` → "🔄 Riprova" (same level) and "🏠 Menu"

### Player Constants
- `PW`, `PH`: player width/height in game units
- `MAX` speed (vx), `ACC` acceleration, `FRIC` friction (0.80 on release)
- `pl.inv`: invincibility frames after being hurt (130 frames)
- `pl.facing`: -1 left, +1 right
- `pl.onGround`: true when feet on terrain

### L1 Collision (Rectangle-based)
- Ground snap: `prevFeet <= p.y+2 && currFeet >= p.y` → `pl.y = p.y - pl.h`
- Ceiling: `pl.y < p.y+p.h` after upward move
- Side walls: `p.h > 40 && pl.y+pl.h > p.y+6` → push back 18px window
- No auto-climb issues because platforms are discrete rectangles

### L2 Collision (Pixel-perfect — the hard-won solution)
Physics runs in this exact order every frame:
```
pl.vy += 0.6 (gravity, capped at 18)
const wasOnGround = pl.onGround
pl.x += pl.vx; pl.y += pl.vy; pl.onGround = false
```
Then four steps:

**STEP 1 — Step-up block (comparative)**
- `cx_old = round(pl.x - pl.vx + PW/2)` — center BEFORE this frame's horizontal move
- `cx_new = round(pl.x + PW/2)` — center AFTER move
- `feetY = round(pl.y + PH)` — feet after gravity applied
- Find terrain surface top at both centers (scan upward from feetY)
- If `surf_new < surf_old - 12` → terrain rose more than 12px → undo: `pl.x -= pl.vx; pl.vx = 0`
- **Tolerance 12px**: allows climbing rocks/small steps (≤12px); blocks walls (>12px)
- Guard: `wasOnGround && pl.vy >= 0 && abs(pl.vx) > 0`

**STEP 2 — Ground snap**
- At `cx2 = round(pl.x + PW/2)`: if `isForestSolid(cx2, feetY)` → scan up to find surface top → `pl.y = top - PH; pl.vy = 0; pl.onGround = true`

**STEP 3 — Ceiling**
- If `pl.vy < 0` and `isForestSolid(cx2, round(pl.y))` → scan down to find ceiling bottom → push player down, `pl.vy = 0`

**STEP 4 — Wall check (always active, even on ground)**
- Check points: `wty = pl.y + PH*0.25` (upper body), `wmy = pl.y + PH*0.55` (mid body)
- Edge points: `rx2 = pl.x + PW - 4`, `lx2 = pl.x + 4`
- Block only if **BOTH** wty AND wmy are solid at the leading edge (avoids grass-tip false blocks)
- On block: `pl.x -= pl.vx; pl.vx = 0` (full undo)

**`isForestSolid(px, py)`**
- Alpha threshold: **128** (eliminates anti-aliasing noise)
- Guard: `if(py < 50 || py >= H) return false`
- Maps game coords → PNG pixel coords via `forestColl` (Uint8ClampedArray, width×height)
- Built lazily on first L2 frame: `buildForestColl()` draws PNG to offscreen canvas, reads pixel data
- Console log: `forestColl: 6643x410` confirms successful build

**Death trigger**
- `pl.y + PH >= H` (feet reach screen bottom) → `hurt()` then teleport to nearest safe platform

### Wolf Enemy (L2) — Full System

**Sprite sheet**: `lupi_nemici_Trasp_*.png` embedded as base64 in `wolfImg`

**WF frame map**:
```js
const WF = {
  FW: 160, FH: 285,
  walk:   [{x:0,y:0},{x:160,y:0},{x:320,y:0},{x:480,y:0}],  // 4 frames
  attack: [{x:160,y:285},{x:320,y:285}],                      // 2 frames
  angry:  [{x:0,y:285}],                                       // 1 frame
  dead:   [{x:480,y:570}]                                      // 1 frame
};
```

**Wolf state machine**: `walk` → `attack` (on player contact) → back to `walk` after hitTimer; `dead` (stomped from above)

**Wolf update loop (each frame)**:
1. If `e.state === 'dead'`: advance frame, remove after 55 frames
2. If `e.hitTimer > 0`: **skip all movement**, just `e.frame++` then `continue` — prevents glitch during attack animation
3. Lazy-init (`e.L2init`): scan downward from `e.y` to find actual terrain surface; remove wolf if no terrain found
4. Terrain snap: scan from `efy` DOWN up to 15px to find surface → snap `e.y` (handles floating wolves above rocks)
5. Lookahead movement: compute `nextX = e.x + e.vx`; check `isForestSolid(lookX, lookY)` in range `[efy-5, efy+20]`; move only if solid AND within patrol bounds; else reverse `e.vx *= -1`

**Wolf spawn data**: `RAW_PLATS_L2` array; wolf placed at `e.y = p.y - PH` (adjusted by lazy-init snap)
**Wolf patrol**: `e.sx` (start x) and `e.range` (width); reverses at bounds

**Player-enemy collision**:
- Stomp (jump from above, `pl.vy > 0 && pl.y+pl.h < e.y+e.h*0.4+12`): `e.state='dead'; e.frame=0; pl.vy=-13; score+=50`
- Touch from side: `e.state='attack'; e.frame=0; e.hitTimer=40; hurt()`
- hitTimer decrement: `if(e.hitTimer>0){e.hitTimer--; if(e.hitTimer===0) e.state='walk';}`

### Adding a New Level (Template)

1. Add a new branch in `buildPlatforms()` for `currentLevel === N`
2. If pixel-perfect terrain: embed PNG as base64, build collision map like `buildForestColl()`
3. In `initGame(level)`: set up platforms, donuts, enemies, start position, music
4. Goal detection: detect reaching goal → `showLevelComplete()` (not `showEndScreen`)
5. For the last level: goal → `showEndScreen('win', {donuts, score})`
6. Add wolf-equivalent enemy with same state machine (walk/attack/dead + hitTimer freeze)
7. Draw function: handle dead/attack/walk states; use `ctx.scale(-1,1)` flip for direction
8. For pixel terrain: reuse `isForestSolid` pattern with new collision map variable

### Known Gotchas for Future Levels
- **`pl.x--` bug**: never use ±1 to undo movement; always use `pl.x -= pl.vx` (full undo)
- **`!pl.onGround` wall check**: wall check must run always, not just in air
- **Attack glitch**: always freeze enemy movement during hitTimer (use `e.frame++; continue`)
- **Wolf floating**: terrain snap must scan DOWNWARD (not just check current feet) to catch floating above rocks
- **Double-flip oscillation**: check terrain BEFORE moving (lookahead), not after — prevents reversing direction twice in same frame
- **Grass noise**: step-up tolerance must be ≥3px; wall check must require BOTH body points solid

---

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
