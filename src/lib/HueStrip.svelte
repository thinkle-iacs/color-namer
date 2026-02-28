<script lang="ts">
  const { swatches, activeIndex, centerIndex = null, onselect } = $props<{
    swatches: Array<{ style: string; label: string }>;
    activeIndex: number;
    centerIndex?: number | null;
    onselect: (index: number) => void;
  }>();
</script>

<div class="hue-strip-wrap">
  <span class="strip-label">hue</span>
  <div class="hue-strip">
    {#each swatches as swatch, i}
      <button
        class="hue-btn"
        class:active={i === activeIndex}
        style={swatch.style}
        aria-label={swatch.label}
        onclick={() => onselect(i)}
      >
        {#if i === centerIndex}
          <span class="center-dot"></span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
.hue-strip-wrap { display: flex; align-items: center; gap: 0.5rem; width: 100%; margin-bottom: 0.4rem; }
.strip-label { font-size: 0.62rem; color: #666; flex-shrink: 0; }
.hue-strip { display: flex; gap: 3px; flex: 1; }
.hue-btn { flex: 1; height: 1.6rem; border: 2px solid transparent; border-radius: 4px; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: border-color 0.1s; }
.hue-btn:hover { border-color: rgba(255, 255, 255, 0.5); }
.hue-btn.active { border-color: #fff; box-shadow: 0 0 0 1px #77b6ff; }
.center-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(255, 255, 255, 0.8); box-shadow: 0 0 3px rgba(0, 0, 0, 0.8); }
</style>
