<svelte:head><title>Test Routes</title></svelte:head>

<div class="test-index">
  <h1>Test Routes</h1>
  <ul>
    <li>
      <a href="/test/resultScreen">Result Screen</a>
      <span class="desc">RevealView component — scores, scoreboard, color distance map</span>
    </li>
    <li>
      <a href="/test/pickingView">Picking View</a>
      <span class="desc">PickingView component — color picking + clue entry flow</span>
    </li>
    <li>
      <a href="/test/colorPicker">Color Picker</a>
      <span class="desc">ColorPicker full flow (all three stages)</span>
      <ul class="sub">
        <li><a href="/test/colorPicker/1">State 1</a> — broad hue × lightness grid</li>
        <li><a href="/test/colorPicker/2">State 2</a> — a/b neighbourhood</li>
        <li><a href="/test/colorPicker/3">State 3</a> — fine grid</li>
      </ul>
    </li>
    <li>
      <a href="/test/gradientPicker">Gradient Picker</a>
      <span class="desc">GradientPicker zoom explorer</span>
    </li>
    <li>
      <a href="/test/gridCalibration">Grid Calibration</a>
      <span class="desc">Color grid calibration tool</span>
    </li>
  </ul>
</div>

<style>
  .test-index {
    min-height: 100vh;
    background: #111;
    color: #eee;
    font-family: sans-serif;
    padding: 2rem;
  }

  h1 {
    font-size: 1.1rem;
    color: #aaa;
    margin: 0 0 1.5rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  li {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  a {
    color: #6af;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
  }
  a:hover { text-decoration: underline; }

  .desc {
    font-size: 0.8rem;
    color: #666;
  }

  .sub {
    flex-basis: 100%;
    padding-left: 1.5rem;
    margin-top: 0.3rem;
    gap: 0.3rem;
  }

  .sub li {
    font-size: 0.85rem;
    color: #999;
  }

  .sub a {
    font-size: 0.85rem;
    font-weight: normal;
  }
</style>
