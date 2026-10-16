const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search";
const IP_LOCATION_URL = "https://get.geojs.io/v1/ip/geo.json";
export const WEATHER_REFRESH_MS = 15 * 60 * 1000;
export const MAX_CACHE_AGE_MS = 3 * 60 * 60 * 1000;

async function fetchJson(url, signal) {
  const timeout = AbortSignal.timeout(12000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "天气服务繁忙，请稍后重试"
        : `数据服务暂不可用（${response.status}）`,
    );
  const json = await response.json();
  if (json.error) throw new Error(json.reason || "天气服务返回错误");
  return json;
}

export function validLocation(value) {
  return (
    !!value &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180
  );
}
export const locationKey = (location) =>
  `${Number(location.latitude).toFixed(2)},${Number(location.longitude).toFixed(2)}`;

export async function locateByIp(signal) {
  const json = await fetchJson(IP_LOCATION_URL, signal);
  if (
    json.latitude == null ||
    json.longitude == null ||
    json.latitude === "" ||
    json.longitude === ""
  )
    throw new Error("定位服务没有返回有效坐标，请重试或搜索城市");
  // Keep only coarse location fields; never store the returned IP or ASN.
  const location = {
    name: json.city || json.region || json.country || "附近区域",
    region: json.region || "",
    country: json.country || "",
    latitude: Math.round(Number(json.latitude) * 10) / 10,
    longitude: Math.round(Number(json.longitude) * 10) / 10,
    timezone: json.timezone || "UTC",
    source: "ip",
    accuracyKm: Number.isFinite(Number(json.accuracy))
      ? Math.max(10, Number(json.accuracy))
      : null,
  };
  if (!validLocation(location))
    throw new Error("无法自动识别所在区域，请重试或搜索城市");
  return location;
}

export function locateByDevice() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(
        new Error("此浏览器不支持设备定位，可以自动估算或搜索城市"),
      );
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          name: "当前位置",
          region: "",
          country: "",
          latitude: Math.round(coords.latitude * 100) / 100,
          longitude: Math.round(coords.longitude * 100) / 100,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          source: "device",
        }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "设备定位未获授权，仍可使用自动估算或搜索城市"
              : "设备定位暂不可用，请重试或搜索城市",
          ),
        ),
      {
        enableHighAccuracy: false,
        maximumAge: 15 * 60 * 1000,
        timeout: 10000,
      },
    );
  });
}

export async function locateAutomatically(signal) {
  const ipOnly =
    new URLSearchParams(window.location.search).get("location") === "ip";
  try {
    const permission = await navigator.permissions?.query({
      name: "geolocation",
    });
    if (!ipOnly && permission?.state !== "denied" && navigator.geolocation)
      return await locateByDevice();
  } catch {
    /* Device geolocation is optional. */
  }
  return locateByIp(signal);
}

export async function searchCities(query, signal) {
  if (query.trim().length < 2) return [];
  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({
    name: query.trim(),
    count: "6",
    language: "zh",
    format: "json",
  });
  const json = await fetchJson(url, signal);
  return (json.results || [])
    .map((item) => ({
      id: item.id,
      name: item.name,
      region: item.admin1 || "",
      country: item.country || "",
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || "UTC",
      source: "search",
    }))
    .filter(validLocation);
}

export function normalizeWeather(json, fetchedAt = Date.now()) {
  const current = json.current;
  const required = [
    "temperature_2m",
    "relative_humidity_2m",
    "weather_code",
    "cloud_cover",
    "wind_speed_10m",
    "wind_direction_10m",
    "precipitation",
    "time",
  ];
  if (!current || required.some((key) => !Number.isFinite(current[key])))
    throw new Error("天气数据不完整，请稍后刷新");
  if (
    json.current_units?.temperature_2m !== "°C" ||
    json.current_units?.wind_speed_10m !== "m/s" ||
    json.current_units?.precipitation !== "mm"
  )
    throw new Error("天气数据单位不符合预期");
  if (
    current.relative_humidity_2m < 0 ||
    current.relative_humidity_2m > 100 ||
    current.cloud_cover < 0 ||
    current.cloud_cover > 100 ||
    current.precipitation < 0 ||
    current.wind_speed_10m < 0
  )
    throw new Error("天气数据超出有效范围");
  const observedAt = current.time * 1000;
  if (
    observedAt > fetchedAt + 10 * 60 * 1000 ||
    fetchedAt - observedAt > MAX_CACHE_AGE_MS
  )
    throw new Error("天气数据时间异常，请稍后刷新");
  return {
    temperature: current.temperature_2m,
    feelsLike: Number.isFinite(current.apparent_temperature)
      ? current.apparent_temperature
      : null,
    humidity: current.relative_humidity_2m / 100,
    cloudCover: current.cloud_cover / 100,
    windSpeed: current.wind_speed_10m,
    windDirection: ((current.wind_direction_10m % 360) + 360) % 360,
    gusts: Number.isFinite(current.wind_gusts_10m)
      ? current.wind_gusts_10m
      : null,
    precipitation: current.precipitation,
    snowfall: Number.isFinite(current.snowfall) ? current.snowfall : 0,
    code: current.weather_code,
    observedAt,
    fetchedAt,
    timezone: json.timezone || "UTC",
  };
}

export async function fetchWeather(location, signal) {
  if (!validLocation(location)) throw new Error("位置无效");
  const url = new URL(WEATHER_URL);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    timezone: "auto",
    timeformat: "unixtime",
    wind_speed_unit: "ms",
    temperature_unit: "celsius",
    precipitation_unit: "mm",
    forecast_days: "1",
  });
  return normalizeWeather(await fetchJson(url, signal));
}

export function weatherLabel(code) {
  const labels = {
    0: "晴",
    1: "大部晴朗",
    2: "多云",
    3: "阴",
    45: "雾",
    48: "雾凇",
    51: "毛毛雨",
    53: "毛毛雨",
    55: "浓毛毛雨",
    56: "冻毛毛雨",
    57: "冻毛毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "冻雨",
    67: "强冻雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "阵雨",
    81: "中阵雨",
    82: "强阵雨",
    85: "阵雪",
    86: "强阵雪",
    95: "雷暴",
    96: "雷暴伴冰雹",
    99: "强雷暴伴冰雹",
  };
  return labels[code] || "天气暂未知";
}
export const isSnowCode = (code) => [71, 73, 75, 77, 85, 86].includes(code);
export const isRainCode = (code) =>
  [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
    code,
  );
export const isFogCode = (code) => code === 45 || code === 48;
