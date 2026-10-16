<script setup>
import { computed, ref } from "vue";
import { useScene } from "../composables/useWeatherglass.js";
import { usePointerDrag } from "../composables/usePointerDrag.js";
import { seasonKeys } from "../ui/icons.js";
import {
  linearColor,
  seasonLabel,
  seasonNames,
  shortestDelta,
  vibrate,
  wheelAmount,
  wrap,
} from "../ui/weather.js";
import UiIcon from "./UiIcon.js";

const game = useScene();
const ctx = game.api.value.ctx;
const dial = ref(null);
const season = ref(wrap(ctx.world.season, 4));
const dragging = ref(false);
const tint = ref("100 140 80");
const tint2 = ref("80 120 60");
const picked = ref(-1);
const label = computed(() => seasonLabel(season.value));
let dragTarget = 0;
let pressTarget = null;
let pressedGlyph = -1;
let lastHeart = null;
let lastEmit = 0;
const ticks = Array.from({ length: 12 }, (_, index) => index)
  .filter((index) => index % 3)
  .map((index) => {
    const angle = (index / 12) * Math.PI * 2;
    return {
      x1: 50 + Math.sin(angle) * 35,
      y1: 50 - Math.cos(angle) * 35,
      x2: 50 + Math.sin(angle) * 37.4,
      y2: 50 - Math.cos(angle) * 37.4,
    };
  });
function near(index) {
  return (
    Math.round(
      Math.max(0, 1 - Math.abs(shortestDelta(season.value - index, 4)) * 1.15) *
        40,
    ) / 40
  ).toFixed(3);
}
function angleSeason(event, bounds) {
  return wrap(
    (Math.atan2(
      event.clientX - bounds.left - bounds.width / 2,
      -(event.clientY - bounds.top - bounds.height / 2),
    ) /
      (Math.PI * 2)) *
      4,
    4,
  );
}
function emitSeason(force = false) {
  const now = performance.now();
  if (!force && now - lastEmit < 120) return;
  lastEmit = now;
  ctx.events.emit("season", { season: ctx.world.season });
}
function glideTo(value) {
  ctx.world.setSeasonTarget(value);
  game.markUse("season");
  ctx.events.emit("season", { season: value, target: true });
  game.play("chime", { volume: 0.14, pitch: 0.9 + value * 0.12 });
  vibrate(8);
  picked.value = value;
  game.later(() => {
    picked.value = -1;
  }, 500);
}
function nudge(amount) {
  ctx.world.seasonTarget = null;
  ctx.world.season = wrap(ctx.world.season + amount, 4);
  game.markUse("season");
  emitSeason();
}
function startDrag(value) {
  dragging.value = true;
  dragTarget = value;
  ctx.world.seasonTarget = null;
  lastHeart = Math.round(ctx.world.season) & 3;
}
const drag = usePointerDrag(dial, {
  onDown(event, bounds) {
    const glyph = event.target.closest?.(".wg-dial-glyph");
    const radius =
      Math.hypot(
        event.clientX - bounds.left - bounds.width / 2,
        event.clientY - bounds.top - bounds.height / 2,
      ) /
      (bounds.width / 2);
    pressedGlyph = glyph ? Number(glyph.dataset.s) : -1;
    pressTarget = glyph ? "glyph" : radius > 0.7 ? "ring" : "centre";
    game.markUse("season");
    if (pressTarget === "ring") startDrag(angleSeason(event, bounds));
  },
  onDrag(event, bounds) {
    if (!dragging.value) startDrag(angleSeason(event, bounds));
    dragTarget = angleSeason(event, bounds);
    game.markUse("season");
  },
  onUp(event, bounds, moved, cancelled) {
    if (dragging.value) {
      dragging.value = false;
      emitSeason(true);
    } else if (!moved && !cancelled) {
      if (pressTarget === "glyph" && pressedGlyph >= 0) glideTo(pressedGlyph);
      else if (pressTarget === "centre")
        glideTo((Math.round(ctx.world.season) + 1) & 3);
    }
  },
});
function keydown(event) {
  const actions = {
    ArrowRight: () => nudge(0.05),
    ArrowUp: () => nudge(0.05),
    ArrowLeft: () => nudge(-0.05),
    ArrowDown: () => nudge(-0.05),
    PageUp: () => glideTo((Math.round(ctx.world.season) + 1) & 3),
    Enter: () => glideTo((Math.round(ctx.world.season) + 1) & 3),
    " ": () => glideTo((Math.round(ctx.world.season) + 1) & 3),
    PageDown: () => glideTo((Math.round(ctx.world.season) + 3) & 3),
    Home: () => glideTo(0),
  };
  if (actions[event.key]) {
    event.preventDefault();
    event.stopPropagation();
    actions[event.key]();
  }
}
game.onFrame((delta) => {
  const world = ctx.world;
  if (dragging.value) {
    world.seasonTarget = null;
    world.season = wrap(
      world.season +
        shortestDelta(dragTarget - world.season, 4) *
          (delta > 0 ? 1 - Math.exp(-delta * 16) : 1),
      4,
    );
    const heart = Math.round(world.season) & 3;
    if (
      heart !== lastHeart &&
      Math.abs(shortestDelta(world.season - Math.round(world.season), 4)) < 0.12
    ) {
      lastHeart = heart;
      vibrate(5);
      game.play("tink", { volume: 0.06, pitch: 1.4 + heart * 0.1 });
    }
    emitSeason();
  }
  season.value = wrap(world.season, 4);
  if (world.seasonal.foliage) tint.value = linearColor(world.seasonal.foliage);
  if (world.seasonal.grass) tint2.value = linearColor(world.seasonal.grass);
});
</script>

<template>
  <div
    ref="dial"
    class="wg-dial"
    :class="{ 'is-dragging': dragging }"
    :style="{ '--tint': tint, '--tint2': tint2 }"
    role="slider"
    tabindex="0"
    aria-label="Season dial"
    aria-valuemin="0"
    aria-valuemax="4"
    :aria-valuenow="season.toFixed(2)"
    :aria-valuetext="`${label.sub} ${label.name}`.trim()"
    v-on="drag"
    @wheel.prevent="nudge(wheelAmount($event) * 0.0016)"
    @keydown="keydown"
  >
    <div class="wg-dial-dish"></div>
    <div class="wg-dial-ring"></div>
    <div class="wg-dial-glow"></div>
    <svg class="wg-dial-ticks" viewBox="0 0 100 100" aria-hidden="true">
      <line v-for="(tick, index) in ticks" :key="index" v-bind="tick" />
    </svg>
    <div
      v-for="(key, index) in seasonKeys"
      :key="key"
      :class="[
        `wg-dial-glyph wg-g-${key}`,
        {
          'is-near': Number(near(index)) > 0.55,
          'is-picked': picked === index,
        },
      ]"
      :style="{ '--a': `${index * 90}deg`, '--near': near(index) }"
      :data-s="index"
      :title="seasonNames[index]"
      aria-hidden="true"
    >
      <UiIcon :name="key" />
    </div>
    <div
      class="wg-dial-arm"
      aria-hidden="true"
      :style="{ transform: `rotate(${(season * 90).toFixed(2)}deg)` }"
    >
      <span class="wg-dial-knob"></span>
    </div>
    <div class="wg-dial-label">
      <span class="wg-dial-sub">{{ label.sub }}</span
      ><span class="wg-dial-name">{{ label.name }}</span>
    </div>
  </div>
</template>
