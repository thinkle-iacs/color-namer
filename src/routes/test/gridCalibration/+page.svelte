<script lang="ts">
  import {
    labStyle,
    labToLch,
    lchToLab,
    findMaxChromaP3,
    isInDisplayP3,
  } from "$lib/labToRgb";

  /* ── Test color (the "anchor" a user would have picked in steps 1+2) ── */
  let anchorL = $state(50);
  let anchorA = $state(25);
  let anchorB = $state(15);

  /* ── Axis mode ── */
  type AxisMode = "ab" | "la" | "lb" | "lc";
  let axisMode: AxisMode = $state("lc");

  /* ── Grid knobs ── */
  let gridSize = $state(9);
  let rangeX = $state(4); // ± range on X axis
  let rangeY = $state(4); // ± range on Y axis

  /* ── Page knobs ── */
  let numPages = $state(5);
  let pageStep = $state(3);
  let currentPage = $state(2); // center

  /* ── L-range knobs (for modes that put L on an axis) ── */
  let lRange = $state(20); // total L span mapped across the Y axis

  /* ── Chroma range (for lc mode) ── */
  let cRange = $state(30); // total chroma span mapped across X axis

  /* ── Hue page step (for lc mode) ── */
  let huePageStep = $state(4); // degrees per page

  /* ── Display toggle ── */
  let showLabels = $state(true);

  /* ── Two-step demo ── */
  let twoStepMode = $state(false);
  let twoStepPhase: "wide" | "tight" = $state("wide");
  let twoStepSelection: { l: number; a: number; b: number } | null =
    $state(null);
  // Saved knobs to restore when resetting
  let savedKnobs: { gridSize: number; lRange: number; cRange: number } | null =
    $state(null);

  function startTwoStep() {
    twoStepMode = true;
    twoStepPhase = "wide";
    twoStepSelection = null;
    savedKnobs = { gridSize, lRange, cRange };
    axisMode = "lc";
    gridSize = 9;
    lRange = 40;
    cRange = 40;
    currentPage = Math.floor(numPages / 2);
  }

  function selectTwoStepCell(cell: { l: number; a: number; b: number }) {
    if (twoStepPhase === "wide") {
      // Zoom into the selected cell
      twoStepSelection = cell;
      twoStepPhase = "tight";
      anchorL = cell.l;
      anchorA = cell.a;
      anchorB = cell.b;
      gridSize = 5;
      lRange = 8;
      cRange = 8;
      currentPage = Math.floor(numPages / 2);
    } else {
      // Final selection
      twoStepSelection = cell;
    }
  }

  function resetTwoStep() {
    twoStepPhase = "wide";
    twoStepSelection = null;
    if (savedKnobs) {
      gridSize = 9;
      lRange = 40;
      cRange = 40;
    }
    // Restore original anchor from the initial color
    currentPage = Math.floor(numPages / 2);
  }

  function exitTwoStep() {
    twoStepMode = false;
    twoStepPhase = "wide";
    twoStepSelection = null;
    if (savedKnobs) {
      gridSize = savedKnobs.gridSize;
      lRange = savedKnobs.lRange;
      cRange = savedKnobs.cRange;
      savedKnobs = null;
    }
  }

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  /* ── Derived LCH of anchor ── */
  let anchorLCH = $derived(labToLch(anchorL, anchorA, anchorB));
  let anchorC = $derived(anchorLCH[1]);
  let anchorH = $derived(anchorLCH[2]);

  /* ── Axis labels ── */
  let axisLabels = $derived.by(() => {
    switch (axisMode) {
      case "ab":
        return {
          x: "a (green→red)",
          y: "b (blue→yellow)",
          page: `L (step ${pageStep})`,
        };
      case "la":
        return {
          x: "a (green→red)",
          y: "L (dark→light)",
          page: `b (step ${pageStep})`,
        };
      case "lb":
        return {
          x: "b (blue→yellow)",
          y: "L (dark→light)",
          page: `a (step ${pageStep})`,
        };
      case "lc":
        return {
          x: "Chroma (grey→vivid)",
          y: "L (dark→light)",
          page: `Hue (±${huePageStep}°)`,
        };
    }
  });

  /* ── Compute the page offset value ── */
  let centerPageIdx = $derived(Math.floor(numPages / 2));
  let pageOffset = $derived(currentPage - centerPageIdx);

  /* ── Cell computation ── */
  type CellData = {
    l: number;
    a: number;
    b: number;
    style: string;
    isCenter: boolean;
    inGamut: boolean;
  };

  let cells = $derived.by((): CellData[] => {
    const out: CellData[] = [];
    const cols = gridSize;
    const rows = gridSize;
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dx = col - cx; // [-half, +half]
        const dy = cy - row; // top = positive
        const isCenter = col === cx && row === cy;

        let l: number, a: number, b: number;

        switch (axisMode) {
          case "ab": {
            // X = a, Y = b, Pages = L
            const stepA = rangeX > 0 ? (dx / cx) * rangeX : 0;
            const stepB = rangeY > 0 ? (dy / cy) * rangeY : 0;
            a = Math.round(anchorA + stepA);
            b = Math.round(anchorB + stepB);
            l = clamp(Math.round(anchorL + pageOffset * pageStep), 1, 99);
            break;
          }
          case "la": {
            // X = a, Y = L, Pages = b
            const stepA = rangeX > 0 ? (dx / cx) * rangeX : 0;
            const stepL = lRange > 0 ? (dy / cy) * (lRange / 2) : 0;
            a = Math.round(anchorA + stepA);
            l = clamp(Math.round(anchorL + stepL), 1, 99);
            b = Math.round(anchorB + pageOffset * pageStep);
            break;
          }
          case "lb": {
            // X = b, Y = L, Pages = a
            const stepB = rangeX > 0 ? (dx / cx) * rangeX : 0;
            const stepL = lRange > 0 ? (dy / cy) * (lRange / 2) : 0;
            b = Math.round(anchorB + stepB);
            l = clamp(Math.round(anchorL + stepL), 1, 99);
            a = Math.round(anchorA + pageOffset * pageStep);
            break;
          }
          case "lc": {
            // X = chroma, Y = L, Pages = hue
            const stepL = lRange > 0 ? (dy / cy) * (lRange / 2) : 0;
            l = clamp(Math.round(anchorL + stepL), 1, 99);
            const hue = anchorH + pageOffset * huePageStep;
            const stepC = cRange > 0 ? (dx / cx) * (cRange / 2) : 0;
            const c = Math.max(0, anchorC + stepC);
            const [, ca, cb] = lchToLab(l, c, hue);
            a = Math.round(ca);
            b = Math.round(cb);
            break;
          }
        }

        const inGamut = isInDisplayP3(l, a, b);
        out.push({ l, a, b, style: labStyle(l, a, b), isCenter, inGamut });
      }
    }
    return out;
  });

  /* ── Count distinct visual colors ── */
  let distinctColors = $derived.by(() => {
    const seen = new Set<string>();
    for (const c of cells) {
      // Round to nearest integer LAB to count perceptual duplicates
      seen.add(`${c.l},${c.a},${c.b}`);
    }
    return seen.size;
  });

  let outOfGamutCount = $derived(cells.filter((c) => !c.inGamut).length);

  /* ── Pages array for dots ── */
  let pages = $derived(Array.from({ length: numPages }, (_, i) => i));

  /* ── Colored pills for each page ── */
  let pagePills = $derived.by(() => {
    const center = Math.floor(numPages / 2);
    return pages.map((_, i) => {
      const offset = i - center;
      switch (axisMode) {
        case "lc": {
          const hue = anchorH + offset * huePageStep;
          const [, pa, pb] = lchToLab(anchorL, anchorC, hue);
          return {
            style: labStyle(anchorL, Math.round(pa), Math.round(pb)),
            label: `hue ${hue.toFixed(0)}°`,
          };
        }
        case "ab": {
          const pL = clamp(Math.round(anchorL + offset * pageStep), 1, 99);
          return { style: labStyle(pL, anchorA, anchorB), label: `L ${pL}` };
        }
        case "la": {
          const pb = Math.round(anchorB + offset * pageStep);
          return { style: labStyle(anchorL, anchorA, pb), label: `b ${pb}` };
        }
        case "lb": {
          const pa = Math.round(anchorA + offset * pageStep);
          return { style: labStyle(anchorL, pa, anchorB), label: `a ${pa}` };
        }
      }
    });
  });

  /* ── Shift buttons: move anchor by the grid's full span in L or C ── */
  function shiftL(dir: number) {
    // dir: +1 = lighter, -1 = darker. Move by the grid's L span.
    anchorL = clamp(anchorL + dir * lRange, 1, 99);
    currentPage = Math.floor(numPages / 2);
  }

  function shiftC(dir: number) {
    // dir: +1 = more vivid, -1 = greyer. Move by the grid's chroma span.
    const newC = Math.max(0, anchorC + dir * cRange);
    const [, a, b] = lchToLab(anchorL, newC, anchorH);
    anchorA = Math.round(a);
    anchorB = Math.round(b);
    currentPage = Math.floor(numPages / 2);
  }

  /* ── Colors for the shift buttons ── */
  let lighterBtnStyle = $derived(
    labStyle(clamp(anchorL + lRange, 1, 99), anchorA, anchorB),
  );
  let darkerBtnStyle = $derived(
    labStyle(clamp(anchorL - lRange, 1, 99), anchorA, anchorB),
  );
  let vividBtnStyle = $derived.by(() => {
    const newC = anchorC + cRange;
    const [, a, b] = lchToLab(anchorL, newC, anchorH);
    return labStyle(anchorL, Math.round(a), Math.round(b));
  });
  let greyerBtnStyle = $derived.by(() => {
    const newC = Math.max(0, anchorC - cRange);
    const [, a, b] = lchToLab(anchorL, newC, anchorH);
    return labStyle(anchorL, Math.round(a), Math.round(b));
  });
  /* Text color helper: white on dark, black on light */
  function textColor(l: number) {
    return l > 55 ? "#222" : "#eee";
  }

  /* ── Quick presets ── */
  function applyPreset(name: string) {
    switch (name) {
      case "current": // Current A×B behavior
        axisMode = "ab";
        gridSize = 9;
        rangeX = 4;
        rangeY = 4;
        numPages = 5;
        pageStep = 6;
        currentPage = 2;
        break;
      case "lc-wide":
        axisMode = "lc";
        gridSize = 9;
        lRange = 36;
        cRange = 40;
        numPages = 5;
        huePageStep = 5;
        currentPage = 2;
        break;
      case "lc-tight":
        axisMode = "lc";
        gridSize = 9;
        lRange = 16;
        cRange = 20;
        numPages = 5;
        huePageStep = 3;
        currentPage = 2;
        break;
      case "la-mode":
        axisMode = "la";
        gridSize = 9;
        rangeX = 6;
        lRange = 28;
        numPages = 5;
        pageStep = 4;
        currentPage = 2;
        break;
      case "lb-mode":
        axisMode = "lb";
        gridSize = 9;
        rangeX = 6;
        lRange = 28;
        numPages = 5;
        pageStep = 4;
        currentPage = 2;
        break;
    }
  }

  /* ── Test anchor presets ── */
  function setAnchor(name: string) {
    switch (name) {
      case "mid-red":
        anchorL = 50;
        anchorA = 45;
        anchorB = 25;
        break;
      case "mid-green":
        anchorL = 55;
        anchorA = -35;
        anchorB = 20;
        break;
      case "mid-blue":
        anchorL = 35;
        anchorA = 15;
        anchorB = -45;
        break;
      case "dark-red":
        anchorL = 20;
        anchorA = 30;
        anchorB = 15;
        break;
      case "light-yellow":
        anchorL = 85;
        anchorA = -5;
        anchorB = 40;
        break;
      case "neutral-mid":
        anchorL = 50;
        anchorA = 0;
        anchorB = 0;
        break;
      case "dark-purple":
        anchorL = 15;
        anchorA = 25;
        anchorB = -20;
        break;
      case "vivid-orange":
        anchorL = 65;
        anchorA = 40;
        anchorB = 55;
        break;
    }
    currentPage = Math.floor(numPages / 2);
  }
</script>

<svelte:head><title>Grid Calibration</title></svelte:head>

<div class="cal-layout">
  <div class="panel controls">
    <h2>Grid Calibration</h2>
    <p class="subtitle">
      Tweak knobs, find the sweet spot where 81 cells look perceptibly
      different.
    </p>

    <!-- Anchor Color -->
    <fieldset>
      <legend>Anchor Color (from steps 1+2)</legend>
      <div class="slider-row">
        <label
          >L <input type="range" min="1" max="99" bind:value={anchorL} /><span
            >{anchorL}</span
          ></label
        >
      </div>
      <div class="slider-row">
        <label
          >a <input type="range" min="-80" max="80" bind:value={anchorA} /><span
            >{anchorA}</span
          ></label
        >
      </div>
      <div class="slider-row">
        <label
          >b <input type="range" min="-80" max="80" bind:value={anchorB} /><span
            >{anchorB}</span
          ></label
        >
      </div>
      <div
        class="swatch-preview"
        style={labStyle(anchorL, anchorA, anchorB)}
      ></div>
      <div class="preset-row">
        {#each [["mid-red", "Red"], ["mid-green", "Green"], ["mid-blue", "Blue"], ["dark-red", "Dk Red"], ["light-yellow", "Lt Yellow"], ["neutral-mid", "Grey"], ["dark-purple", "Dk Purple"], ["vivid-orange", "Orange"]] as [id, label]}
          <button class="preset-btn" onclick={() => setAnchor(id)}
            >{label}</button
          >
        {/each}
      </div>
    </fieldset>

    <!-- Axis Mode -->
    <fieldset>
      <legend>Axis Mode</legend>
      <div class="radio-group">
        <label
          ><input type="radio" bind:group={axisMode} value="ab" /> A × B (pages:
          L) <em>— current</em></label
        >
        <label
          ><input type="radio" bind:group={axisMode} value="lc" /> L × Chroma (pages:
          Hue)</label
        >
        <label
          ><input type="radio" bind:group={axisMode} value="la" /> L × A (pages:
          B)</label
        >
        <label
          ><input type="radio" bind:group={axisMode} value="lb" /> L × B (pages:
          A)</label
        >
      </div>
    </fieldset>

    <!-- Grid Shape -->
    <fieldset>
      <legend>Grid Shape</legend>
      <div class="slider-row">
        <label
          >Grid size <input
            type="range"
            min="3"
            max="15"
            step="2"
            bind:value={gridSize}
          /><span>{gridSize}×{gridSize} = {gridSize * gridSize} cells</span
          ></label
        >
      </div>

      {#if axisMode === "ab"}
        <div class="slider-row">
          <label
            >± a range <input
              type="range"
              min="1"
              max="20"
              bind:value={rangeX}
            /><span>±{rangeX}</span></label
          >
        </div>
        <div class="slider-row">
          <label
            >± b range <input
              type="range"
              min="1"
              max="20"
              bind:value={rangeY}
            /><span>±{rangeY}</span></label
          >
        </div>
      {:else if axisMode === "lc"}
        <div class="slider-row">
          <label
            >L span <input
              type="range"
              min="4"
              max="60"
              step="2"
              bind:value={lRange}
            /><span>{lRange} (±{lRange / 2})</span></label
          >
        </div>
        <div class="slider-row">
          <label
            >Chroma span <input
              type="range"
              min="4"
              max="80"
              step="2"
              bind:value={cRange}
            /><span>{cRange} (±{cRange / 2})</span></label
          >
        </div>
      {:else}
        <div class="slider-row">
          <label
            >L span <input
              type="range"
              min="4"
              max="60"
              step="2"
              bind:value={lRange}
            /><span>{lRange} (±{lRange / 2})</span></label
          >
        </div>
        <div class="slider-row">
          <label
            >± {axisMode === "la" ? "a" : "b"} range
            <input type="range" min="1" max="20" bind:value={rangeX} /><span
              >±{rangeX}</span
            ></label
          >
        </div>
      {/if}
    </fieldset>

    <!-- Page Navigation -->
    <fieldset>
      <legend>Page Navigation ({axisLabels.page})</legend>
      <div class="slider-row">
        <label
          ># pages <input
            type="range"
            min="1"
            max="9"
            step="2"
            bind:value={numPages}
          /><span>{numPages}</span></label
        >
      </div>
      {#if axisMode === "lc"}
        <div class="slider-row">
          <label
            >Hue step (°) <input
              type="range"
              min="1"
              max="15"
              bind:value={huePageStep}
            /><span>±{huePageStep}°</span></label
          >
        </div>
      {:else}
        <div class="slider-row">
          <label
            >Page step <input
              type="range"
              min="1"
              max="15"
              bind:value={pageStep}
            /><span>{pageStep}</span></label
          >
        </div>
      {/if}
    </fieldset>

    <!-- Quick Presets -->
    <fieldset>
      <legend>Quick Presets</legend>
      <div class="preset-row">
        <button class="preset-btn" onclick={() => applyPreset("current")}
          >Current (A×B)</button
        >
        <button class="preset-btn" onclick={() => applyPreset("lc-wide")}
          >L×C Wide</button
        >
        <button class="preset-btn" onclick={() => applyPreset("lc-tight")}
          >L×C Tight</button
        >
        <button class="preset-btn" onclick={() => applyPreset("la-mode")}
          >L×A</button
        >
        <button class="preset-btn" onclick={() => applyPreset("lb-mode")}
          >L×B</button
        >
      </div>
      <div class="preset-row" style="margin-top:0.4rem">
        <button
          class="preset-btn"
          style="background:#264;color:#8f8;border-color:#4a6"
          onclick={startTwoStep}>▶ Two-Step Demo</button
        >
      </div>
    </fieldset>

    <!-- Display Options -->
    <fieldset>
      <legend>Display</legend>
      <label class="checkbox-row"
        ><input type="checkbox" bind:checked={showLabels} /> Show L,a,b labels on
        cells</label
      >
    </fieldset>

    <!-- Stats -->
    <div class="stats">
      <span
        >Distinct L,a,b: <strong>{distinctColors}</strong> / {gridSize *
          gridSize}</span
      >
      <span>Out of gamut: <strong>{outOfGamutCount}</strong></span>
      <span>Axes: X={axisLabels.x}, Y={axisLabels.y}</span>
    </div>
  </div>

  <div class="panel preview">
    {#if twoStepMode}
      <!-- Two-step demo header -->
      <div class="two-step-header">
        <strong>Two-Step Demo</strong>
        {#if twoStepPhase === "wide"}
          <span class="phase-label">Step 1: Pick a region (9×9, span 40)</span>
        {:else}
          <span class="phase-label">Step 2: Fine-tune (5×5, span 8)</span>
        {/if}
        <div class="two-step-actions">
          {#if twoStepPhase === "tight"}
            <button class="preset-btn" onclick={resetTwoStep}
              >← Back to wide</button
            >
          {/if}
          <button class="preset-btn" onclick={exitTwoStep}>Exit demo</button>
        </div>
      </div>
    {/if}

    <!-- Axis labels -->
    <div class="axis-info">
      <span class="axis-label y-label">{axisLabels.y} ↑</span>
      <span class="axis-label x-label">{axisLabels.x} →</span>
    </div>

    <!-- Grid with shift buttons -->
    <div class="grid-with-shifts">
      <!-- Lighter button (top) -->
      {#if axisMode === "lc" || axisMode === "la" || axisMode === "lb"}
        <button
          class="shift-btn shift-top"
          style="{lighterBtnStyle};color:{textColor(
            clamp(anchorL + lRange, 1, 99),
          )}"
          onclick={() => shiftL(1)}
          disabled={anchorL >= 97}>↑ Lighter</button
        >
      {/if}

      <div class="grid-row-with-sides">
        <!-- Greyer button (left, only in lc mode) -->
        {#if axisMode === "lc"}
          <button
            class="shift-btn shift-side"
            style="{greyerBtnStyle};color:{textColor(anchorL)}"
            onclick={() => shiftC(-1)}
            disabled={anchorC <= 2}>← Grey</button
          >
        {/if}

        <!-- Grid -->
        <div
          class="grid"
          class:with-labels={showLabels}
          style="grid-template-columns: repeat({gridSize}, 1fr);"
        >
          {#each cells as cell, idx}
            <div
              class="swatch"
              class:center-cell={cell.isCenter}
              class:out-of-gamut={!cell.inGamut}
              class:clickable={twoStepMode}
              style={cell.style}
              title="L={cell.l} a={cell.a} b={cell.b}{cell.inGamut
                ? ''
                : ' (clamped)'}"
              role={twoStepMode ? "button" : undefined}
              tabindex={twoStepMode ? 0 : undefined}
              onclick={() => {
                if (twoStepMode) selectTwoStepCell(cell);
              }}
              onkeydown={(e) => {
                if (twoStepMode && (e.key === "Enter" || e.key === " "))
                  selectTwoStepCell(cell);
              }}
            >
              {#if showLabels}
                <span class="cell-label">{cell.l},{cell.a},{cell.b}</span>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Vivid button (right, only in lc mode) -->
        {#if axisMode === "lc"}
          <button
            class="shift-btn shift-side"
            style="{vividBtnStyle};color:{textColor(anchorL)}"
            onclick={() => shiftC(1)}>Vivid →</button
          >
        {/if}
      </div>

      <!-- Darker button (bottom) -->
      {#if axisMode === "lc" || axisMode === "la" || axisMode === "lb"}
        <button
          class="shift-btn shift-bottom"
          style="{darkerBtnStyle};color:{textColor(
            clamp(anchorL - lRange, 1, 99),
          )}"
          onclick={() => shiftL(-1)}
          disabled={anchorL <= 3}>↓ Darker</button
        >
      {/if}
    </div>

    <!-- Page navigation: colored pills -->
    <div class="page-nav">
      <span class="page-nav-label"
        >{axisMode === "lc"
          ? "Hue"
          : axisMode === "ab"
            ? "Lightness"
            : axisMode === "la"
              ? "b axis"
              : "a axis"}:</span
      >
      <div class="page-pills">
        {#each pagePills as pill, i}
          <button
            class="page-pill"
            class:active={i === currentPage}
            style={pill.style}
            onclick={() => (currentPage = i)}
            title={pill.label}
          ></button>
        {/each}
      </div>
    </div>
    <div class="page-label">
      Page {currentPage + 1}/{numPages} · offset {pageOffset >= 0
        ? "+"
        : ""}{pageOffset}
      {#if axisMode === "lc"}
        · hue {(anchorH + pageOffset * huePageStep).toFixed(1)}°
      {/if}
    </div>

    {#if twoStepMode && twoStepPhase === "tight" && twoStepSelection}
      <div class="final-pick">
        <div
          class="final-swatch"
          style={labStyle(
            twoStepSelection.l,
            twoStepSelection.a,
            twoStepSelection.b,
          )}
        ></div>
        <span
          >Final: L={twoStepSelection.l} a={twoStepSelection.a} b={twoStepSelection.b}</span
        >
      </div>
    {/if}

    <div class="hint">
      {#if twoStepMode}
        {#if twoStepPhase === "wide"}Click a cell to zoom in.{:else}Click to
          pick your final color.{/if}
      {:else}
        Use shift buttons to page beyond grid edges. Hover cells for details.
      {/if}
    </div>
  </div>
</div>

<style>
  .cal-layout {
    display: flex;
    gap: 1.5rem;
    padding: 1rem;
    min-height: 100vh;
    background: #111;
    color: #ddd;
    font-family: system-ui, sans-serif;
    font-size: 0.85rem;
  }

  @media (max-width: 800px) {
    .cal-layout {
      flex-direction: column;
    }
  }

  .panel {
    flex: 1;
    min-width: 0;
  }
  .controls {
    max-width: 420px;
    flex-shrink: 0;
    overflow-y: auto;
    max-height: 100vh;
  }
  .preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }

  h2 {
    margin: 0 0 0.2rem;
    font-size: 1.1rem;
    color: #8cf;
  }
  .subtitle {
    margin: 0 0 0.8rem;
    font-size: 0.75rem;
    color: #777;
  }

  fieldset {
    border: 1px solid #333;
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    margin: 0 0 0.6rem;
  }
  legend {
    font-size: 0.78rem;
    color: #aaa;
    font-weight: 600;
  }

  .slider-row {
    margin: 0.25rem 0;
  }
  .slider-row label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: #ccc;
  }
  .slider-row input[type="range"] {
    flex: 1;
    accent-color: #6af;
  }
  .slider-row span {
    min-width: 4.5em;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #8cf;
    font-size: 0.78rem;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .radio-group label {
    font-size: 0.78rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .radio-group em {
    color: #666;
    font-size: 0.7rem;
  }

  .swatch-preview {
    width: 100%;
    height: 28px;
    border-radius: 4px;
    margin-top: 0.3rem;
    border: 1px solid #444;
  }

  .preset-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.3rem;
  }
  .preset-btn {
    padding: 0.2em 0.5em;
    font-size: 0.7rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #222;
    color: #bbb;
    cursor: pointer;
  }
  .preset-btn:hover {
    background: #333;
    color: #fff;
  }

  .checkbox-row {
    font-size: 0.78rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }
  .checkbox-row input {
    accent-color: #6af;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    font-size: 0.72rem;
    color: #888;
    margin-top: 0.4rem;
  }
  .stats strong {
    color: #adf;
  }

  /* ── Grid ── */
  .axis-info {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: min(100%, calc(100dvh - 14rem));
  }
  .axis-label {
    font-size: 0.7rem;
    color: #666;
  }

  .grid {
    display: grid;
    gap: 2px;
    width: 100%;
    max-width: min(100%, calc(100dvh - 14rem));
    container-type: inline-size;
  }
  .swatch {
    aspect-ratio: 1;
    width: 100%;
    border: none;
    padding: 0;
    border-radius: 3px;
    cursor: default;
    min-width: 24px;
    min-height: 24px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .swatch:hover {
    transform: scale(1.05);
    z-index: 1;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.7);
  }
  .cell-label {
    font-size: min(0.5rem, 1.8cqi);
    line-height: 1;
    color: rgba(255, 255, 255, 0.85);
    text-shadow:
      0 0 3px rgba(0, 0, 0, 0.9),
      0 0 1px rgba(0, 0, 0, 1);
    pointer-events: none;
    text-align: center;
  }
  .center-cell {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.85);
  }
  .out-of-gamut::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 3px;
    border: 1px dashed rgba(255, 255, 255, 0.25);
  }

  /* ── Page nav ── */
  .page-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .page-nav-label {
    font-size: 0.72rem;
    color: #888;
    white-space: nowrap;
  }
  .page-pills {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .page-pill {
    width: 32px;
    height: 22px;
    border-radius: 11px;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition:
      border-color 0.12s,
      transform 0.12s;
  }
  .page-pill:hover {
    transform: scale(1.12);
  }
  .page-pill.active {
    border-color: #fff;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
    transform: scale(1.15);
  }

  .page-label {
    font-size: 0.68rem;
    color: #666;
  }
  .hint {
    font-size: 0.62rem;
    color: #555;
    margin-top: 0.2rem;
  }

  /* ── Shift buttons ── */
  .grid-with-shifts {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
    max-width: min(100%, calc(100dvh - 14rem));
  }
  .grid-row-with-sides {
    display: flex;
    align-items: stretch;
    gap: 4px;
    width: 100%;
  }
  .grid-row-with-sides > .grid {
    flex: 1;
    min-width: 0;
    /* override the grid's own max-width since parent constrains */
    max-width: none;
  }
  .shift-btn {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 5px;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.3em 0.8em;
    white-space: nowrap;
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
  }
  .shift-btn:hover:not([disabled]) {
    filter: brightness(1.15);
  }
  .shift-btn[disabled] {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .shift-top,
  .shift-bottom {
    width: 50%;
    text-align: center;
  }
  .shift-side {
    writing-mode: vertical-lr;
    text-orientation: mixed;
    padding: 0.5em 0.3em;
    min-width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Two-step demo ── */
  .two-step-header {
    text-align: center;
    margin-bottom: 0.3rem;
  }
  .two-step-header strong {
    color: #8f8;
    font-size: 0.85rem;
  }
  .phase-label {
    display: block;
    font-size: 0.72rem;
    color: #aaa;
    margin: 0.15rem 0;
  }
  .two-step-actions {
    display: flex;
    gap: 0.4rem;
    justify-content: center;
    margin-top: 0.2rem;
  }
  .swatch.clickable {
    cursor: pointer;
  }
  .swatch.clickable:hover {
    transform: scale(1.08);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
  }
  .final-pick {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.3rem;
    font-size: 0.78rem;
  }
  .final-swatch {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    border: 2px solid #fff;
  }
</style>
