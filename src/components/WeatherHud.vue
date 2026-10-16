<script setup>
import { useScene } from "../composables/useWeatherglass.js";
import TopActions from "./TopActions.vue";
import ToolBar from "./ToolBar.vue";
import TimeControl from "./TimeControl.vue";
import SeasonDial from "./SeasonDial.vue";
import TemperatureControl from "./TemperatureControl.vue";
import CoachTips from "./CoachTips.vue";
import UiIcon from "./UiIcon.js";
import RealWorldPanel from "./RealWorldPanel.vue";

const game = useScene();
const { compact, drawerOpen, hidden, view, toasts } = game;
const shieldEvents = Object.fromEntries(
  [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "wheel",
    "click",
    "dblclick",
    "touchstart",
    "touchmove",
  ].map((name) => [name, (event) => event.stopPropagation()]),
);
</script>

<template>
  <div
    class="wg-hud has-reality"
    :class="{
      'is-compact': compact,
      'is-drawer-open': drawerOpen,
      'is-real-open': game.live.state.panelOpen,
    }"
    v-on="shieldEvents"
    @contextmenu.prevent
    @dragstart.prevent
    @selectstart.prevent
  >
    <TopActions />
    <RealWorldPanel />
    <div class="wg-bottom">
      <ToolBar />
      <button
        class="wg-panel wg-drawer-btn"
        :class="{ 'is-active': drawerOpen }"
        type="button"
        :aria-expanded="drawerOpen"
        aria-controls="wg-dock"
        aria-label="Time, temperature & season"
        @click="game.setDrawer(!drawerOpen)"
      >
        <UiIcon name="climate" /><span class="wg-tool-label">Climate</span>
      </button>
    </div>
    <div id="wg-dock" class="wg-dock">
      <TimeControl />
      <div class="wg-panel wg-climate">
        <div class="wg-climate-head">
          <span class="wg-temp-row"
            ><span class="wg-temp">{{ view.temperature }}</span
            ><span
              class="wg-offset"
              :class="{ 'is-shown': view.offset !== 0 }"
              >{{
                view.offset
                  ? `${view.offset > 0 ? "+" : "−"}${Math.abs(view.offset)}`
                  : ""
              }}</span
            ></span
          ><span class="wg-cond" :title="view.condition">{{
            view.condition
          }}</span>
        </div>
        <div class="wg-climate-body"><TemperatureControl /><SeasonDial /></div>
      </div>
    </div>
    <div class="wg-toasts" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="item in toasts"
          :key="item.id"
          class="wg-toast is-in"
          role="status"
          @click="game.closeToast(item.id)"
        >
          <span v-if="item.icon" class="wg-toast-ico"
            ><UiIcon :name="item.icon" /></span
          ><span class="wg-toast-text">{{ item.text }}</span>
        </div>
      </TransitionGroup>
      <CoachTips />
    </div>
  </div>
  <Teleport to="body">
    <button
      class="wg-unhide"
      :class="{ 'is-shown': hidden }"
      type="button"
      aria-label="Show controls (U)"
      title="Show controls (U)"
      v-on="shieldEvents"
      @click="game.setHidden(false)"
    >
      <UiIcon name="eye" />
    </button>
  </Teleport>
</template>

<style>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.42s,
    transform 0.42s;
}
.wg-toast.toast-enter-from,
.wg-toast.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
</style>
