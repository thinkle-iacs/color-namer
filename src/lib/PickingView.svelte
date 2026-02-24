<script lang="ts">
  import ColorPicker from './ColorPicker.svelte';
  import ColorDescriber from './ColorDescriber.svelte';
  import { labToRgb, generateColorOptions } from './labToRgb';
  import { submitClue } from './game';
  import type { Color, Difficulty } from './types';

  const { gameId, playerId, onColorPicked, pickedColor, difficulty, roundSeed } = $props<{
    gameId: string;
    playerId: string;
    onColorPicked: (color: Color) => void;
    pickedColor: Color | null;
    difficulty: Difficulty;
    roundSeed: number | null;
  }>();

  // For Easy/Medium: track whether we're in pick or clue step
  let step = $state<'pick' | 'clue'>('pick');
  let submitting = $state(false);

  // Hard mode: deterministically derive the single assigned color from the seed
  let hardColor = $derived(
    difficulty === 'hard' && roundSeed !== null
      ? generateColorOptions(roundSeed, 1)[0]
      : null
  );

  // Medium mode: derive 6 options from the seed
  let mediumOptions = $derived(
    difficulty === 'medium' && roundSeed !== null
      ? generateColorOptions(roundSeed, 6)
      : []
  );

  // Hard mode: auto-propagate the assigned color to the parent so reveal works
  $effect(() => {
    if (hardColor && !pickedColor) {
      onColorPicked(hardColor);
    }
  });

  async function handleClue(clue: string) {
    if (!pickedColor) return;
    submitting = true;
    await submitClue(gameId, clue);
    submitting = false;
  }

  function swatchRgb(c: Color): string {
    return labToRgb(c.lightness, c.a, c.b).join(',');
  }
</script>

<!-- ── HARD MODE ──────────────────────────────────────────────────────────── -->
{#if difficulty === 'hard'}
  <div class="picking">
    {#if hardColor}
      <div class="instructions">
        <h2>Your assigned color</h2>
        <p>No choice — give a clue for this color. Color names are off-limits!</p>
      </div>

      <div class="assigned-wrap">
        <div
          class="assigned-swatch"
          style="background: rgb({swatchRgb(hardColor)});"
        ></div>
      </div>

      <div class="describer-wrap">
        <ColorDescriber color={hardColor} ondescribe={handleClue} />
        {#if submitting}<p class="submitting">Sending clue…</p>{/if}
      </div>
    {:else}
      <p class="loading">Generating your color…</p>
    {/if}
  </div>

<!-- ── MEDIUM MODE ────────────────────────────────────────────────────────── -->
{:else if difficulty === 'medium'}
  <div class="picking">
    {#if step === 'pick'}
      <div class="instructions">
        <h2>Pick a color to clue</h2>
        <p>Choose one of these — then give a clue. Color names are off-limits!</p>
      </div>

      {#if mediumOptions.length > 0}
        <div class="swatch-grid">
          {#each mediumOptions as opt}
            <button
              class="swatch-btn"
              style="background: rgb({swatchRgb(opt)});"
              onclick={() => {
                onColorPicked(opt);
                step = 'clue';
              }}
            ></button>
          {/each}
        </div>
      {:else}
        <p class="loading">Generating color options…</p>
      {/if}

    {:else if pickedColor}
      <div class="clue-step">
        <div class="chosen-swatch-wrap">
          <p class="swatch-label">Your chosen color:</p>
          <div
            class="chosen-swatch"
            style="background: rgb({swatchRgb(pickedColor)});"
          ></div>
          <button class="reselect" onclick={() => (step = 'pick')}>
            ← Change color
          </button>
        </div>
        <div class="describer-wrap">
          <ColorDescriber color={pickedColor} ondescribe={handleClue} />
          {#if submitting}<p class="submitting">Sending clue…</p>{/if}
        </div>
      </div>
    {/if}
  </div>

<!-- ── EASY MODE (default) ────────────────────────────────────────────────── -->
{:else}
  <div class="picking">
    {#if step === 'pick'}
      <div class="instructions">
        <h2>Your turn to pick a color!</h2>
        <p>Choose any color — your clue can't mention any color names.</p>
      </div>
      <ColorPicker
        onconfirm={(color) => {
          onColorPicked(color);
          step = 'clue';
        }}
      />
    {:else if pickedColor}
      <div class="clue-step">
        <div class="chosen-swatch-wrap">
          <p class="swatch-label">Your secret color:</p>
          <div
            class="chosen-swatch"
            style="background: rgb({swatchRgb(pickedColor)});"
          ></div>
          <button class="reselect" onclick={() => (step = 'pick')}>
            ← Change color
          </button>
        </div>
        <div class="describer-wrap">
          <ColorDescriber color={pickedColor} ondescribe={handleClue} />
          {#if submitting}<p class="submitting">Sending clue…</p>{/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .picking {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 1.5rem;
    gap: 1rem;
    overflow-y: auto;
  }

  .instructions { text-align: center; }
  .instructions h2 { margin: 0 0 0.3rem; font-size: 1.5rem; }
  .instructions p { color: #aaa; margin: 0; font-size: 0.95rem; }

  /* Hard mode — assigned swatch */
  .assigned-wrap {
    display: flex;
    justify-content: center;
  }
  .assigned-swatch {
    width: 200px;
    height: 130px;
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    border: 3px solid #444;
  }

  /* Medium mode — grid of 6 swatches */
  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.7rem;
    width: 100%;
    max-width: 380px;
  }
  .swatch-btn {
    aspect-ratio: 1;
    border-radius: 14px;
    border: 3px solid transparent;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    transition: transform 0.1s, border-color 0.1s, box-shadow 0.1s;
  }
  .swatch-btn:hover {
    transform: scale(1.06);
    border-color: rgba(255,255,255,0.5);
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }
  .swatch-btn:active { transform: scale(0.97); }

  /* Shared clue step */
  .clue-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
  }

  .chosen-swatch-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .swatch-label {
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  .chosen-swatch {
    width: 120px;
    height: 80px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

  .reselect {
    font-size: 0.85rem;
    background: none;
    border: 1px solid #444;
    color: #888;
    padding: 0.3em 0.8em;
    border-radius: 6px;
    cursor: pointer;
  }
  .reselect:hover { color: #ccc; border-color: #666; }

  .describer-wrap { width: 100%; max-width: 460px; }

  .submitting { color: #888; font-size: 0.9rem; text-align: center; }
  .loading { color: #666; font-size: 0.9rem; }
</style>
