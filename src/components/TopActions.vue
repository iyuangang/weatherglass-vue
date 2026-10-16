<script setup>
import { ref } from "vue";
import { useScene } from "../composables/useWeatherglass.js";
import UiIcon from "./UiIcon.js";

const game = useScene();
const { view, fullscreen } = game;
const fullscreenSupported = !!(
  document.fullscreenEnabled || document.webkitFullscreenEnabled
);
const flash = ref("");
function flashButton(name) {
  flash.value = name;
  game.later(() => {
    flash.value = "";
  }, 500);
}
function clearSkies() {
  game.api.value.ctx.modules.clouds?.clear?.();
  game.play("whoosh", { volume: 0.25 });
  flashButton("clear");
}
function reset() {
  const ctx = game.api.value.ctx;
  game.api.value.scenario("calm");
  ctx.fields.clear?.();
  ctx.modules.fog?.clear?.();
  ctx.world.waterRise = 0;
  game.play("chime", { volume: 0.16, pitch: 1 });
  flashButton("reset");
}
</script>

<template>
  <div
    class="wg-brand"
    :class="{ 'is-snow': view.snowing, 'is-wet': view.wet }"
  >
    <div class="wg-title">Weatherglass</div>
    <div class="wg-readout">
      <span class="wg-ro" title="Humidity"
        ><span class="wg-ro-ico"><UiIcon name="drop" /></span
        ><b>{{ view.humidity }}</b></span
      >
      <span class="wg-ro" title="Wind"
        ><span class="wg-ro-ico"><UiIcon name="breeze" /></span
        ><b>{{ view.wind }}</b></span
      >
      <span class="wg-ro" title="Precipitation"
        ><span class="wg-ro-ico wg-ro-prec"
          ><UiIcon name="rain" /><UiIcon name="flake" /></span
        ><b>{{ view.precipitation }}</b></span
      >
    </div>
  </div>
  <div class="wg-panel wg-actions" role="group" aria-label="View">
    <button
      class="wg-ibtn"
      :class="{ 'is-flash': flash === 'clear' }"
      type="button"
      data-act="clear"
      aria-label="Clear skies"
      @click="clearSkies"
    >
      <UiIcon name="clear" /><span class="wg-tip wg-tip-below"
        >Clear skies</span
      >
    </button>
    <button
      class="wg-ibtn"
      :class="{ 'is-flash': flash === 'reset' }"
      type="button"
      data-act="reset"
      aria-label="Reset to a calm spring day"
      @click="reset"
    >
      <UiIcon name="reset" /><span class="wg-tip wg-tip-below"
        >Reset to a calm spring day</span
      >
    </button>
    <button
      class="wg-ibtn"
      :class="{ 'is-on': view.soundOn }"
      type="button"
      data-act="sound"
      aria-label="Sound on / off"
      :aria-pressed="view.soundOn"
      @click="game.toggleSound"
    >
      <UiIcon name="soundOff" /><UiIcon name="soundOn" /><span
        class="wg-tip wg-tip-below"
        >Sound on / off</span
      >
    </button>
    <button
      :hidden="!fullscreenSupported"
      class="wg-ibtn"
      :class="{ 'is-on': fullscreen }"
      type="button"
      data-act="fullscreen"
      aria-label="Fullscreen"
      @click="game.toggleFullscreen"
    >
      <UiIcon name="fullscreen" /><UiIcon name="fullscreenExit" /><span
        class="wg-tip wg-tip-below"
        >Fullscreen</span
      >
    </button>
    <button
      class="wg-ibtn"
      type="button"
      data-act="hide"
      aria-label="Hide controls (U)"
      @click="game.setHidden(true)"
    >
      <UiIcon name="eyeOff" /><span class="wg-tip wg-tip-below"
        >Hide controls (U)</span
      >
    </button>
  </div>
</template>
