<script lang="ts">
  import { labToRgb } from './labToRgb';
  import type { Color } from './types';
  import { validateClue } from './validateColorWord';

  const { color, ondescribe } = $props<{
    color: Color;
    ondescribe: (clue: string) => void;
  }>();

  let clue = $state('');
  let error = $derived(validateClue(clue));
  let rgb = $derived(labToRgb(color.lightness, color.a, color.b));
  let textColor = $derived(color.lightness < 50 ? 'white' : 'black');
  let wordCount = $derived(clue.trim().split(/\s+/).filter((w) => w.length > 0).length);
</script>

<div class="describer">
  <div
    class="swatch"
    style="background: rgb({rgb[0]},{rgb[1]},{rgb[2]}); color: {textColor};"
  >
    {#if clue.trim()}
      <span class="clue-preview">"{clue.trim()}"</span>
    {:else}
      <span class="placeholder">Your color</span>
    {/if}
  </div>

  <label class="label">
    Give a <strong>two-word</strong> clue — no color names, no light/dark:
    <input
      type="text"
      bind:value={clue}
      placeholder="e.g. summer grass"
      autocomplete="off"
      spellcheck="true"
    />
  </label>

  <div class="feedback">
    {#if clue.trim() && error}
      <span class="error">{error}</span>
    {:else if wordCount === 2 && !error}
      <span class="ok">Looks good!</span>
    {:else if wordCount > 0}
      <span class="hint">{wordCount}/2 words</span>
    {:else}
      <span class="hint">Type two words</span>
    {/if}
  </div>

  <button
    disabled={!!error || clue.trim().length === 0}
    onclick={() => ondescribe(clue.trim())}
  >
    Lock in clue
  </button>
</div>

<style>
  .describer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
  }

  .swatch {
    width: 220px;
    height: 140px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: bold;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }

  .clue-preview { font-style: italic; }
  .placeholder { opacity: 0.4; font-style: italic; }

  .label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 1rem;
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  input {
    font-size: 1.6rem;
    padding: 0.4em 0.6em;
    border: 3px solid #555;
    border-radius: 8px;
    text-align: center;
    width: 100%;
    box-sizing: border-box;
  }

  .feedback {
    min-height: 1.5em;
    font-size: 0.95rem;
  }
  .error  { color: #e55; font-weight: bold; }
  .ok     { color: #4c4; font-weight: bold; }
  .hint   { color: #999; }

  button {
    font-size: 1.2rem;
    padding: 0.6em 2em;
    border-radius: 10px;
    cursor: pointer;
    border: 3px solid #333;
    background: #222;
    color: white;
    transition: opacity 0.2s;
  }
  button[disabled] {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
