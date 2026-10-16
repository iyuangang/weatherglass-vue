import test from "node:test";
import assert from "node:assert/strict";
import {
  astronomyAt,
  calendarSeason,
  compassName,
  horizontalDirection,
  localClock,
} from "../src/services/astronomy.js";
import {
  locationKey,
  normalizeWeather,
  validLocation,
  weatherLabel,
} from "../src/services/weatherApi.js";
import { usableWeatherCache } from "../src/composables/useRealWorld.js";

test("location time is independent of the browser zone and handles midnight, DST and fractional offsets", () => {
  const shanghai = localClock(
    new Date("2026-10-16T18:30:00Z"),
    "Asia/Shanghai",
  );
  assert.equal(shanghai.date, "2026-10-17");
  assert.equal(shanghai.clock, "02:30:00");
  assert.equal(shanghai.offsetMinutes, 480);
  const before = localClock(
    new Date("2026-03-08T06:59:59Z"),
    "America/New_York",
  );
  const after = localClock(
    new Date("2026-03-08T07:00:00Z"),
    "America/New_York",
  );
  assert.equal(before.clock, "01:59:59");
  assert.equal(after.clock, "03:00:00");
  assert.equal(before.offsetMinutes, -300);
  assert.equal(after.offsetMinutes, -240);
  assert.equal(
    localClock(new Date("2026-10-16T00:00:00Z"), "Asia/Kathmandu")
      .offsetMinutes,
    345,
  );
});

test("date seasons reverse in the southern hemisphere and remain continuous over leap days", () => {
  const fall = localClock(new Date("2026-10-16T04:00:00Z"), "Asia/Shanghai");
  assert.equal(calendarSeason(fall, 30).name, "秋季");
  assert.equal(calendarSeason(fall, -34).name, "春季");
  const leap = calendarSeason(
    localClock(new Date("2024-02-29T23:59:59Z"), "UTC"),
    30,
  );
  const march = calendarSeason(
    localClock(new Date("2024-03-01T00:00:00Z"), "UTC"),
    30,
  );
  assert.equal(leap.name, "冬季");
  assert.equal(march.name, "春季");
  assert.ok(Math.abs(leap.value - march.value) < 0.001);
});

test("astronomical bearings map north/east/up to scene axes without using old radian conventions", () => {
  const north = horizontalDirection(0, 0),
    east = horizontalDirection(90, 0),
    zenith = horizontalDirection(125, 90);
  assert.ok(Math.abs(north.x) < 1e-12 && north.z === -1);
  assert.ok(Math.abs(east.x - 1) < 1e-12 && Math.abs(east.z) < 1e-12);
  assert.ok(Math.abs(zenith.y - 1) < 1e-12);
  assert.equal(compassName(450), "东");
  const noon = astronomyAt(new Date("2026-03-20T12:00:00Z"), {
    latitude: 0,
    longitude: 0,
    timezone: "UTC",
  });
  assert.ok(noon.sun.altitude > 85);
});

test("moon is calculated independently of the sun; eclipse/new-moon illumination stays near zero", () => {
  const sky = astronomyAt(new Date("2024-04-08T18:20:00Z"), {
    latitude: 32.8,
    longitude: -96.8,
    timezone: "America/Chicago",
  });
  assert.ok(sky.moon.fraction < 0.01);
  const a = sky.sun.direction,
    b = sky.moon.direction;
  assert.ok(a.x * b.x + a.y * b.y + a.z * b.z > 0.99);
  assert.match(sky.sun.rise, /^\d\d:\d\d$/);
  const polar = astronomyAt(new Date("2026-06-21T12:00:00Z"), {
    latitude: 89,
    longitude: 0,
    timezone: "UTC",
  });
  assert.equal(polar.sun.rise, "极昼");
  assert.equal(polar.sun.set, "极昼");
});

const now = Date.parse("2026-10-16T04:00:00Z");
function payload() {
  return {
    timezone: "Asia/Shanghai",
    current_units: {
      temperature_2m: "°C",
      wind_speed_10m: "m/s",
      precipitation: "mm",
    },
    current: {
      time: now / 1000,
      temperature_2m: 0,
      relative_humidity_2m: 0,
      weather_code: 0,
      cloud_cover: 0,
      wind_speed_10m: 0,
      wind_direction_10m: 360,
      precipitation: 0,
    },
  };
}
test("real weather preserves valid zero readings and rejects missing, stale or mismatched-unit data", () => {
  const weather = normalizeWeather(payload(), now);
  assert.equal(weather.temperature, 0);
  assert.equal(weather.cloudCover, 0);
  assert.equal(weather.precipitation, 0);
  assert.equal(weather.windDirection, 0);
  assert.equal(weather.feelsLike, null);
  assert.equal(weatherLabel(weather.code), "晴");
  const missing = payload();
  missing.current.temperature_2m = null;
  assert.throws(() => normalizeWeather(missing, now), /不完整/);
  const units = payload();
  units.current_units.wind_speed_10m = "km/h";
  assert.throws(() => normalizeWeather(units, now), /单位/);
  const stale = payload();
  stale.current.time -= 4 * 3600;
  assert.throws(() => normalizeWeather(stale, now), /时间/);
});
test("offline cache is restricted to the selected location and a bounded age", () => {
  const location = { latitude: 30.3, longitude: 120.2 };
  assert.ok(validLocation(location));
  assert.ok(!validLocation({ latitude: null, longitude: 120.2 }));
  const cache = {
    locationKey: locationKey(location),
    weather: normalizeWeather(payload(), now),
  };
  assert.ok(usableWeatherCache(cache, location, now + 3600000));
  assert.ok(!usableWeatherCache(cache, location, now + 4 * 3600000));
  assert.ok(
    !usableWeatherCache(cache, { latitude: -34, longitude: 151.2 }, now),
  );
});
