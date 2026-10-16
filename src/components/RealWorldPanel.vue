<script setup>
import { computed, ref } from "vue";
import { useScene } from "../composables/useWeatherglass.js";
import { compassName, eventTime } from "../services/astronomy.js";
import { weatherLabel } from "../services/weatherApi.js";
import UiIcon from "./UiIcon.js";

const game = useScene();
const { live } = game;
const { state, busy } = live;
const card = ref(null);
async function selectCity(city) {
  await live.selectLocation(city);
  card.value?.scrollTo({ top: 0, behavior: "smooth" });
}
const locationName = computed(
  () =>
    state.location?.name ||
    (state.phase === "locating" ? "自动识别位置…" : "选择所在城市"),
);
const summary = computed(() =>
  !state.enabled
    ? "手动探索 · 点此恢复联动"
    : state.phase === "locating"
      ? "正在获取当地日期与天气"
      : state.weather
        ? `${weatherLabel(state.weather.code)} ${state.weather.temperature.toFixed(1)}° · ${state.sky?.clock.clock.slice(0, 5) || "--:--"}`
        : state.phase === "fetching"
          ? "正在读取天气…"
          : "天气暂不可用 · 点此重试",
);
const locationSource = computed(
  () =>
    ({ ip: "IP 粗略定位", device: "设备附近", search: "自选城市" })[
      state.location?.source
    ] || "自动获取",
);
const observationTime = computed(() =>
  state.weather
    ? eventTime(
        new Date(state.weather.observedAt),
        state.location?.timezone || "UTC",
        "—",
      )
    : "—",
);
const delayed = computed(
  () =>
    state.weather &&
    (state.sky?.timestamp || Date.now()) - state.weather.observedAt >
      30 * 60 * 1000,
);
const statusText = computed(() =>
  !state.enabled
    ? "手动探索"
    : state.cached
      ? "缓存天气"
      : delayed.value
        ? "天气数据延迟"
        : state.weather
          ? "实时联动"
          : state.phase === "error"
            ? "时空同步"
            : "连接中",
);
const formatAngle = (value) => `${Number(value).toFixed(1)}°`;
function toggleMode() {
  if (state.enabled) live.pause();
  else live.resume();
}
</script>

<template>
  <div class="real-world">
    <button
      class="real-badge wg-panel"
      type="button"
      aria-label="真实天气、日期与天体位置"
      :aria-expanded="state.panelOpen"
      aria-controls="real-world-panel"
      @click="state.panelOpen = !state.panelOpen"
    >
      <span
        class="real-indicator"
        :class="{
          'is-live': state.enabled && state.weather && !state.cached,
          'is-busy': busy,
        }"
      ></span>
      <span class="real-badge-copy"
        ><span class="real-badge-city"
          >{{ locationName
          }}<small v-if="state.location?.source === 'ip'">估算</small></span
        ><span class="real-badge-summary">{{ summary }}</span></span
      >
      <span class="real-badge-chevron" :class="{ 'is-open': state.panelOpen }"
        >⌄</span
      >
    </button>

    <section
      v-if="state.panelOpen"
      id="real-world-panel"
      ref="card"
      class="real-card wg-panel"
      aria-label="真实世界设置"
      @keydown.esc.stop="state.panelOpen = false"
    >
      <div class="real-card-heading">
        <div>
          <span class="real-eyebrow">THE WORLD, RIGHT NOW</span>
          <h2>{{ locationName }}</h2>
        </div>
        <button
          class="real-close"
          type="button"
          aria-label="关闭真实天气面板"
          @click="state.panelOpen = false"
        >
          <UiIcon name="close" />
        </button>
      </div>
      <div class="real-meta">
        <span>{{ locationSource }}</span
        ><span v-if="state.location">{{ state.location.timezone }}</span>
      </div>
      <div class="real-mode">
        <span
          ><i :class="{ 'is-live': state.enabled }"></i>{{ statusText }}</span
        ><button type="button" @click="toggleMode">
          {{ state.enabled ? "手动探索" : "恢复实时" }}
        </button>
      </div>

      <template v-if="state.sky">
        <div class="real-datetime">
          <time :datetime="new Date(state.sky.timestamp).toISOString()">{{
            state.sky.clock.clock
          }}</time
          ><span
            >{{ state.sky.clock.date }} {{ state.sky.clock.weekday }}<br />{{
              state.sky.season.name
            }}
            · {{ state.sky.season.hemisphere }}</span
          >
        </div>
        <p v-if="!state.enabled" class="real-note">
          场景已暂停联动；下方仍显示当地此刻的数据。
        </p>
      </template>

      <div v-if="busy" class="real-message" role="status">
        {{ state.phase === "locating" ? "正在自动获取位置…" : "正在刷新天气…" }}
      </div>
      <p v-if="state.locationError" class="real-error" role="status">
        {{ state.locationError }}
      </p>
      <p v-if="state.error" class="real-error" role="status">
        {{ state.error }}
      </p>
      <p v-if="delayed && !state.error" class="real-error">
        天气资料晚于当前时间，请以标注的数据时间为准。
      </p>

      <div v-if="state.weather" class="real-weather">
        <div class="real-weather-main">
          <span
            >{{ state.weather.temperature.toFixed(1) }}<small>°C</small></span
          ><span
            >{{ weatherLabel(state.weather.code)
            }}<small v-if="state.weather.feelsLike !== null"
              >体感 {{ state.weather.feelsLike.toFixed(1) }}°</small
            ></span
          >
        </div>
        <dl class="real-weather-grid">
          <div>
            <dt>湿度</dt>
            <dd>
              {{ Math.round(state.weather.humidity * 100) }}<small>%</small>
            </dd>
          </div>
          <div>
            <dt>云量</dt>
            <dd>
              {{ Math.round(state.weather.cloudCover * 100) }}<small>%</small>
            </dd>
          </div>
          <div>
            <dt>风速 · {{ compassName(state.weather.windDirection) }}风</dt>
            <dd>{{ state.weather.windSpeed.toFixed(1) }}<small>m/s</small></dd>
          </div>
          <div>
            <dt>降水</dt>
            <dd>
              {{ state.weather.precipitation.toFixed(1) }}<small>mm</small>
            </dd>
          </div>
        </dl>
        <div class="real-observation">
          <span
            >{{ state.cached ? "缓存 · " : "" }}数据时间
            {{ observationTime }}</span
          ><button type="button" :disabled="busy" @click="live.refresh(true)">
            刷新天气
          </button>
        </div>
      </div>

      <div v-if="state.sky" class="real-astronomy">
        <article class="real-celestial">
          <UiIcon name="summer" class="real-celestial-icon" />
          <div>
            <h3>
              太阳
              <span>{{
                state.sky.sun.altitude < 0 ? "地平线下" : "地平线上"
              }}</span>
            </h3>
            <p>
              {{ state.sky.sun.compass }} {{ formatAngle(state.sky.sun.azimuth)
              }}<span>高度 {{ formatAngle(state.sky.sun.altitude) }}</span>
            </p>
            <p class="real-rise-set">
              日出 {{ state.sky.sun.rise
              }}<span>日落 {{ state.sky.sun.set }}</span>
            </p>
          </div>
        </article>
        <article class="real-celestial">
          <UiIcon name="moonFace" class="real-celestial-icon real-moon-icon" />
          <div>
            <h3>
              月亮
              <span
                >{{ state.sky.moon.phaseName }} ·
                {{ Math.round(state.sky.moon.fraction * 100) }}% 受光</span
              >
            </h3>
            <p>
              {{ state.sky.moon.compass }}
              {{ formatAngle(state.sky.moon.azimuth)
              }}<span>高度 {{ formatAngle(state.sky.moon.altitude) }}</span>
            </p>
            <p class="real-rise-set">
              月升 {{ state.sky.moon.rise
              }}<span>月落 {{ state.sky.moon.set }}</span>
            </p>
          </div>
        </article>
        <p class="real-note">
          方位从正北顺时针计算。天体可能位于当前视野之外，可旋转场景查看；季节按月份与南北半球联动。
        </p>
      </div>

      <div class="real-location-actions">
        <button type="button" :disabled="busy" @click="live.locate(false)">
          重新自动定位</button
        ><button type="button" :disabled="busy" @click="live.locate(true)">
          使用设备定位
        </button>
      </div>
      <p v-if="state.location?.source === 'ip'" class="real-note">
        IP 定位可能受代理或 VPN 影响；城市不符时可使用设备定位或搜索切换。
        <span v-if="state.location.accuracyKm"
          >估算范围约 {{ state.location.accuracyKm }} 公里。</span
        >
      </p>
      <form class="real-search" @submit.prevent="live.search">
        <label class="real-sr-only" for="real-city-search">城市名称</label
        ><input
          id="real-city-search"
          v-model="state.query"
          type="search"
          autocomplete="off"
          placeholder="搜索城市，例如 杭州"
          maxlength="80"
        /><button type="submit" :disabled="state.searching">
          {{ state.searching ? "查找中…" : "搜索" }}
        </button>
      </form>
      <p v-if="state.searchError" class="real-error" role="status">
        {{ state.searchError }}
      </p>
      <ul
        v-if="state.results.length"
        class="real-city-results"
        aria-label="城市搜索结果"
      >
        <li v-for="item in state.results" :key="item.id">
          <button type="button" @click="selectCity(item)">
            <span>{{ item.name }}</span
            ><small>{{
              [item.region, item.country].filter(Boolean).join(" · ")
            }}</small>
          </button>
        </li>
      </ul>
      <footer class="real-attribution">
        天气
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          >Open-Meteo</a
        >
        · 当前模型数据，每15分钟刷新<br />定位
        <a
          href="https://www.geojs.io/"
          target="_blank"
          rel="noopener noreferrer"
          >GeoJS</a
        >
        / 设备 · 城市 GeoNames · 天文 SunCalc<br /><span
          >位置仅用于天气与天文计算，设备坐标取整到约1公里范围。</span
        >
      </footer>
    </section>
  </div>
</template>

<style>
.wg-hud .real-world .real-badge,
.wg-hud .real-world .real-card {
  position: relative;
}
.real-world {
  position: absolute;
  top: 58px;
  left: 18px;
  z-index: 40;
  pointer-events: auto;
  font-family: var(--font);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink);
}
.real-badge {
  width: 238px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 218px;
  max-width: 310px;
  padding: 10px 12px;
  text-align: left;
  color: inherit;
  font: inherit;
  cursor: pointer;
  border-radius: 16px;
}
.real-indicator,
.real-mode i {
  flex: none;
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9e9d95;
}
.real-indicator.is-live,
.real-mode i.is-live {
  background: #b5d4b0;
  box-shadow: 0 0 10px #b5d4b045;
}
.real-indicator.is-busy {
  animation: real-pulse 1.4s ease-in-out infinite;
}
.real-badge-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}
.real-badge-city {
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.real-badge-city small {
  font-size: 9px;
  font-weight: 400;
  color: var(--ink-dim);
  margin-left: 7px;
}
.real-badge-summary {
  color: var(--ink-dim);
  font-size: 10px;
}
.real-badge-chevron {
  color: var(--ink-dim);
  font-size: 16px;
  transition: transform 0.2s;
}
.real-badge-chevron.is-open {
  transform: rotate(180deg);
}
.real-card {
  width: 342px;
  max-width: calc(100vw - 36px);
  max-height: calc(100dvh - 240px);
  margin-top: 8px;
  padding: 18px;
  overflow: auto;
  border-radius: 20px;
  background: rgba(18, 22, 23, 0.92);
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: #c3b49055 transparent;
}
.real-card button,
.real-card input {
  font: inherit;
}
.real-card button {
  cursor: pointer;
  color: var(--ink);
}
.real-card button:disabled {
  cursor: wait;
  opacity: 0.45;
}
.real-card button:focus-visible,
.real-badge:focus-visible,
.real-card input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.real-card-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.real-card h2 {
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 400;
  margin: 2px 0;
  line-height: 1.3;
}
.real-eyebrow {
  color: #c5b68f;
  font-size: 8px;
  letter-spacing: 0.16em;
}
.real-close {
  border: 0;
  border-radius: 50%;
  padding: 7px;
  background: #ffffff09;
}
.real-close .wg-ico {
  width: 15px;
  height: 15px;
  display: block;
}
.real-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--ink-dim);
  font-size: 10px;
}
.real-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ffffff14;
  padding: 12px 0;
}
.real-mode > span {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
}
.real-mode button,
.real-observation button {
  padding: 3px 8px;
  border: 1px solid #d0bd8640;
  border-radius: 8px;
  background: #d0bd8610;
  color: #f1d994;
}
.real-datetime {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 15px;
  gap: 10px;
}
.real-datetime time {
  font-variant-numeric: tabular-nums;
  font-family: var(--serif);
  font-size: 28px;
  letter-spacing: 0.015em;
}
.real-datetime > span {
  text-align: right;
  color: var(--ink-dim);
  font-size: 10px;
}
.real-message {
  padding-top: 12px;
  color: #e0ce9d;
}
.real-error {
  color: #e6bba1;
  background: #a85e3915;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 12px 0 0;
  font-size: 11px;
}
.real-weather {
  padding-top: 16px;
}
.real-weather-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.real-weather-main > span:first-child {
  font-family: var(--serif);
  font-size: 35px;
  line-height: 1;
}
.real-weather-main > span:first-child small {
  font-size: 17px;
  vertical-align: top;
  margin-left: 2px;
}
.real-weather-main > span:last-child {
  font-size: 13px;
  text-align: right;
}
.real-weather-main > span:last-child small {
  display: block;
  color: var(--ink-dim);
  font-size: 10px;
  margin-top: 3px;
}
.real-weather-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin: 16px 0 12px;
}
.real-weather-grid dt {
  color: var(--ink-dim);
  font-size: 9px;
  white-space: nowrap;
}
.real-weather-grid dd {
  margin: 3px 0 0;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.real-weather-grid dd small {
  color: var(--ink-dim);
  font-size: 9px;
  margin-left: 2px;
}
.real-observation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--ink-dim);
  font-size: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid #ffffff14;
}
.real-observation button {
  padding: 2px 6px;
  font-size: 10px;
}
.real-astronomy {
  padding-top: 2px;
}
.real-celestial {
  display: flex;
  gap: 10px;
  padding-top: 14px;
}
.real-celestial-icon {
  flex: none;
  width: 19px;
  height: 19px;
  color: #f4d58a;
  margin-top: 1px;
}
.real-moon-icon {
  color: #c5d2e3;
}
.real-celestial > div {
  flex: 1;
  min-width: 0;
}
.real-celestial h3 {
  font-size: 12px;
  font-weight: 500;
  margin: 0 0 3px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}
.real-celestial h3 span {
  font-size: 9px;
  color: var(--ink-dim);
  font-weight: 400;
}
.real-celestial p {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.real-celestial .real-rise-set {
  color: var(--ink-dim);
  font-size: 9px;
  margin-top: 3px;
}
.real-note {
  color: var(--ink-dim);
  font-size: 10px;
  line-height: 1.65;
  margin: 10px 0 0;
}
.real-location-actions {
  display: flex;
  gap: 7px;
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid #ffffff14;
}
.real-location-actions button,
.real-search button {
  border: 1px solid #ffffff20;
  background: #ffffff07;
  border-radius: 8px;
  padding: 7px 10px;
}
.real-location-actions button {
  flex: 1;
  font-size: 11px;
}
.real-search {
  display: flex;
  gap: 7px;
  margin-top: 12px;
}
.real-search input {
  width: 0;
  min-width: 0;
  flex: 1;
  border: 1px solid #ffffff24;
  border-radius: 8px;
  background: #00000025;
  padding: 8px 10px;
  color: var(--ink);
}
.real-search input::placeholder {
  color: #a9a69a;
}
.real-search button {
  flex: none;
}
.real-city-results {
  list-style: none;
  margin: 7px 0 0;
  padding: 0;
}
.real-city-results button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 9px;
  border: 0;
  border-bottom: 1px solid #ffffff12;
  background: transparent;
  border-radius: 7px;
}
.real-city-results button:hover {
  background: #ffffff09;
}
.real-city-results small {
  color: var(--ink-dim);
  font-size: 10px;
}
.real-attribution {
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid #ffffff14;
  color: #9d9f99;
  font-size: 9px;
  line-height: 1.7;
}
.real-attribution a {
  color: inherit;
  text-underline-offset: 2px;
}
.real-attribution > span {
  font-size: 8px;
}
.real-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.wg-hud.is-real-open .wg-coach {
  visibility: hidden;
}
.wg-hud.is-compact.has-reality .wg-coach {
  top: 140px;
}
@keyframes real-pulse {
  50% {
    opacity: 0.35;
  }
}
@media (max-width: 859px), (max-height: 519px) {
  .real-world {
    top: 62px;
    left: 14px;
  }
  .real-badge {
    min-width: 210px;
    max-width: calc(100vw - 28px);
    padding: 8px 11px;
  }
  .real-card {
    max-width: calc(100vw - 28px);
    max-height: calc(100dvh - 226px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .real-indicator.is-busy {
    animation: none;
  }
}
</style>
