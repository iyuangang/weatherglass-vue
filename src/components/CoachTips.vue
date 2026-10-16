<script setup>
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from "vue";
import { useScene } from "../composables/useWeatherglass.js";
import { coachStorageKey, tips } from "../ui/tips.js";
import { shortestDelta } from "../ui/weather.js";
import UiIcon from "./UiIcon.js";

const game = useScene();
const ctx = game.api.value.ctx;
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(coachStorageKey) || "{}");
} catch {
  /* Storage may be disabled. */
}
const force = ctx.params.get("coach") === "1";
const done = ref(
  force
    ? false
    : !!saved.done || ctx.params.has("shot") || ctx.params.get("ui") === "0",
);
const seen = ref(
  new Set(force ? [] : Array.isArray(saved.seen) ? saved.seen : []),
);
const current = ref(-1);
const visible = ref(false);
const busy = ref(false);
let highlight = null;
let lastGrab = -1e9;
let strokes = 0;
let sunAccum = 0;
let lastTime = ctx.world.timeOfDay;
let lastScenario = 0;
let slowAt = 0;
const tip = computed(() => tips[current.value]);
const text = computed(() =>
  tip.value?.id === "wind" && game.view.tool === "wind"
    ? tip.value.alt
    : tip.value?.text,
);
function save() {
  try {
    localStorage.setItem(
      coachStorageKey,
      JSON.stringify({ done: done.value, seen: [...seen.value] }),
    );
  } catch {
    /* Keep in-memory progress. */
  }
}
function clearHighlight() {
  highlight?.classList.remove("wg-coach-target");
  highlight = null;
}
function retarget() {
  clearHighlight();
  if (!visible.value || busy.value) return;
  const root = document.querySelector(".wg-hud");
  if (tip.value?.id === "wind" && game.view.tool !== "wind")
    highlight = root?.querySelector('[data-tool="wind"]');
  if (tip.value?.id === "season")
    highlight = root?.querySelector(
      game.compact.value && !game.drawerOpen.value
        ? ".wg-drawer-btn"
        : ".wg-dial",
    );
  highlight?.classList.add("wg-coach-target");
}
function finish(completed = false) {
  done.value = true;
  current.value = -1;
  visible.value = false;
  save();
  clearHighlight();
  if (completed)
    game.later(
      () =>
        game.toast(
          "That’s the whole glass — press U to hide the controls",
          4800,
          { icon: "eye" },
        ),
      500,
    );
}
async function next() {
  if (done.value) return;
  const index = tips.findIndex((item) => !seen.value.has(item.id));
  if (index < 0) return finish(true);
  current.value = index;
  visible.value = true;
  await nextTick();
  retarget();
}
function complete() {
  if (!visible.value || busy.value) return;
  busy.value = true;
  clearHighlight();
  game.play("chime", { volume: 0.1, pitch: 1.5 });
  game.later(() => {
    visible.value = false;
    game.later(() => {
      busy.value = false;
      next();
    }, 650);
  }, 1100);
}
function mark(id) {
  if (seen.value.has(id)) return;
  seen.value = new Set([...seen.value, id]);
  if (!done.value) save();
  if (tip.value?.id === id) complete();
}
function skip() {
  if (busy.value || !tip.value) return;
  seen.value = new Set([...seen.value, tip.value.id]);
  save();
  visible.value = false;
  clearHighlight();
  game.later(next, 300);
}
game.onEvent("cloud:grab", () => {
  lastGrab = performance.now();
  mark("grab");
});
game.onEvent("cloud:squeeze", (event) => {
  if (
    (event.cloud?.grabbed || performance.now() - lastGrab < 15000) &&
    (event.amount ?? 1) > 0.15
  )
    mark("squeeze");
});
game.onEvent("lightning", () => {
  if (performance.now() - lastGrab < 20000) mark("storm");
});
game.onEvent("wind:stroke", () => {
  if (++strokes >= 8) mark("wind");
});
game.onEvent("season", () => mark("season"));
game.onEvent("sky:grab", () => {
  sunAccum += 0.01;
});
game.onEvent("scenario", () => {
  lastScenario = performance.now();
  lastTime = ctx.world.timeOfDay;
});
game.onFrame(() => {
  if (performance.now() - slowAt < 100) return;
  slowAt = performance.now();
  const delta = Math.abs(shortestDelta(ctx.world.timeOfDay - lastTime, 1));
  lastTime = ctx.world.timeOfDay;
  if (seen.value.has("sun") || delta < 1e-5) return;
  if (
    ctx.modules.sky.grabbing ||
    (!game.usedRecently("time", 1500) &&
      !ctx.world.dayCycle &&
      performance.now() - lastScenario > 600)
  ) {
    sunAccum += delta;
    if (sunAccum > 0.025) mark("sun");
  }
});
watch([game.compact, game.drawerOpen, () => game.view.tool], () =>
  nextTick(retarget),
);
onMounted(() => game.later(next, 2600));
onScopeDispose(clearHighlight);
</script>

<template>
  <Transition name="toast">
    <div
      v-if="visible && tip"
      class="wg-toast wg-coach is-in"
      :class="{ 'is-done': busy }"
      role="status"
    >
      <span class="wg-toast-ico wg-coach-ico"
        ><UiIcon :name="tip.icon" /><UiIcon name="check"
      /></span>
      <span class="wg-coach-main"
        ><span class="wg-toast-text">{{ text }}</span
        ><span class="wg-coach-dots" aria-hidden="true"
          ><i
            v-for="(item, index) in tips"
            :key="item.id"
            :class="{
              'is-now': index === current,
              'is-seen': index !== current && seen.has(item.id),
            }"
          ></i></span
      ></span>
      <button
        class="wg-coach-btn"
        type="button"
        aria-label="Next tip"
        title="Next tip"
        @click="skip"
      >
        <UiIcon name="next" />
      </button>
      <button
        class="wg-coach-btn"
        type="button"
        aria-label="Dismiss tips"
        title="Dismiss tips"
        @click="finish(false)"
      >
        <UiIcon name="close" />
      </button>
    </div>
  </Transition>
</template>
