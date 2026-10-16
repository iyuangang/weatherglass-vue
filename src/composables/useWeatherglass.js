import { inject, onScopeDispose, reactive, ref, shallowRef, watch } from "vue";
import { useRealWorld } from "./useRealWorld.js";
import { createRealityDriver } from "../engine/realityDriver.js";
import { isSnowCode, weatherLabel } from "../services/weatherApi.js";
import {
  conditionLabel,
  formatTemperature,
  formatTime,
  precipitationLabel,
  windLabel,
  wrap,
} from "../ui/weather.js";

export const sceneKey = Symbol("weatherglass");
export const useScene = () => inject(sceneKey);

export function useWeatherglass() {
  const api = shallowRef(null);
  const compact = ref(false);
  const drawerOpen = ref(false);
  const hidden = ref(false);
  const fullscreen = ref(false);
  const live = useRealWorld();
  let realityDriver;
  const view = reactive({
    ready: false,
    error: "",
    tool: "hand",
    soundOn: true,
    playing: false,
    clock: "15:14",
    temperature: "18°",
    offset: 0,
    condition: "sunny",
    humidity: "50%",
    wind: "still",
    precipitation: "dry",
    snowing: false,
    wet: false,
  });
  const frames = new Set();
  const uses = new Map();
  const toasts = ref([]);
  const timers = new Set();
  let disposed = false;
  let lastSync = 0;
  let toastId = 0;

  const later = (callback, duration) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!disposed) callback();
    }, duration);
    timers.add(timer);
    return timer;
  };
  function toast(text, duration = 3200, { icon = null } = {}) {
    if (!String(text || "").trim()) return;
    const duplicate = toasts.value.find((item) => item.text === text);
    const item = duplicate || { id: ++toastId, text, icon };
    if (duplicate) clearTimeout(duplicate.timer);
    else toasts.value = [...toasts.value, item].slice(-3);
    item.timer = later(() => closeToast(item.id), Math.max(800, duration));
    return { close: () => closeToast(item.id) };
  }
  function closeToast(id) {
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }
  function play(name, options) {
    api.value?.ctx.audio?.play?.(name, options);
  }
  function sync(ctx = api.value?.ctx) {
    if (!ctx) return;
    const world = ctx.world;
    const actual = live.state.enabled ? live.state.weather : null;
    Object.assign(view, {
      tool: ctx.input.tool,
      soundOn: ctx.audio?.muted === false,
      playing: !!world.dayCycle,
      clock: live.state.enabled
        ? live.state.sky?.clock.clock.slice(0, 5) || "--:--"
        : formatTime(world.timeOfDay),
      temperature: actual
        ? formatTemperature(actual.temperature)
        : live.state.enabled
          ? "—"
          : formatTemperature(world.seaLevelTemp ?? 10),
      offset: Math.round(world.tempOffset || 0),
      condition: actual
        ? weatherLabel(actual.code)
        : live.state.enabled
          ? live.state.phase === "error"
            ? "天气暂不可用"
            : "正在同步天气"
          : conditionLabel(world),
      humidity: `${Math.round((actual?.humidity ?? world.humidity ?? 0) * 100)}%`,
      wind: actual
        ? `${actual.windSpeed.toFixed(1)} m/s`
        : windLabel(world.windEnergy || 0),
      precipitation: actual
        ? `${actual.precipitation.toFixed(1)} mm`
        : precipitationLabel(world.rainfall || 0, world.snowfall || 0),
      snowing: actual
        ? isSnowCode(actual.code) && actual.precipitation > 0
        : world.snowfall > world.rainfall && world.snowfall > 0.04,
      wet: actual
        ? actual.precipitation > 0
        : world.rainfall + world.snowfall >= 0.04,
    });
  }
  async function mount(canvas) {
    try {
      const { createScene } = await import("../engine/reference-engine.js");
      if (disposed) return;
      api.value = createScene(canvas, {
        onReady() {
          view.ready = true;
        },
        onFrame(delta, ctx) {
          if (
            live.state.enabled &&
            ctx.input.active &&
            ctx.input.pointer.down &&
            ["cloud", "fog", "wind"].includes(ctx.input.tool)
          )
            pauseReality();
          for (const callback of frames) callback(delta, ctx);
          if (performance.now() - lastSync >= 100) {
            lastSync = performance.now();
            sync(ctx);
          }
        },
      });
      realityDriver = createRealityDriver(api.value);
      realityDriver.setSnapshot(live.state.sky, live.state.weather);
      realityDriver.setEnabled(live.state.enabled);
      sync();
      setHidden(api.value.ctx.params.get("ui") === "0");
    } catch (error) {
      view.error = `Weatherglass could not start: ${error.message}`;
      console.error("[scene]", error);
    }
  }
  function onFrame(callback) {
    frames.add(callback);
    const off = () => frames.delete(callback);
    onScopeDispose(off);
    return off;
  }
  function onEvent(name, callback) {
    let off;
    const stop = watch(
      api,
      (scene) => {
        off?.();
        off = scene?.ctx.events.on(name, callback);
      },
      { immediate: true },
    );
    onScopeDispose(() => {
      off?.();
      stop();
    });
  }
  function setHidden(value) {
    hidden.value = value;
    document.body.classList.toggle("no-ui", value);
  }
  function setDrawer(value) {
    drawerOpen.value = !!value && compact.value;
    play("pop", { volume: 0.1, pitch: drawerOpen.value ? 1.25 : 1 });
  }
  function setTool(tool) {
    api.value?.ctx.input.setTool(tool);
    sync();
  }
  function toggleSound() {
    const audio = api.value?.ctx.audio;
    if (!audio) return;
    const muted = audio.muted === false;
    if (!muted) audio.resume?.();
    audio.setMuted(muted);
    sync();
    if (!muted) play("pop", { volume: 0.2, pitch: 1.2 });
  }
  function togglePlay() {
    const world = api.value.ctx.world;
    world.dayCycle = !world.dayCycle;
    markUse("time");
    play("pop", { volume: 0.12, pitch: world.dayCycle ? 1.3 : 1 });
    sync();
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement)
        await (document.exitFullscreen || document.webkitExitFullscreen)?.call(
          document,
        );
      else
        await (
          document.documentElement.requestFullscreen ||
          document.documentElement.webkitRequestFullscreen
        )?.call(document.documentElement);
    } catch {
      /* Embedders can deny fullscreen. */
    }
  }
  function markUse(name) {
    if (["time", "season", "temp"].includes(name)) pauseReality();
    uses.set(name, performance.now());
  }
  function usedRecently(name, duration) {
    return performance.now() - (uses.get(name) ?? -1e9) < duration;
  }
  onEvent("tool", () => sync());
  function pauseReality() {
    if (!live.state.enabled) return;
    live.pause();
    toast("已切换为手动探索，点击天气栏可恢复实时联动", 3200, {
      icon: "climate",
    });
  }
  onEvent("sky:grab", pauseReality);
  onEvent("cloud:grab", pauseReality);
  onEvent("wind:start", pauseReality);
  onEvent("cloud:spawn", () => {
    if (!realityDriver?.applying && api.value?.ctx.input.tool === "cloud")
      pauseReality();
  });
  watch(
    [() => live.state.sky, () => live.state.weather, () => live.state.enabled],
    () => {
      realityDriver?.setSnapshot(live.state.sky, live.state.weather);
      realityDriver?.setEnabled(live.state.enabled);
      sync();
    },
    { flush: "sync" },
  );
  onEvent("hud:hint", (hint) => {
    const text = String(hint?.text || "").trim();
    if (!text || usedRecently(`hint:${text}`, 30000)) return;
    markUse(`hint:${text}`);
    toast(text, hint.ms || 3600);
  });
  onEvent("key", ({ key, event }) => {
    if (
      event?.ctrlKey ||
      event?.metaKey ||
      event?.altKey ||
      event?.repeat ||
      ["INPUT", "TEXTAREA"].includes(event?.target?.tagName)
    )
      return;
    if (key?.toLowerCase() === "u") setHidden(!hidden.value);
    else if (key === "Escape") {
      if (live.state.panelOpen) live.state.panelOpen = false;
      else if (drawerOpen.value) setDrawer(false);
      else if (hidden.value) setHidden(false);
    }
  });
  const media = window.matchMedia("(max-width: 859px), (max-height: 519px)");
  function updateMedia() {
    compact.value = media.matches;
    if (!compact.value) drawerOpen.value = false;
  }
  function updateFullscreen() {
    fullscreen.value = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
  }
  updateMedia();
  media.addEventListener("change", updateMedia);
  document.addEventListener("fullscreenchange", updateFullscreen);
  document.addEventListener("webkitfullscreenchange", updateFullscreen);
  onScopeDispose(() => {
    disposed = true;
    media.removeEventListener("change", updateMedia);
    document.removeEventListener("fullscreenchange", updateFullscreen);
    document.removeEventListener("webkitfullscreenchange", updateFullscreen);
    for (const timer of timers) clearTimeout(timer);
    frames.clear();
    realityDriver?.dispose();
    api.value?.destroy();
  });
  return {
    api,
    live,
    pauseReality,
    view,
    compact,
    drawerOpen,
    hidden,
    fullscreen,
    toasts,
    mount,
    onFrame,
    onEvent,
    play,
    sync,
    setTool,
    setHidden,
    setDrawer,
    toggleSound,
    togglePlay,
    toggleFullscreen,
    markUse,
    usedRecently,
    later,
    toast,
    closeToast,
    wrap,
  };
}
