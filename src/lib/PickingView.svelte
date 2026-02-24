<script lang="ts">
  import ColorPicker from './ColorPicker.svelte';
  import ColorDescriber from './ColorDescriber.svelte';
  import { labToRgb } from './labToRgb';
  import { submitClue } from './game';
  import type { Color } from './types';

  const { gameId, playerId, onColorPicked, pickedColor } = $props<{
    gameId: string;
    playerId: string;
    onColorPicked: (color: Color) => void;
    pickedColor: Color | null;
  }>();

  let step = $state<'pick' | 'clue'>('pick');
  let submitting = $state(false);

  async function handleClue(clue: string) {
    if (!pickedColor) return;
    submitting = true;
    await submitClue(gameId, clue);
    submitting = false;
  }
</script>

<div class="picking">
  {#if step === 'pick'}
    <div class="instructions">
      <h2>Your turn to pick a color!</h2>
      <p>Choose any color — your clue can't mention any color names.</p>
    </div>
    <div class="picker-wrap">
      <ColorPicker
        onconfirm={(color) => {
          onColorPicked(color);
          step = 'clue';
        }}
      />
    </div>
  {:else if pickedColor}
    <div class="clue-step">
      <div class="chosen-swatch-wrap">
        <p class="swatch-label">Your secret color:</p>
        <div
          class="chosen-swatch"
          style="background: rgb({labToRgb(pickedColor.lightness, pickedColor.a, pickedColor.b).join(',')});"
        ></div>
        <button class="reselect" onclick={() => (step = 'pick')}>
          ← Change color
        </button>
      </div>

      <div class="describer-wrap">
        <ColorDescriber
          color={pickedColor}
          ondescribe={handleClue}
        />
        {#if submitting}
          <p class="submitting">Sending clue…</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

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

  .picker-wrap {
    width: 100%;
    /* Grow to fill available vertical space: viewport minus instructions (~120px overhead).
       Cap at 900px so it doesn't get absurd on very tall screens. */
    max-width: min(900px, calc(100vh - 120px));
  }

  .instructions {
    text-align: center;
  }
  .instructions h2 { margin: 0 0 0.3rem; font-size: 1.5rem; }
  .instructions p { color: #aaa; margin: 0; font-size: 0.95rem; }

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
</style>
