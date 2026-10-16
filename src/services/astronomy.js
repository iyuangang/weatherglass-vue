import * as SunCalc from "suncalc";
import { wrap } from "../ui/weather.js";

const formats = new Map();
const eventCache = new Map();
function formatter(timezone, options) {
  const key = timezone + JSON.stringify(options);
  if (!formats.has(key)) {
    try {
      formats.set(
        key,
        new Intl.DateTimeFormat("zh-CN", {
          timeZone: timezone,
          calendar: "gregory",
          numberingSystem: "latn",
          hourCycle: "h23",
          ...options,
        }),
      );
    } catch {
      formats.set(
        key,
        new Intl.DateTimeFormat("zh-CN", {
          timeZone: "UTC",
          hourCycle: "h23",
          ...options,
        }),
      );
    }
  }
  return formats.get(key);
}

export function localClock(date, timezone) {
  const parts = Object.fromEntries(
    formatter(timezone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year),
    month = Number(parts.month),
    day = Number(parts.day);
  const hour = Number(parts.hour),
    minute = Number(parts.minute),
    second = Number(parts.second);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    clock: `${parts.hour}:${parts.minute}:${parts.second}`,
    timeOfDay: (hour * 3600 + minute * 60 + second) / 86400,
    offsetMinutes: Math.round(
      (Date.UTC(year, month - 1, day, hour, minute, second) -
        Math.floor(date.getTime() / 1000) * 1000) /
        60000,
    ),
  };
}

// Meteorological seasons: Mar–May, Jun–Aug, Sep–Nov, Dec–Feb.
// The visual dial interpolates smoothly, with the opposite phase south of the equator.
export function calendarSeason(clock, latitude) {
  const month = clock.month - 1;
  const index = Math.floor(((month + 10) % 12) / 3);
  let startMonth = 2 + index * 3;
  let year = clock.year;
  if (startMonth === 11 && month < 2) year--;
  const start = Date.UTC(year, startMonth, 1);
  const end = Date.UTC(year, startMonth + 3, 1);
  const current = Date.UTC(
    clock.year,
    month,
    clock.day,
    clock.hour,
    clock.minute,
    clock.second,
  );
  return {
    value: wrap(
      index - 0.5 + (current - start) / (end - start) + (latitude < 0 ? 2 : 0),
      4,
    ),
    name: ["春季", "夏季", "秋季", "冬季"][
      (index + (latitude < 0 ? 2 : 0)) % 4
    ],
    hemisphere: latitude < 0 ? "南半球" : "北半球",
  };
}

// Scene axes: +X east, +Y up, -Z north. SunCalc v2 uses degrees clockwise from north.
export function horizontalDirection(azimuth, altitude) {
  const az = (azimuth * Math.PI) / 180,
    alt = (altitude * Math.PI) / 180;
  return {
    x: Math.cos(alt) * Math.sin(az),
    y: Math.sin(alt),
    z: -Math.cos(alt) * Math.cos(az),
  };
}
export function compassName(azimuth) {
  return ["北", "东北", "东", "东南", "南", "西南", "西", "西北"][
    Math.round(wrap(azimuth, 360) / 45) % 8
  ];
}
export function eventTime(value, timezone, absent = "今日无此事件") {
  return value instanceof Date && Number.isFinite(value.getTime())
    ? formatter(timezone, { hour: "2-digit", minute: "2-digit" }).format(value)
    : absent;
}
export const moonPhaseName = (phase) =>
  ["新月", "娥眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"][
    Math.round(wrap(phase, 1) * 8) % 8
  ];

export function astronomyAt(date, location) {
  const { latitude, longitude, timezone } = location;
  const clock = localClock(date, timezone);
  const sun = SunCalc.getPosition(date, latitude, longitude);
  const moon = SunCalc.getMoonPosition(date, latitude, longitude);
  const illumination = SunCalc.getMoonIllumination(date);
  const key = `${latitude},${longitude},${timezone},${clock.date}`;
  if (!eventCache.has(key)) {
    if (eventCache.size >= 8) eventCache.clear();
    eventCache.set(key, {
      sun: SunCalc.getTimes(date, latitude, longitude, 0, clock.offsetMinutes),
      moon: SunCalc.getMoonTimes(
        date,
        latitude,
        longitude,
        clock.offsetMinutes,
      ),
    });
  }
  const events = eventCache.get(key);
  const sunAbsent = events.sun.alwaysUp
    ? "极昼"
    : events.sun.alwaysDown
      ? "极夜"
      : "今日无日出/日落";
  return {
    timestamp: date.getTime(),
    timezone,
    clock,
    season: calendarSeason(clock, latitude),
    sun: {
      ...sun,
      direction: horizontalDirection(sun.azimuth, sun.altitude),
      compass: compassName(sun.azimuth),
      rise: eventTime(events.sun.sunrise, timezone, sunAbsent),
      set: eventTime(events.sun.sunset, timezone, sunAbsent),
    },
    moon: {
      ...moon,
      direction: horizontalDirection(moon.azimuth, moon.altitude),
      compass: compassName(moon.azimuth),
      fraction: illumination.fraction,
      phase: illumination.phase,
      phaseName: moonPhaseName(illumination.phase),
      rise: eventTime(
        events.moon.rise,
        timezone,
        events.moon.alwaysUp ? "全天不落" : "今日无月升",
      ),
      set: eventTime(
        events.moon.set,
        timezone,
        events.moon.alwaysDown ? "全天在地平线下" : "今日无月落",
      ),
    },
  };
}
