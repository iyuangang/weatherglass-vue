import { computed, onMounted, onScopeDispose, shallowReactive } from "vue";
import { astronomyAt } from "../services/astronomy.js";
import {
  fetchWeather,
  locateAutomatically,
  locateByDevice,
  locationKey,
  MAX_CACHE_AGE_MS,
  searchCities,
  validLocation,
  WEATHER_REFRESH_MS,
} from "../services/weatherApi.js";

const SETTINGS_KEY = "weatherglass.real-world.v1";
const CACHE_KEY = "weatherglass.weather-cache.v1";
function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing or full storage. */
  }
}
export function usableWeatherCache(cache, location, now = Date.now()) {
  return (
    cache?.locationKey === locationKey(location) &&
    Number.isFinite(cache.weather?.temperature) &&
    Number.isFinite(cache.weather?.observedAt) &&
    Number.isFinite(cache.weather?.fetchedAt) &&
    now - cache.weather.observedAt <= MAX_CACHE_AGE_MS &&
    cache.weather.observedAt <= now + 600000 &&
    cache.weather.fetchedAt <= now + 60000
  );
}

export function useRealWorld() {
  const state = shallowReactive({
    enabled: true,
    panelOpen: false,
    phase: "locating",
    location: null,
    weather: null,
    sky: null,
    cached: false,
    error: "",
    locationError: "",
    searchError: "",
    query: "",
    results: [],
    searching: false,
    mode: "auto",
  });
  const busy = computed(
    () => state.phase === "locating" || state.phase === "fetching",
  );
  let destroyed = false;
  let locationGeneration = 0;
  let weatherGeneration = 0;
  let locationAbort;
  let weatherAbort;
  let searchAbort;
  let searchGeneration = 0;

  function tick() {
    if (!state.location) return;
    state.sky = astronomyAt(new Date(), state.location);
  }
  function persist() {
    writeStorage(SETTINGS_KEY, {
      mode: state.mode,
      location: state.mode === "manual" ? state.location : null,
    });
  }
  function pause() {
    state.enabled = false;
  }
  function resume() {
    state.enabled = true;
    tick();
    if (
      !state.weather ||
      Date.now() - state.weather.fetchedAt >= WEATHER_REFRESH_MS
    )
      refresh();
  }

  async function refresh(force = false) {
    if (!state.location || destroyed) return;
    const selected = state.location;
    const generation = ++weatherGeneration;
    weatherAbort?.abort();
    weatherAbort = new AbortController();
    const cache = readStorage(CACHE_KEY);
    if (usableWeatherCache(cache, selected)) {
      state.weather = cache.weather;
      state.location = {
        ...selected,
        timezone: cache.weather.timezone || selected.timezone,
      };
      state.cached = Date.now() - cache.weather.fetchedAt >= WEATHER_REFRESH_MS;
      tick();
      if (!force && !state.cached) {
        state.phase = "ready";
        state.error = "";
        return;
      }
    }
    state.phase = "fetching";
    state.error = "";
    try {
      const weather = await fetchWeather(selected, weatherAbort.signal);
      if (destroyed || generation !== weatherGeneration) return;
      state.weather = weather;
      state.location = { ...selected, timezone: weather.timezone };
      state.cached = false;
      state.phase = "ready";
      writeStorage(CACHE_KEY, { locationKey: locationKey(selected), weather });
      persist();
      tick();
    } catch (error) {
      if (destroyed || generation !== weatherGeneration) return;
      state.cached = !!state.weather;
      state.phase = state.weather ? "cached" : "error";
      state.error = state.weather
        ? "天气刷新失败，正在使用上次数据；时间和天体位置仍会更新"
        : error.message || "暂时无法获取天气，请检查网络后重试";
    }
  }

  async function selectLocation(location, mode = "manual", enable = true) {
    if (!validLocation(location) || destroyed) return;
    locationGeneration++;
    locationAbort?.abort();
    weatherAbort?.abort();
    weatherGeneration++;
    state.location = { ...location };
    state.weather = null;
    state.sky = null;
    state.cached = false;
    state.mode = mode;
    state.results = [];
    state.error = "";
    state.locationError = "";
    state.enabled = enable;
    persist();
    tick();
    await refresh();
  }

  async function locate(device = false) {
    const generation = ++locationGeneration;
    locationAbort?.abort();
    weatherAbort?.abort();
    weatherGeneration++;
    locationAbort = new AbortController();
    state.phase = "locating";
    state.locationError = "";
    state.error = "";
    state.enabled = true;
    try {
      const location = device
        ? await locateByDevice()
        : await locateAutomatically(locationAbort.signal);
      if (destroyed || generation !== locationGeneration) return;
      await selectLocation(location, "auto", state.enabled);
    } catch (error) {
      if (destroyed || generation !== locationGeneration) return;
      state.locationError = error.message || "自动定位暂不可用，可以搜索城市";
      state.phase = state.weather ? "ready" : "error";
      state.panelOpen = true;
    }
  }

  async function search() {
    const generation = ++searchGeneration;
    searchAbort?.abort();
    searchAbort = new AbortController();
    state.searchError = "";
    state.results = [];
    if (state.query.trim().length < 2) {
      state.searchError = "请输入至少两个字的城市名";
      state.searching = false;
      return;
    }
    state.searching = true;
    try {
      const results = await searchCities(state.query, searchAbort.signal);
      if (destroyed || generation !== searchGeneration) return;
      state.results = results;
      if (!results.length)
        state.searchError = "未找到城市，可尝试拼音或英文名称";
    } catch (error) {
      if (!destroyed && generation === searchGeneration)
        state.searchError = error.message || "城市搜索暂不可用";
    } finally {
      if (generation === searchGeneration) state.searching = false;
    }
  }

  onMounted(() => {
    const settings = readStorage(SETTINGS_KEY);
    if (settings?.mode === "manual" && validLocation(settings.location))
      selectLocation(settings.location);
    else locate();
  });
  const clockTimer = setInterval(tick, 1000);
  const weatherTimer = setInterval(() => refresh(true), WEATHER_REFRESH_MS);
  function visibleAgain() {
    if (!document.hidden) {
      tick();
      if (
        state.location &&
        (!state.weather ||
          Date.now() - state.weather.fetchedAt >= WEATHER_REFRESH_MS)
      )
        refresh();
    }
  }
  document.addEventListener("visibilitychange", visibleAgain);
  onScopeDispose(() => {
    destroyed = true;
    locationGeneration++;
    weatherGeneration++;
    searchGeneration++;
    locationAbort?.abort();
    weatherAbort?.abort();
    searchAbort?.abort();
    clearInterval(clockTimer);
    clearInterval(weatherTimer);
    document.removeEventListener("visibilitychange", visibleAgain);
  });
  return {
    state,
    busy,
    tick,
    pause,
    resume,
    locate,
    refresh,
    search,
    selectLocation,
  };
}
