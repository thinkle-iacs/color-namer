<script lang="ts">
  import { labToRgb, rgbToHsl } from './labToRgb';
  import { computeResults, pickerScore } from './game';
  import type { Color, GameDoc } from './types';

  const { game, gameId, playerId, amPicker, onNextRound } = $props<{
    game: GameDoc;
    gameId: string;
    playerId: string;
    amPicker: boolean;
    onNextRound: () => void;
  }>();

  let target = $derived(game.roundTarget!);
  let targetRgb = $derived(labToRgb(target.lightness, target.a, target.b));
  let results = $derived(computeResults(game));

  let pickerPlayerId = $derived(game.playerOrder[game.pickerIndex]);
  let pickerPts = $derived(pickerScore(results.map((r) => r.pointsEarned)));

  const LAB_LIMIT_A = 110;
  const LAB_LIMIT_B = 110;
  const MAX_DISPLAY_DISTANCE = 120;
  const BASE_WORLD_SCALE = 1.35;
  const CAMERA_Z = 4;
  const FOCAL_LENGTH = 165;
  const DRAG_SENSITIVITY = 0.008;
  const MIN_ZOOM = 0.7;
  const MAX_ZOOM = 6;
  const ZOOM_STEP = 0.35;

  type Vec3 = {
    x: number;
    y: number;
    z: number;
  };

  type SpacePoint = {
    sx: number;
    sy: number;
  };

  type EdgeRender = {
    id: string;
    from: SpacePoint;
    to: SpacePoint;
    fromColor: string;
    toColor: string;
  };

  let yaw = $state(0.5);
  let pitch = $state(0.55);
  let roll = $state(0);
  let zoom = $state(1.3);
  let dragging = $state(false);
  let activePointerId = $state<number | null>(null);
  let lastPointerX = $state(0);
  let lastPointerY = $state(0);
  let spacePlotEl = $state<SVGSVGElement | null>(null);

  function clamp(v: number, min: number, max: number): number {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function onPlotPointerDown(e: PointerEvent): void {
    if (!e.isPrimary) return;
    dragging = true;
    activePointerId = e.pointerId;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    spacePlotEl?.setPointerCapture(e.pointerId);
  }

  function onPlotPointerMove(e: PointerEvent): void {
    if (!dragging || e.pointerId !== activePointerId) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    yaw += dx * DRAG_SENSITIVITY;
    pitch = clamp(pitch - dy * DRAG_SENSITIVITY, -1.25, 1.25);
  }

  function onPlotPointerUp(e: PointerEvent): void {
    if (e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    spacePlotEl?.releasePointerCapture(e.pointerId);
  }

  function onPlotPointerCancel(): void {
    dragging = false;
    activePointerId = null;
  }

  function zoomIn(): void {
    zoom = clamp(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
  }

  function zoomOut(): void {
    zoom = clamp(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
  }

  function resetView(): void {
    yaw = 0.5;
    pitch = 0.55;
    zoom = 1.3;
  }

  function rotatePoint(point: Vec3): Vec3 {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = Math.cos(pitch);
    const sx = Math.sin(pitch);
    const cz = Math.cos(roll);
    const sz = Math.sin(roll);

    const yawX = point.x * cy + point.z * sy;
    const yawZ = -point.x * sy + point.z * cy;
    const yawY = point.y;

    const pitchY = yawY * cx - yawZ * sx;
    const pitchZ = yawY * sx + yawZ * cx;

    return {
      x: yawX * cz - pitchY * sz,
      y: yawX * sz + pitchY * cz,
      z: pitchZ,
    };
  }

  function projectPoint(point: Vec3): SpacePoint {
    const rotated = rotatePoint(point);
    const perspective = FOCAL_LENGTH / (CAMERA_Z - rotated.z);
    const worldScale = BASE_WORLD_SCALE * zoom;
    return {
      sx: 160 + rotated.x * worldScale * perspective,
      sy: 140 - rotated.y * worldScale * perspective,
    };
  }

  function labToVec(c: Color): Vec3 {
    return {
      x: clamp(c.a / LAB_LIMIT_A, -1, 1),
      y: clamp((c.lightness - 50) / 50, -1, 1),
      z: clamp(c.b / LAB_LIMIT_B, -1, 1),
    };
  }

  function vecToLab(point: Vec3): Color {
    return {
      lightness: Math.round(clamp(((point.y + 1) / 2) * 100, 0, 100)),
      a: Math.round(clamp(point.x * LAB_LIMIT_A, -LAB_LIMIT_A, LAB_LIMIT_A)),
      b: Math.round(clamp(point.z * LAB_LIMIT_B, -LAB_LIMIT_B, LAB_LIMIT_B)),
    };
  }

  function vecRgb(point: Vec3): string {
    const lab = vecToLab(point);
    return `rgb(${labToRgb(lab.lightness, lab.a, lab.b).join(',')})`;
  }

  const cubeVertices: Vec3[] = [
    { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
  ];

  const cubeEdges: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  let cubeRenderEdges = $derived(
    cubeEdges.map(([from, to], idx): EdgeRender => ({
      id: `edge-${idx}`,
      from: projectPoint(cubeVertices[from]),
      to: projectPoint(cubeVertices[to]),
      fromColor: vecRgb(cubeVertices[from]),
      toColor: vecRgb(cubeVertices[to]),
    }))
  );
  let cubeProjected = $derived(cubeVertices.map((v) => projectPoint(v)));

  let targetPoint = $derived(projectPoint(labToVec(target)));
  let resultRows = $derived(
    results.map((r) => ({
      ...r,
      plot: projectPoint(labToVec(r.guessedColor)),
      distancePct: Math.min(100, (r.distance / MAX_DISPLAY_DISTANCE) * 100),
    }))
  );
  let plotCenter = $derived.by(() => {
    const points = [targetPoint, ...resultRows.map((r) => r.plot)];
    if (points.length === 0) return { x: 160, y: 140 };
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.sx, y: acc.y + p.sy }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  });

  type ColorMode = 'lab' | 'rgb' | 'hsl';
  let colorMode = $state<ColorMode>('lab');

  function colorLabel(c: Color): string {
    const [r, g, b] = labToRgb(c.lightness, c.a, c.b);
    if (colorMode === 'lab') return `L ${c.lightness}  a ${c.a}  b ${c.b}`;
    if (colorMode === 'rgb') return `${r}, ${g}, ${b}`;
    const [h, s, l] = rgbToHsl(r, g, b);
    return `${h}°  ${s}%  ${l}%`;
  }

  function colorLabelHeader(): string {
    if (colorMode === 'lab') return 'L / a / b';
    if (colorMode === 'rgb') return 'R / G / B';
    return 'H / S / L';
  }

  function rgbCss(c: Color): string {
    return labToRgb(c.lightness, c.a, c.b).join(',');
  }

  function distanceGradientId(playerId: string): string {
    const safePlayerId = playerId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `dist-grad-${game.roundNumber}-${safePlayerId}`;
  }

  function textOn(lightness: number) {
    return lightness < 50 ? 'white' : 'black';
  }
</script>

<div class="reveal">
  <div class="header">
    <span class="round-label">Round {game.roundNumber} — Reveal</span>
    <h2 class="clue">"{game.roundClue}"</h2>
  </div>

  <div class="target-section">
    <p class="section-label">The target color</p>
    <div
      class="target-swatch"
      style="background: rgb({targetRgb.join(',')});
             color: {textOn(target.lightness)};"
    >
      <span class="color-val-label">{colorLabel(target)}</span>
    </div>
  </div>

  <div class="mode-toggle">
    {#each (['lab', 'rgb', 'hsl'] as const) as m}
      <button
        class="mode-btn"
        class:active={colorMode === m}
        onclick={() => colorMode = m}
      >{m.toUpperCase()}</button>
    {/each}
    <span class="mode-hint">{colorLabelHeader()}</span>
  </div>

  <div class="space-section">
    <p class="section-label">Color Distance Map</p>
    <div class="space-card">
      <div class="space-toolbar">
        <span class="zoom-label">Zoom {zoom.toFixed(1)}x</span>
        <div class="zoom-controls">
          <button class="zoom-btn" onclick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
          <button class="zoom-btn reset-btn" onclick={resetView}>Reset</button>
          <button class="zoom-btn" onclick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
        </div>
      </div>
      <svg
        class="space-plot"
        class:dragging
        viewBox="0 0 320 280"
        role="img"
        aria-label="Three-dimensional LAB color map showing the target color and each guess"
        bind:this={spacePlotEl}
        onpointerdown={onPlotPointerDown}
        onpointermove={onPlotPointerMove}
        onpointerup={onPlotPointerUp}
        onpointercancel={onPlotPointerCancel}
      >
        <g transform="translate({160 - plotCenter.x} {140 - plotCenter.y})">
          <defs>
            {#each cubeRenderEdges as edge}
              <linearGradient
                id={edge.id}
                gradientUnits="userSpaceOnUse"
                x1={edge.from.sx}
                y1={edge.from.sy}
                x2={edge.to.sx}
                y2={edge.to.sy}
              >
                <stop offset="0%" stop-color={edge.fromColor}></stop>
                <stop offset="100%" stop-color={edge.toColor}></stop>
              </linearGradient>
            {/each}

            {#each resultRows as r}
              <linearGradient
                id={distanceGradientId(r.playerId)}
                gradientUnits="userSpaceOnUse"
                x1={targetPoint.sx}
                y1={targetPoint.sy}
                x2={r.plot.sx}
                y2={r.plot.sy}
              >
                <stop offset="0%" stop-color={`rgb(${targetRgb.join(',')})`}></stop>
                <stop offset="100%" stop-color={`rgb(${rgbCss(r.guessedColor)})`}></stop>
              </linearGradient>
            {/each}
          </defs>

          {#each cubeRenderEdges as edge}
            <line
              class="cube-edge"
              x1={edge.from.sx}
              y1={edge.from.sy}
              x2={edge.to.sx}
              y2={edge.to.sy}
              stroke={`url(#${edge.id})`}
            />
          {/each}

          <line class="axis-guide axis-a" x1={cubeProjected[0].sx} y1={cubeProjected[0].sy} x2={cubeProjected[1].sx} y2={cubeProjected[1].sy} />
          <line class="axis-guide axis-b" x1={cubeProjected[0].sx} y1={cubeProjected[0].sy} x2={cubeProjected[4].sx} y2={cubeProjected[4].sy} />
          <line class="axis-guide axis-l" x1={cubeProjected[0].sx} y1={cubeProjected[0].sy} x2={cubeProjected[3].sx} y2={cubeProjected[3].sy} />

          {#each resultRows as r}
            <line
              class="distance-line"
              x1={targetPoint.sx}
              y1={targetPoint.sy}
              x2={r.plot.sx}
              y2={r.plot.sy}
              stroke={`url(#${distanceGradientId(r.playerId)})`}
            />
          {/each}

          {#each resultRows as r}
            <circle
              class="guess-point"
              cx={r.plot.sx}
              cy={r.plot.sy}
              r="6.5"
              style="fill: rgb({rgbCss(r.guessedColor)}); stroke: {r.avatarColor};"
            />
            <text class="point-label" x={r.plot.sx + 9} y={r.plot.sy - 8}>Δ{Math.round(r.distance)}</text>
          {/each}

          <circle
            class="target-point"
            cx={targetPoint.sx}
            cy={targetPoint.sy}
            r="8.5"
            style="fill: rgb({targetRgb.join(',')});"
          />
          <text class="target-label" x={targetPoint.sx + 11} y={targetPoint.sy + 4}>Target</text>

          <text class="axis-label axis-a" x={cubeProjected[1].sx + 6} y={cubeProjected[1].sy + 16}>a*</text>
          <text class="axis-label axis-b" x={cubeProjected[4].sx - 8} y={cubeProjected[4].sy + 16}>b*</text>
          <text class="axis-label axis-l" x={cubeProjected[3].sx - 6} y={cubeProjected[3].sy - 8}>L*</text>
        </g>
      </svg>
      <p class="space-note">Drag to rotate the LAB cube. Edge gradients show how color shifts through space.</p>
      <p class="space-note">Each player line is the LAB distance from a guess to the target.</p>
    </div>
  </div>

  <div class="results-section">
    <p class="section-label">Results</p>
    <div class="results-grid">
      {#each resultRows as r}
        <div class="result-card">
          <div class="result-swatch" style="background: rgb({rgbCss(r.guessedColor)}); color: {textOn(r.guessedColor.lightness)};"></div>
          <div class="result-info">
            <span class="player-dot" style="background: {r.avatarColor}"></span>
            <div class="result-name-block">
              <span class="player-name">{r.name}{r.playerId === playerId ? ' (you)' : ''}</span>
              <span class="color-val">{colorLabel(r.guessedColor)}</span>
            </div>
          </div>
          <div class="result-score">
            <span class="pts">+{r.pointsEarned}</span>
            <div class="dist-meter">
              <span style="width: {r.distancePct}%; background: {r.avatarColor};"></span>
            </div>
            <span class="dist">Δ {Math.round(r.distance)}</span>
          </div>
        </div>
      {/each}

      <!-- Picker row -->
      {#if game.players[pickerPlayerId]}
        <div class="result-card picker-row">
          <div class="result-swatch target-mini" style="background: rgb({targetRgb.join(',')});"></div>
          <div class="result-info">
            <span class="player-dot" style="background: {game.players[pickerPlayerId].avatarColor}"></span>
            <div class="result-name-block">
              <span class="player-name">
                {game.players[pickerPlayerId].name}{pickerPlayerId === playerId ? ' (you)' : ''}
                <em class="picker-tag">clue giver</em>
              </span>
              <span class="color-val">{colorLabel(target)}</span>
            </div>
          </div>
          <div class="result-score">
            <span class="pts">+{pickerPts}</span>
            <span class="dist">avg/2</span>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="scores-section">
    <p class="section-label">Scoreboard</p>
    <div class="score-list">
      {#each [...game.playerOrder].sort((a, b) => game.players[b].score - game.players[a].score) as id}
        {@const p = game.players[id]}
        <div class="score-row" class:is-me={id === playerId}>
          <span class="player-dot" style="background: {p.avatarColor}"></span>
          <span class="sname">{p.name}</span>
          <span class="stotal">{p.score} pts</span>
        </div>
      {/each}
    </div>
  </div>

  {#if amPicker}
    <button class="next-btn" onclick={onNextRound}>Next round →</button>
  {:else}
    <p class="waiting-next">Waiting for {game.players[pickerPlayerId]?.name ?? 'the host'} to start next round…</p>
  {/if}
</div>

<style>
  .reveal {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .header { text-align: center; }
  .round-label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
  .clue { font-size: 2rem; font-weight: 700; font-style: italic; margin: 0.3rem 0 0; }

  .section-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #666;
    margin: 0 0 0.5rem;
    text-align: center;
  }

  .target-section { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
  .target-swatch {
    width: 180px;
    height: 110px;
    border-radius: 14px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 8px;
  }
  .color-val-label { font-size: 0.65rem; opacity: 0.7; font-variant-numeric: tabular-nums; }

  .mode-toggle {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .mode-btn {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.25em 0.7em;
    border-radius: 5px;
    border: 1px solid #444;
    background: transparent;
    color: #888;
    cursor: pointer;
    letter-spacing: 0.05em;
    transition: background 0.1s, color 0.1s;
  }
  .mode-btn.active { background: #333; color: #fff; border-color: #666; }
  .mode-hint { font-size: 0.65rem; color: #555; margin-left: 0.4rem; }

  .space-section {
    width: 100%;
    max-width: 680px;
  }
  .space-card {
    border-radius: 12px;
    border: 1px solid #2a2a2a;
    background:
      radial-gradient(circle at 12% 18%, rgba(90, 180, 255, 0.12), transparent 32%),
      radial-gradient(circle at 85% 85%, rgba(255, 170, 70, 0.1), transparent 30%),
      #151515;
    padding: 0.8rem;
  }
  .space-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.55rem;
  }
  .zoom-label {
    font-size: 0.74rem;
    color: #8a8a8a;
    letter-spacing: 0.03em;
    font-variant-numeric: tabular-nums;
  }
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .zoom-btn {
    border: 1px solid #3b3b3b;
    background: #1f1f1f;
    color: #ddd;
    border-radius: 7px;
    font-size: 0.95rem;
    line-height: 1;
    min-width: 34px;
    height: 28px;
    padding: 0 0.55rem;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .zoom-btn:hover:not([disabled]) {
    background: #2a2a2a;
    border-color: #4f4f4f;
  }
  .zoom-btn[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .reset-btn {
    min-width: 54px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .space-plot {
    width: 100%;
    height: auto;
    display: block;
    touch-action: none;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
  }
  .space-plot.dragging { cursor: grabbing; }
  .space-plot * {
    user-select: none;
    -webkit-user-select: none;
  }
  .cube-edge {
    stroke-width: 1.2;
    opacity: 0.85;
  }
  .axis-guide {
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0.6;
  }
  .axis-guide.axis-a { stroke: #d87878; }
  .axis-guide.axis-b { stroke: #d7c374; }
  .axis-guide.axis-l { stroke: #82bfdb; }
  .distance-line {
    stroke-width: 1.8;
    opacity: 0.8;
  }
  .guess-point {
    stroke-width: 2.3;
  }
  .target-point {
    stroke: #fff;
    stroke-width: 2.8;
  }
  .point-label {
    fill: #a8a8a8;
    font-size: 10px;
    font-weight: 700;
    paint-order: stroke;
    stroke: #0f0f0f;
    stroke-width: 2px;
  }
  .target-label {
    fill: #fff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    paint-order: stroke;
    stroke: #0f0f0f;
    stroke-width: 2.2px;
  }
  .axis-label {
    fill: #777;
    font-size: 10px;
    letter-spacing: 0.04em;
  }
  .axis-a { fill: #b87777; }
  .axis-b { fill: #bfa56f; }
  .axis-l { fill: #8faebf; }
  .space-note {
    font-size: 0.72rem;
    color: #777;
    text-align: center;
    margin: 0.45rem 0 0;
  }

  .results-section { width: 100%; max-width: 560px; }
  .results-grid { display: flex; flex-direction: column; gap: 0.5rem; }

  .result-card {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    padding: 0.5rem 0.8rem;
  }
  .picker-row { border-color: #fa03; background: #1c1a13; }

  .result-swatch {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .target-mini { border: 2px solid #fa0; }

  .result-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    overflow: hidden;
    min-width: 0;
  }
  .player-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .result-name-block {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .player-name {
    font-size: 0.95rem;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .color-val {
    font-size: 0.65rem;
    color: #666;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .picker-tag { font-size: 0.65rem; color: #fa0; font-style: normal; margin-left: 0.3rem; }

  .result-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    gap: 0.18rem;
    min-width: 76px;
  }
  .pts { font-weight: 700; font-size: 1.1rem; color: #6f9; }
  .dist { font-size: 0.7rem; color: #666; }
  .dist-meter {
    width: 74px;
    height: 6px;
    border-radius: 999px;
    background: #242424;
    overflow: hidden;
  }
  .dist-meter span {
    display: block;
    height: 100%;
    border-radius: inherit;
  }

  /* Scores */
  .scores-section { width: 100%; max-width: 360px; }
  .score-list { display: flex; flex-direction: column; gap: 0.3rem; }
  .score-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.6rem;
    border-radius: 7px;
    font-size: 0.9rem;
  }
  .score-row.is-me { background: #1e2230; }
  .sname { flex: 1; color: #ccc; }
  .stotal { font-weight: 700; color: #fff; }

  /* Next */
  .next-btn {
    font-size: 1.2rem;
    padding: 0.7em 2.5em;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #6af, #a6f);
    color: #fff;
    font-weight: 700;
    transition: filter 0.15s;
    margin-top: 0.5rem;
  }
  .next-btn:hover { filter: brightness(1.15); }
  .waiting-next { color: #888; font-size: 0.9rem; margin: 0; }

  @media (max-width: 640px) {
    .clue { font-size: 1.5rem; }
    .space-card { padding: 0.55rem; }
    .space-toolbar { margin-bottom: 0.42rem; }
    .zoom-btn {
      min-width: 30px;
      height: 25px;
    }
    .reset-btn {
      min-width: 48px;
      font-size: 0.68rem;
    }
    .point-label { display: none; }
    .dist-meter { width: 58px; }
  }
</style>
