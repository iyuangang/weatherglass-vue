<script setup>
import { computed, onMounted, onScopeDispose, ref } from "vue";
import { useScene } from "../composables/useWeatherglass.js";
import { usePointerDrag } from "../composables/usePointerDrag.js";
import {
  clamp,
  formatTime,
  shortestDelta,
  timePhase,
  timeX,
  timeY,
  wheelAmount,
  wrap,
} from "../ui/weather.js";
import UiIcon from "./UiIcon.js";

const game = useScene();
const { view } = game;
const ctx = game.api.value.ctx;
const track = ref(null);
const dragging = ref(false);
const time = ref(wrap(ctx.world.timeOfDay, 1));
const width = ref(200);
const height = ref(56);
const skyColor = ref("180 190 200");
let target = null;
let glide = null;
let wrote;
let observer;
const arc = Array.from({ length: 65 }, (_, index) => {
  const fraction = index / 64;
  return `${index ? "L" : "M"}${(timeX(fraction) * 200).toFixed(2)} ${(timeY(fraction) * 56).toFixed(2)}`;
}).join("");
const knobStyle = computed(() => ({
  transform: `translate(${(timeX(time.value) * width.value).toFixed(1)}px, ${(timeY(time.value) * height.value).toFixed(1)}px)`,
  "--night": (
    Math.round(
      clamp(0.5 - Math.sin((time.value - 0.25) * Math.PI * 2) * 6, 0, 1) * 20,
    ) / 20
  ).toFixed(2),
}));
function timeAt(event, bounds) {
  return wrap(
    ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.035) / 0.93,
    1,
  );
}
function stopSky() {
  const sky = ctx.modules.sky;
  if (sky) {
    sky.glide = null;
    sky.timeVel = 0;
  }
}
function glideTo(value) {
  game.markUse("time");
  if (ctx.modules.sky?.glideTo) {
    ctx.modules.sky.timeVel = 0;
    ctx.modules.sky.glideTo(value);
    glide = null;
  } else glide = wrap(value, 1);
  game.play("tink", { volume: 0.06, pitch: 1.2 });
}
function nudge(amount) {
  stopSky();
  glide = null;
  ctx.world.timeOfDay = wrap(ctx.world.timeOfDay + amount, 1);
  game.markUse("time");
}
const drag = usePointerDrag(track, {
  onDown() {
    game.markUse("time");
  },
  onDrag(event, bounds, first) {
    if (first) {
      dragging.value = true;
      glide = null;
      stopSky();
    }
    target = timeAt(event, bounds);
    game.markUse("time");
  },
  onUp(event, bounds, moved, cancelled) {
    game.markUse("time");
    if (dragging.value) {
      dragging.value = false;
      target = null;
    } else if (!moved && !cancelled) glideTo(timeAt(event, bounds));
  },
});
function keydown(event) {
  const actions = {
    ArrowRight: () => nudge(1 / 96),
    ArrowUp: () => nudge(1 / 96),
    ArrowLeft: () => nudge(-1 / 96),
    ArrowDown: () => nudge(-1 / 96),
    PageUp: () => nudge(1 / 24),
    PageDown: () => nudge(-1 / 24),
    Home: () => glideTo(0.25),
    End: () => glideTo(0.75),
  };
  if (actions[event.key]) {
    event.preventDefault();
    event.stopPropagation();
    actions[event.key]();
  }
}
game.onEvent("scenario", () => {
  glide = null;
});
game.onFrame((delta) => {
  const world = ctx.world;
  if (
    glide !== null &&
    wrote !== undefined &&
    Math.abs(world.timeOfDay - wrote) > 1e-6
  )
    glide = null;
  wrote = undefined;
  const destination = dragging.value ? target : glide;
  if (destination !== null) {
    const difference = shortestDelta(destination - world.timeOfDay, 1);
    const smoothing =
      delta > 0 ? 1 - Math.exp(-delta * (dragging.value ? 14 : 5)) : 1;
    if (dragging.value) {
      stopSky();
      game.markUse("time");
    }
    if (!dragging.value && Math.abs(difference) < 0.0015) {
      world.timeOfDay = wrap(destination, 1);
      glide = null;
    } else {
      world.timeOfDay = wrap(world.timeOfDay + difference * smoothing, 1);
      if (!dragging.value) wrote = world.timeOfDay;
    }
  }
  time.value = wrap(world.timeOfDay, 1);
  const haze = world.hazeColor;
  if (haze)
    skyColor.value = ["r", "g", "b"]
      .map((channel) =>
        Math.round(clamp(Math.max(0, haze[channel]) ** (1 / 2.2), 0, 1) * 255),
      )
      .join(" ");
});
onMounted(() => {
  observer = new ResizeObserver(() => {
    const bounds = track.value.getBoundingClientRect();
    if (bounds.width > 0) {
      width.value = bounds.width;
      height.value = bounds.height;
    }
  });
  observer.observe(track.value);
});
onScopeDispose(() => observer?.disconnect());
</script>

<template>
  <div
    class="wg-panel wg-time"
    :class="{ 'is-playing': view.playing, 'is-night': ctx.world.night > 0.5 }"
    :style="{ '--sky': skyColor }"
  >
    <div class="wg-time-head">
      <button
        class="wg-ibtn wg-play"
        type="button"
        :aria-pressed="view.playing"
        :aria-label="view.playing ? 'Pause the day' : 'Play the day'"
        @click="game.togglePlay"
      >
        <UiIcon name="play" /><UiIcon name="pause" />
      </button>
      <div class="wg-time-read">
        <span class="wg-time-clock">{{ view.clock }}</span
        ><span class="wg-time-phase">{{ timePhase(time) }}</span>
      </div>
    </div>
    <div
      ref="track"
      class="wg-time-track"
      :class="{ 'is-dragging': dragging }"
      role="slider"
      tabindex="0"
      aria-label="Time of day"
      aria-valuemin="0"
      aria-valuemax="24"
      :aria-valuenow="(time * 24).toFixed(2)"
      :aria-valuetext="`${formatTime(time)}, ${timePhase(time)}`"
      v-on="drag"
      @wheel.prevent="nudge(wheelAmount($event) * 0.00045)"
      @keydown="keydown"
    >
      <svg
        class="wg-time-svg"
        viewBox="0 0 200 56"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="wg-clip-day">
            <rect x="0" y="0" width="200" height="28" />
          </clipPath>
          <clipPath id="wg-clip-night">
            <rect x="0" y="28" width="200" height="28" />
          </clipPath>
          <linearGradient id="wg-day-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffd98a" stop-opacity=".30" />
            <stop offset="1" stop-color="#ffd98a" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="wg-day-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.22" stop-color="#f3a36a" />
            <stop offset="0.5" stop-color="#ffe2a0" />
            <stop offset="0.78" stop-color="#f3a36a" />
          </linearGradient>
        </defs>
        <path
          class="wg-time-dayfill"
          :d="`${arc}L200 28L0 28Z`"
          clip-path="url(#wg-clip-day)"
        />
        <path class="wg-time-night" :d="arc" clip-path="url(#wg-clip-night)" />
        <line class="wg-time-horizon" x1="0" y1="28" x2="200" y2="28" />
        <path class="wg-time-day" :d="arc" clip-path="url(#wg-clip-day)" />
        <line
          v-for="tick in [0.25, 0.5, 0.75]"
          :key="tick"
          class="wg-time-tick"
          :x1="(timeX(tick) * 200).toFixed(2)"
          y1="25"
          :x2="(timeX(tick) * 200).toFixed(2)"
          y2="31"
        />
      </svg>
      <div class="wg-time-knob" aria-hidden="true" :style="knobStyle">
        <span class="wg-time-disc"></span><UiIcon name="sunFace" /><UiIcon
          name="moonFace"
        />
      </div>
    </div>
  </div>
</template>
