<script setup>
import { computed, onMounted, onScopeDispose, ref } from "vue";
import { useScene } from "../composables/useWeatherglass.js";
import { usePointerDrag } from "../composables/usePointerDrag.js";
import {
  clamp,
  formatTemperature,
  mercuryColor,
  vibrate,
  wheelAmount,
} from "../ui/weather.js";

const game = useScene();
const world = game.api.value.ctx.world;
const element = ref(null);
const rail = ref(null);
const railHeight = ref(96);
const offset = ref(world.tempOffset);
const temperature = ref(world.seaLevelTemp ?? 10);
const level = ref(null);
const dragging = ref(false);
let target = null;
let railBounds;
let observer;
const style = computed(() => ({
  "--merc": mercuryColor(temperature.value),
  "--warm": offset.value > 0.4 ? "1" : offset.value < -0.4 ? "-1" : "0",
}));
function setOffset(value) {
  const previous = world.tempOffset;
  world.tempOffset = clamp(value, -15, 15);
  if (previous !== 0 && world.tempOffset === 0) {
    vibrate();
    game.play("tink", { volume: 0.05, pitch: 1.1 });
  }
  game.markUse("temp");
}
const drag = usePointerDrag(element, {
  immediate: true,
  onDown() {
    target = null;
    railBounds = rail.value.getBoundingClientRect();
    game.markUse("temp");
  },
  onDrag(event) {
    dragging.value = true;
    let value =
      clamp(
        1 - (event.clientY - railBounds.top) / Math.max(1, railBounds.height),
        0,
        1,
      ) *
        30 -
      15;
    if (Math.abs(value) < 0.8) value = 0;
    setOffset(Math.round(value * 10) / 10);
  },
  onUp() {
    dragging.value = false;
  },
});
function keydown(event) {
  const actions = {
    ArrowUp: () => setOffset(Math.round(world.tempOffset) + 1),
    ArrowRight: () => setOffset(Math.round(world.tempOffset) + 1),
    ArrowDown: () => setOffset(Math.round(world.tempOffset) - 1),
    ArrowLeft: () => setOffset(Math.round(world.tempOffset) - 1),
    Home: () => {
      target = 0;
    },
    0: () => {
      target = 0;
    },
  };
  if (actions[event.key]) {
    event.preventDefault();
    event.stopPropagation();
    actions[event.key]();
  }
}
function wheel(event) {
  target = null;
  setOffset(
    Math.round((world.tempOffset - wheelAmount(event) * 0.02) * 10) / 10,
  );
}
game.onEvent("scenario", () => {
  target = null;
});
game.onFrame((delta) => {
  if (target !== null && !dragging.value) {
    const next =
      world.tempOffset +
      (target - world.tempOffset) * (delta > 0 ? 1 - Math.exp(-delta * 7) : 1);
    world.tempOffset = Math.abs(next - target) < 0.05 ? target : next;
    if (world.tempOffset === target) target = null;
    game.markUse("temp");
  }
  temperature.value = world.seaLevelTemp ?? 10;
  offset.value = world.tempOffset;
  const destination = clamp((temperature.value + 20) / 60, 0.02, 1);
  level.value =
    level.value === null
      ? destination
      : level.value +
        (destination - level.value) *
          (delta > 0 ? 1 - Math.exp(-delta * 5) : 1);
});
onMounted(() => {
  observer = new ResizeObserver(() => {
    const bounds = rail.value.getBoundingClientRect();
    if (bounds.height > 0) railHeight.value = bounds.height;
  });
  observer.observe(rail.value);
});
onScopeDispose(() => observer?.disconnect());
</script>

<template>
  <div
    ref="element"
    class="wg-thermo"
    :class="{ 'is-dragging': dragging }"
    :style="style"
    role="slider"
    tabindex="0"
    aria-label="Temperature (warmer / colder)"
    aria-valuemin="-15"
    aria-valuemax="15"
    :aria-valuenow="offset.toFixed(1)"
    :aria-valuetext="`${offset >= 0 ? '+' : '−'}${Math.abs(offset).toFixed(0)} °C, now ${formatTemperature(temperature)}`"
    title="Drag: warmer / colder · double-click to reset"
    v-on="drag"
    @dblclick.prevent="
      target = 0;
      game.markUse('temp');
    "
    @wheel.prevent="wheel"
    @keydown="keydown"
  >
    <span class="wg-thermo-mark wg-thermo-plus" aria-hidden="true">+</span>
    <div class="wg-thermo-tube">
      <div
        class="wg-thermo-merc"
        :style="{ transform: `scaleY(${(level ?? 0).toFixed(3)})` }"
      ></div>
      <span class="wg-thermo-scale"></span>
    </div>
    <div class="wg-thermo-bulb"></div>
    <div ref="rail" class="wg-thermo-rail">
      <span class="wg-thermo-zero"></span>
      <div
        class="wg-thermo-tab"
        :style="{
          transform: `translateY(${((1 - (clamp(offset, -15, 15) + 15) / 30) * railHeight).toFixed(1)}px)`,
        }"
      ></div>
    </div>
    <span class="wg-thermo-mark wg-thermo-minus" aria-hidden="true">−</span>
  </div>
</template>
