<script lang="ts">
  import ColorPicker from './ColorPicker.svelte';
  import { labToRgb } from './labToRgb';
  import { submitGuess, revealTarget, voteToSkip, nextRound } from './game';
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

  // Timer countdown
  let timeLeft = $state<number | null>(null); // seconds remaining, null = no timer
  let timerExpiredFor = $state<number | null>(null); // deadline we already triggered for
  let inProgressColor = $state<Color | null>(null); // live color from ColorPicker before confirm

  // Skip voting
  let skipVotes = $derived(game.roundSkipVotes ?? []);
  let mySkipVote = $derived(skipVotes.includes(playerId));
  let skipThreshold = $derived(Math.max(1, Math.ceil(totalGuessers / 2)));
  // skipReady also fires when timer runs out (so force-reveal button appears)
  let skipReady = $derived(
    !game.roundTarget &&
    (skipVotes.length >= skipThreshold || timeLeft === 0)
  );
  // Non-pickers can trigger reveal when all guesses are in OR timer expired (picker may be offline)
  let canNonPickerReveal = $derived(
    !amPicker &&
    (allGuessersSubmitted || timeLeft === 0) &&
    !!revealColor &&
    !revealing &&
    !game.roundTarget
  );
  let voting = $state(false);
  let forceAdvancing = $state(false);

  $effect(() => {
    const deadline = game.roundDeadline ?? null;
    // Reset on new deadline
    inProgressColor = null;
    if (!deadline) {
      timeLeft = null;
      return;
    }
    function tick() {
      timeLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    }
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  });

  // When timer hits 0: picker auto-reveals; non-picker auto-submits in-progress color
  $effect(() => {
    if (
      timeLeft !== 0 ||
      game.roundTarget ||
      !game.roundDeadline ||
      timerExpiredFor === game.roundDeadline
    ) return;
    timerExpiredFor = game.roundDeadline;

    if (amPicker) {
      if (revealColor && !revealing) handleReveal(true);
    } else if (!myGuess && inProgressColor) {
      void handleGuess(inProgressColor);
    }
  });

  async function handleGuess(color: Color) {
    await submitGuess(gameId, playerId, color);
  }

  async function handleVoteSkip() {
    voting = true;
    try {
      await voteToSkip(gameId, playerId);
    } finally {
      voting = false;
    }
  }

  // Force the game forward — reveal if we have the color, skip to next round otherwise
  async function handleForceAdvance() {
    forceAdvancing = true;
    try {
      if (revealColor) {
        await revealTarget(gameId, revealColor);
      } else {
        await nextRound(gameId);
      }
    } finally {
      forceAdvancing = false;
    }
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
    {#if timeLeft !== null}
      <div class="timer-display" class:timer-urgent={timeLeft <= 10} class:timer-done={timeLeft === 0}>
        {#if timeLeft === 0}
          ⏱ Time's up!
        {:else}
          ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        {/if}
      </div>
    {/if}
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

      {#if skipVotes.length > 0 && !allGuessersSubmitted}
        <p class="skip-notice">⚠ {skipVotes.length} player{skipVotes.length !== 1 ? 's' : ''} voted to skip</p>
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

      {#if canNonPickerReveal}
        <p class="all-in-nonpicker">All guesses are in!</p>
        <button class="reveal-btn" disabled={revealing} onclick={() => handleReveal(false)}>
          {revealing ? 'Revealing…' : 'Reveal answers →'}
        </button>
      {:else}
        <p class="waiting-msg">Waiting for {pickerName} to reveal…</p>
        <p class="count">{guessCount}/{totalGuessers} guesses in</p>
      {/if}

      <!-- Skip voting (for when picker's machine died mid-round) -->
      {#if !allGuessersSubmitted}
        <div class="skip-section">
          {#if skipReady}
            <p class="skip-ready-msg">Majority ready to skip!</p>
            <button class="force-btn" disabled={forceAdvancing} onclick={handleForceAdvance}>
              {forceAdvancing ? 'Moving on…' : revealColor ? 'Reveal & move on' : 'Skip this round'}
            </button>
          {:else if mySkipVote}
            <p class="voted-msg">You voted to skip ({skipVotes.length}/{skipThreshold} needed)</p>
          {:else}
            <button class="skip-vote-btn" disabled={voting} onclick={handleVoteSkip}>
              {voting ? 'Voting…' : 'Vote to skip this round'}
            </button>
            {#if skipVotes.length > 0}
              <p class="skip-count">{skipVotes.length}/{skipThreshold} players ready to skip</p>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Pick a color -->
    <div class="pick-area">
      <p class="prompt">Pick the color you think matches "{game.roundClue}"</p>
      {#key game.roundNumber}
        <ColorPicker onconfirm={handleGuess} onchange={(c) => (inProgressColor = c)} />
      {/key}
      <!-- Skip option for when picker's machine died before everyone guessed -->
      <div class="skip-section compact">
        {#if skipReady}
          <button class="force-btn" disabled={forceAdvancing} onclick={handleForceAdvance}>
            {forceAdvancing ? 'Moving on…' : revealColor ? 'Reveal & move on' : 'Skip this round'}
          </button>
        {:else if mySkipVote}
          <p class="voted-msg">You voted to skip ({skipVotes.length}/{skipThreshold} needed)</p>
        {:else}
          <button class="skip-link-btn" disabled={voting} onclick={handleVoteSkip}>
            Game stuck? Vote to skip this round
          </button>
        {/if}
      </div>
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
  .timer-display {
    font-size: 1rem;
    font-weight: 700;
    color: #888;
    font-variant-numeric: tabular-nums;
    margin-top: 0.1rem;
  }
  .timer-urgent { color: #f93; }
  .timer-done { color: #f66; }

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

  .skip-notice {
    color: #f93;
    font-size: 0.82rem;
    margin: 0;
    text-align: center;
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
  .all-in-nonpicker { color: #6f6; font-weight: bold; margin: 0; }
  .waiting-msg { color: #888; margin: 0; }
  .count { color: #666; font-size: 0.85rem; margin: 0; }

  /* Skip voting */
  .skip-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #2a2a2a;
    width: 100%;
    max-width: 320px;
  }
  .skip-section.compact {
    margin-top: 0;
    padding-top: 0.5rem;
    border-top: 1px solid #222;
  }
  .skip-vote-btn {
    font-size: 0.82rem;
    padding: 0.45em 1.1em;
    border-radius: 8px;
    border: 1px solid #555;
    background: transparent;
    color: #999;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .skip-vote-btn:hover:not([disabled]) { background: #2a2a2a; color: #ddd; }
  .skip-vote-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
  .skip-link-btn {
    font-size: 0.78rem;
    padding: 0.35em 0.9em;
    border-radius: 7px;
    border: 1px solid #3a3a3a;
    background: transparent;
    color: #777;
    cursor: pointer;
  }
  .skip-link-btn:hover:not([disabled]) { color: #bbb; border-color: #555; }
  .skip-link-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
  .skip-count { font-size: 0.78rem; color: #666; margin: 0; }
  .skip-ready-msg { font-size: 0.88rem; color: #f93; font-weight: 600; margin: 0; }
  .voted-msg { font-size: 0.78rem; color: #777; margin: 0; font-style: italic; }
  .force-btn {
    font-size: 1rem;
    padding: 0.6em 1.8em;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #f93, #f66);
    color: #fff;
    font-weight: 700;
    transition: filter 0.15s;
  }
  .force-btn:hover:not([disabled]) { filter: brightness(1.15); }
  .force-btn[disabled] { opacity: 0.35; cursor: not-allowed; }

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
