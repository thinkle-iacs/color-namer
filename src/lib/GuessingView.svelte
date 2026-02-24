<script lang="ts">
  import ColorPicker from './ColorPicker.svelte';
  import { labToRgb } from './labToRgb';
  import { submitGuess, revealTarget } from './game';
  import type { Color, GameDoc } from './types';

  const {
    game,
    gameId,
    playerId,
    amPicker,
    pickerName,
    allGuessersSubmitted,
    localPickedColor,
  } = $props<{
    game: GameDoc;
    gameId: string;
    playerId: string;
    amPicker: boolean;
    pickerName: string;
    allGuessersSubmitted: boolean;
    localPickedColor: Color | null;
  }>();

  let myGuess = $derived(game.roundGuesses[playerId]);
  let guessCount = $derived(Object.keys(game.roundGuesses).length);
  let totalGuessers = $derived(game.playerOrder.length - 1);
  let revealColor = $derived(localPickedColor ?? game.roundPickedColor);
  let revealing = $state(false);
  let canSkipAndReveal = $derived(
    amPicker &&
      totalGuessers > 1 &&
      !allGuessersSubmitted &&
      !!revealColor &&
      !revealing &&
      !game.roundTarget
  );
  let autoRevealTriggered = $state(false);
  let revealError = $state('');

  async function handleGuess(color: Color) {
    await submitGuess(gameId, playerId, color);
  }

  async function handleReveal(auto = false) {
    if (!revealColor) return;
    revealError = '';
    revealing = true;
    try {
      await revealTarget(gameId, revealColor);
    } catch {
      revealError = 'Auto-reveal failed. Tap reveal to retry.';
      if (auto) autoRevealTriggered = false;
    }
    revealing = false;
  }

  $effect(() => {
    const shouldAutoReveal =
      amPicker &&
      allGuessersSubmitted &&
      !!revealColor &&
      !revealing &&
      !autoRevealTriggered &&
      !game.roundTarget;
    if (!shouldAutoReveal) return;
    autoRevealTriggered = true;
    handleReveal(true);
  });
</script>

<div class="guessing">
  <div class="clue-banner">
    <span class="clue-label">The clue</span>
    <span class="clue-text">"{game.roundClue}"</span>
  </div>

  {#if amPicker}
    <!-- Picker waits and then reveals -->
    <div class="picker-wait">
      <p class="status">
        {guessCount}/{totalGuessers} players have guessed
      </p>
      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width: {totalGuessers > 0 ? (guessCount / totalGuessers) * 100 : 0}%"
        ></div>
      </div>

      <div class="guesser-list">
        {#each game.playerOrder as id}
          {#if id !== game.playerOrder[game.pickerIndex]}
            {@const p = game.players[id]}
            <div class="guesser-item">
              <span class="dot" style="background: {p.avatarColor}"></span>
              <span class="gname">{p.name}</span>
              {#if game.roundGuesses[id]}
                <span class="guessed-badge">done</span>
              {:else}
                <span class="waiting-badge">thinking…</span>
              {/if}
            </div>
          {/if}
        {/each}
      </div>

      {#if allGuessersSubmitted}
        <p class="all-in">
          {#if revealing}
            Everyone's in — revealing…
          {:else}
            Everyone's in — revealing automatically…
          {/if}
        </p>
      {/if}

      {#if canSkipAndReveal}
        <button
          class="reveal-btn skip-btn"
          disabled={revealing || !revealColor}
          onclick={() => handleReveal(false)}
        >
          {revealing ? 'Revealing…' : 'Skip waiting and reveal'}
        </button>
      {/if}

      {#if revealError}
        <p class="reveal-error">{revealError}</p>
      {/if}

      {#if !revealColor}
        <p class="no-color-warning">
          ⚠ Target color is missing. Go back to picking and choose a color again.
        </p>
      {/if}
    </div>
  {:else if myGuess}
    <!-- Already guessed -->
    <div class="already-guessed">
      <p class="status">Your guess:</p>
      <div
        class="guess-swatch"
        style="background: rgb({labToRgb(myGuess.lightness, myGuess.a, myGuess.b).join(',')});"
      ></div>
      <p class="waiting-msg">Waiting for {pickerName} to reveal…</p>
      <p class="count">{guessCount}/{totalGuessers} guesses in</p>
    </div>
  {:else}
    <!-- Pick a color -->
    <div class="pick-area">
      <p class="prompt">Pick the color you think matches "{game.roundClue}"</p>
      <ColorPicker onconfirm={handleGuess} />
    </div>
  {/if}
</div>

<style>
  .guessing {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    gap: 1.5rem;
    overflow-y: auto;
  }

  .clue-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 1rem 2rem;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    text-align: center;
  }
  .clue-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #666;
  }
  .clue-text {
    font-size: 2rem;
    font-weight: 700;
    color: #fff;
    font-style: italic;
  }

  /* Picker wait */
  .picker-wait {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    max-width: 400px;
  }

  .status { color: #aaa; margin: 0; }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #6af, #a6f);
    transition: width 0.4s;
  }

  .guesser-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    width: 100%;
  }
  .guesser-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.7rem;
    background: #1a1a1a;
    border-radius: 8px;
    font-size: 0.95rem;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .gname { flex: 1; color: #ccc; }
  .guessed-badge { font-size: 0.75rem; color: #4c4; }
  .waiting-badge { font-size: 0.75rem; color: #888; }

  .all-in { color: #6f6; font-weight: bold; margin: 0; }

  .reveal-btn {
    font-size: 1.2rem;
    padding: 0.7em 2.5em;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #f93, #f66);
    color: #fff;
    font-weight: 700;
    transition: filter 0.15s;
  }
  .reveal-btn:hover:not([disabled]) { filter: brightness(1.15); }
  .reveal-btn[disabled] { opacity: 0.35; cursor: not-allowed; }

  .reveal-error {
    color: #f88;
    font-size: 0.85rem;
    text-align: center;
    margin: 0;
  }

  .no-color-warning {
    color: #f93;
    font-size: 0.85rem;
    text-align: center;
    max-width: 300px;
    margin: 0;
  }

  /* Already guessed */
  .already-guessed {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .guess-swatch {
    width: 140px;
    height: 90px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .waiting-msg { color: #888; margin: 0; }
  .count { color: #666; font-size: 0.85rem; margin: 0; }

  /* Pick area */
  .pick-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }
  .prompt { color: #bbb; margin: 0; text-align: center; font-size: 1rem; }
</style>
