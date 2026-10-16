<script setup>
import { ref } from "vue";
import { useScene } from "../composables/useWeatherglass.js";
import { tools } from "../ui/icons.js";
import UiIcon from "./UiIcon.js";

const game = useScene();
const { view } = game;
const pointerType = ref("mouse");
const explained = new Set();
function select(tool) {
  if (
    pointerType.value !== "mouse" &&
    (view.tool === tool.id || !explained.has(tool.id))
  ) {
    explained.add(tool.id);
    game.toast(tool.desc, 3200, { icon: tool.id });
  }
  game.setTool(tool.id);
}
</script>

<template>
  <div
    class="wg-panel wg-toolbar"
    role="toolbar"
    aria-label="Tools"
    :style="{ '--i': tools.findIndex((tool) => tool.id === view.tool) }"
    @pointerdown="pointerType = $event.pointerType"
  >
    <span class="wg-puck is-moving" aria-hidden="true"></span>
    <button
      v-for="(tool, index) in tools"
      :key="tool.id"
      class="wg-tool"
      :class="{
        'is-active': view.tool === tool.id,
        'is-popping': view.tool === tool.id && view.tool !== 'hand',
      }"
      type="button"
      :style="{ '--n': index }"
      :data-tool="tool.id"
      :aria-label="`${tool.label} tool (${tool.key}) — ${tool.desc}`"
      :aria-pressed="view.tool === tool.id"
      @click="select(tool)"
    >
      <UiIcon :name="tool.id" /><span class="wg-tool-label">{{
        tool.label
      }}</span>
      <span class="wg-tip" role="tooltip"
        ><span class="wg-tip-head"
          ><b>{{ tool.label }}</b
          ><kbd>{{ tool.key }}</kbd></span
        ><span class="wg-tip-body">{{ tool.desc }}</span></span
      >
    </button>
  </div>
</template>
