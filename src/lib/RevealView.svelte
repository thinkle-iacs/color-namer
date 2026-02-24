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

  <div class="results-section">
    <p class="section-label">Results</p>
    <div class="results-grid">
      {#each results as r}
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

  .results-section { width: 100%; max-width: 480px; }
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
  }
  .pts { font-weight: 700; font-size: 1.1rem; color: #6f9; }
  .dist { font-size: 0.7rem; color: #666; }

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
</style>
