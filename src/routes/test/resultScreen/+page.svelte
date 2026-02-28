<script lang="ts">
  import RevealView from "$lib/RevealView.svelte";
  import ColorPicker from "$lib/ColorPicker.svelte";
  import { isInDisplayP3, labToRgb } from "$lib/labToRgb";
  import type { GameDoc, Color } from "$lib/types";

  const PLAYERS = {
    "player-1": { name: "Alice", score: 42, avatarColor: "hsl(0, 70%, 50%)", order: 0 },
    "player-2": { name: "Bob",   score: 31, avatarColor: "hsl(138, 68%, 50%)", order: 1 },
    "player-3": { name: "Carol", score: 58, avatarColor: "hsl(275, 72%, 50%)", order: 2 },
    "player-4": { name: "David", score: 29, avatarColor: "hsl(315, 40%, 30%)", order: 3 },
    "player-5": { name: "Eve",   score: 0,  avatarColor: "hsl(60, 70%, 50%)",  order: 4 },
  } as const;
  const PLAYER_ORDER = ["player-1", "player-2", "player-3", "player-4", "player-5"];
  const GUESSER_IDS = ["player-2", "player-3", "player-4", "player-5"];

  function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function colorStyle(c: Color): string {
    const rgb = labToRgb(c.lightness, c.a, c.b);
    return `background:rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  function randomGuessNear(tgt: Color): Color {
    // Try up to 8 random directions before falling back
    for (let attempt = 0; attempt < 8; attempt++) {
      const θ = Math.random() * Math.PI * 2;
      const φ = Math.acos(2 * Math.random() - 1);
      const dL = Math.cos(φ);
      const da = Math.sin(φ) * Math.cos(θ);
      const db = Math.sin(φ) * Math.sin(θ);
      const mag = 5 + Math.random() * 45;
      for (let scale = mag; scale > 2; scale *= 0.8) {
        const L = clamp(Math.round(tgt.lightness + dL * scale), 1, 99);
        const a = Math.round(tgt.a + da * scale);
        const b = Math.round(tgt.b + db * scale);
        if (isInDisplayP3(L, a, b)) return { lightness: L, a, b };
      }
    }
    // All random directions failed (color is at gamut edge) — nudge toward neutral
    const offset = 10 + Math.random() * 20;
    const L = clamp(Math.round(tgt.lightness + (Math.random() - 0.5) * offset), 1, 99);
    const a = Math.round(tgt.a * 0.5);
    const b = Math.round(tgt.b * 0.5);
    return { lightness: L, a, b };
  }

  let target = $state<Color>({ lightness: 55, a: 15, b: -35 });
  let guesses = $state<Record<string, Color>>({
    "player-2": { lightness: 52, a: 10, b: -28 },
    "player-3": { lightness: 60, a: 22, b: -42 },
    "player-4": { lightness: 45, a: 25, b: -8 },
    "player-5": { lightness: 80, a: 18, b: 40 },
  });

  let game = $derived<GameDoc>({
    status: "reveal",
    hostId: "player-1",
    difficulty: "medium",
    pickerIndex: 0,
    roundNumber: 2,
    createdAt: Date.now(),
    roundSeed: 123456,
    playerOrder: PLAYER_ORDER,
    players: PLAYERS,
    roundClue: "stormy lavender",
    roundPickedColor: { ...target },
    roundTarget: { ...target },
    roundGuesses: { ...guesses },
  });

  type POV = "guesser" | "picker";
  let pov = $state<POV>("guesser");
  let viewAs = $derived(pov === "picker" ? "player-1" : "player-2");
  let amPicker = $derived(viewAs === game.playerOrder[game.pickerIndex]);

  let roundAdvanced = $state(false);
  let showPicker = $state(false);
  let showManual = $state(false);

  function randomizeGuesses() {
    for (const id of GUESSER_IDS) {
      guesses[id] = randomGuessNear(target);
    }
  }

  function handleTargetPick(c: Color) {
    target = c;
    showPicker = false;
  }

  function updateGuess(id: string, field: keyof Color, raw: string) {
    const v = parseInt(raw, 10);
    if (isNaN(v)) return;
    const cur = guesses[id] ?? { ...target };
    const clamped =
      field === "lightness" ? clamp(v, 1, 99) : clamp(v, -128, 128);
    guesses[id] = { ...cur, [field]: clamped };
  }
</script>

<svelte:head><title>Test: Result Screen</title></svelte:head>

<div class="test-page">
  <!-- ── Top bar ── -->
  <div class="test-controls">
    <h2>RevealView test</h2>
    <div class="control-row">
      <span>View as:</span>
      <button class:active={pov === "guesser"} onclick={() => (pov = "guesser")}
        >Guesser (Bob)</button
      >
      <button class:active={pov === "picker"} onclick={() => (pov = "picker")}
        >Picker (Alice)</button
      >
    </div>
    <div class="links">
      <a href="/test/colorPicker">ColorPicker</a> ·
      <a href="/test/colorPicker/1">Picker states</a>
    </div>
    {#if roundAdvanced}
      <div class="advanced-msg">▶ Next round triggered!</div>
    {/if}
  </div>

  <!-- ── Color / guess controls ── -->
  <div class="color-controls">
    <div class="cc-row">
      <span class="cc-label">Target:</span>
      <div class="mini-swatch" style={colorStyle(target)}></div>
      <span class="cc-value">L {target.lightness} a {target.a} b {target.b}</span>
      <button class="cc-btn" onclick={() => { showPicker = !showPicker; }}>
        {showPicker ? "✕ Close" : "Pick…"}
      </button>
    </div>

    {#if showPicker}
      <div class="picker-wrap">
        <ColorPicker onconfirm={handleTargetPick} />
      </div>
    {/if}

    <div class="cc-row">
      <span class="cc-label">Guesses:</span>
      <button class="cc-btn" onclick={randomizeGuesses}>🎲 Randomize</button>
      <button class="cc-btn" onclick={() => (showManual = !showManual)}>
        {showManual ? "Hide editor" : "Edit manually"}
      </button>
    </div>

    {#if showManual}
      <table class="guess-editor">
        <thead>
          <tr>
            <th></th>
            <th>Player</th>
            <th>L (1–99)</th>
            <th>a (−128–128)</th>
            <th>b (−128–128)</th>
          </tr>
        </thead>
        <tbody>
          {#each GUESSER_IDS as id}
            {@const g = guesses[id]}
            <tr>
              <td><div class="mini-swatch" style={g ? colorStyle(g) : ""}></div></td>
              <td class="player-name">{PLAYERS[id as keyof typeof PLAYERS].name}</td>
              <td>
                <input
                  type="number" min="1" max="99" step="1"
                  value={g?.lightness ?? 50}
                  oninput={(e) => updateGuess(id, "lightness", e.currentTarget.value)}
                />
              </td>
              <td>
                <input
                  type="number" min="-128" max="128" step="1"
                  value={g?.a ?? 0}
                  oninput={(e) => updateGuess(id, "a", e.currentTarget.value)}
                />
              </td>
              <td>
                <input
                  type="number" min="-128" max="128" step="1"
                  value={g?.b ?? 0}
                  oninput={(e) => updateGuess(id, "b", e.currentTarget.value)}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <RevealView
    game={game}
    gameId="TEST01"
    playerId={viewAs}
    {amPicker}
    onNextRound={() => (roundAdvanced = true)}
  />
</div>

<style>
  .test-page {
    min-height: 100vh;
    background: #111;
    color: #eee;
    font-family: sans-serif;
    display: flex;
    flex-direction: column;
  }

  /* ── top bar ── */
  .test-controls {
    padding: 0.8rem 1.5rem;
    background: #0d0d0d;
    border-bottom: 1px solid #222;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    flex-wrap: wrap;
  }
  .test-controls h2 {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
  }
  .control-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  .control-row span {
    color: #888;
  }
  .control-row button {
    padding: 0.2em 0.7em;
    border-radius: 5px;
    border: 1px solid #444;
    background: transparent;
    color: #888;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .control-row button.active {
    background: #333;
    color: #fff;
    border-color: #666;
  }
  .links {
    font-size: 0.8rem;
    color: #666;
  }
  .links a {
    color: #6af;
  }
  .advanced-msg {
    font-size: 0.8rem;
    color: #6f9;
  }

  /* ── color controls ── */
  .color-controls {
    padding: 0.6rem 1.5rem;
    background: #0f0f0f;
    border-bottom: 1px solid #222;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .cc-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .cc-label {
    font-size: 0.78rem;
    color: #777;
    min-width: 4.5rem;
  }
  .cc-value {
    font-size: 0.75rem;
    color: #999;
    font-variant-numeric: tabular-nums;
  }
  .cc-btn {
    padding: 0.2em 0.65em;
    border-radius: 5px;
    border: 1px solid #444;
    background: #1c1c1c;
    color: #bbb;
    cursor: pointer;
    font-size: 0.78rem;
  }
  .cc-btn:hover { background: #272727; border-color: #666; }

  .mini-swatch {
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 4px;
    border: 1px solid #555;
    flex-shrink: 0;
  }

  /* ── target color picker ── */
  .picker-wrap {
    width: 100%;
    max-width: 480px;
    background: #161616;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    padding: 0.75rem;
  }

  /* ── manual guess editor ── */
  .guess-editor {
    border-collapse: collapse;
    font-size: 0.76rem;
    color: #ccc;
    margin-top: 0.25rem;
  }
  .guess-editor th {
    text-align: left;
    padding: 0.2rem 0.5rem;
    color: #666;
    font-weight: normal;
    border-bottom: 1px solid #2a2a2a;
  }
  .guess-editor td {
    padding: 0.25rem 0.5rem;
    vertical-align: middle;
  }
  .player-name {
    color: #aaa;
    min-width: 4rem;
  }
  .guess-editor input[type="number"] {
    width: 4rem;
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    color: #ddd;
    border-radius: 4px;
    padding: 0.2em 0.35em;
    font-size: 0.76rem;
    font-variant-numeric: tabular-nums;
  }
  .guess-editor input[type="number"]:focus {
    outline: none;
    border-color: #77b6ff;
  }
</style>
