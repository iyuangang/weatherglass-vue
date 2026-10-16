<script setup>
import { onMounted, provide, ref } from "vue";
import { sceneKey, useWeatherglass } from "./composables/useWeatherglass.js";
import WeatherHud from "./components/WeatherHud.vue";

const canvas = ref(null);
const game = useWeatherglass();
const { api, view } = game;
provide(sceneKey, game);
onMounted(() => game.mount(canvas.value));
</script>

<template>
  <canvas
    id="scene"
    ref="canvas"
    aria-label="Interactive weather terrarium"
  ></canvas>
  <div id="ui"><WeatherHud v-if="api" /></div>
  <div id="veil" :aria-hidden="view.ready">
    <div class="veil-inner">
      <div class="veil-title">Weatherglass</div>
      <div class="veil-sub">sealing the atmosphere…</div>
    </div>
  </div>
  <div
    id="fatal"
    :style="{ display: view.error ? 'block' : 'none' }"
    role="alert"
  >
    {{ view.error }}
  </div>
</template>
