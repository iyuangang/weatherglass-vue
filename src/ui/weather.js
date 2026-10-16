export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const wrap = (value, period) => ((value % period) + period) % period;
export const shortestDelta = (value, period) =>
  wrap(value + period / 2, period) - period / 2;
export const timeX = (time) => 0.035 + time * 0.93;
export const timeY = (time) =>
  0.5 - 0.36 * Math.sin((time - 0.25) * Math.PI * 2);

export function formatTime(time) {
  const minutes = Math.floor(wrap(time, 1) * 1440 + 1e-6) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function timePhase(time) {
  const thresholds = [0.2, 0.25, 0.31, 0.44, 0.56, 0.68, 0.75, 0.81];
  const names = [
    "Night",
    "Dawn",
    "Sunrise",
    "Morning",
    "Midday",
    "Afternoon",
    "Golden hour",
    "Dusk",
    "Night",
  ];
  const index = thresholds.findIndex((threshold) => time < threshold);
  return names[index < 0 ? 8 : index];
}

export const seasonNames = ["Spring", "Summer", "Autumn", "Winter"];
export function seasonLabel(value) {
  const season = wrap(value, 4);
  const index = Math.round(season) & 3;
  const offset = shortestDelta(season - Math.round(season), 4);
  return {
    name: seasonNames[index],
    sub:
      offset > 0.22
        ? "Late"
        : offset < -0.22
          ? "Early"
          : index === 1 || index === 3
            ? "Mid"
            : "",
  };
}

export const formatTemperature = (value) =>
  `${Math.round(value) < 0 ? "−" : ""}${Math.abs(Math.round(value))}°`;
export function windLabel(value) {
  return value < 0.18
    ? "still"
    : value < 0.38
      ? "light air"
      : value < 0.65
        ? "breezy"
        : value < 1.1
          ? "windy"
          : value < 1.7
            ? "gusty"
            : "gale";
}
export function precipitationLabel(rain, snow) {
  const total = rain + snow;
  return total < 0.04
    ? "dry"
    : snow >= rain
      ? snow < 0.35
        ? "flurries"
        : snow < 1.1
          ? "snow"
          : "heavy snow"
      : snow > total * 0.2
        ? "sleet"
        : rain < 0.3
          ? "drizzle"
          : rain < 1.1
            ? "rain"
            : "downpour";
}
export function conditionLabel(world) {
  const conditions = [];
  const rain = world.rainfall || 0;
  const snow = world.snowfall || 0;
  const fog = world.fogAmount || 0;
  const wind = world.windEnergy || 0;
  const temperature = world.seaLevelTemp ?? 10;
  const freezingLevel = world.freezingLevel ?? 10;
  if ((world.storminess || 0) > 0.55) conditions.push("thunderstorm");
  if (snow > 0.05 && snow >= rain) {
    conditions.push(
      conditions.length
        ? "snow"
        : snow > 1.1
          ? "heavy snow"
          : snow < 0.35
            ? "flurries"
            : "snowing",
    );
  } else if (rain > 0.05) {
    if (!conditions.length)
      conditions.push(
        rain > 1.1 ? "downpour" : rain < 0.3 ? "drizzle" : "rain",
      );
    if (freezingLevel < 4 && freezingLevel > 0.2)
      conditions.push("snow on the peaks");
  }
  if (fog > 0.3) conditions.push("foggy");
  else if (fog > 0.14 && conditions.length < 2) conditions.push("misty");
  if (
    conditions.length < 2 &&
    wind >= 0.65 &&
    !conditions.includes("thunderstorm")
  )
    conditions.push(windLabel(wind));
  if (!conditions.length) {
    if (wind >= 0.38) conditions.push("breezy");
    const clouds = world.cloudCover || 0;
    conditions.push(
      clouds > 0.65
        ? "overcast"
        : clouds > 0.3
          ? "some cloud"
          : (world.night || 0) > 0.5
            ? temperature < 0
              ? "frosty night"
              : "clear night"
            : temperature < 0
              ? "crisp & clear"
              : temperature > 26
                ? "hot & sunny"
                : (world.sunElevation || 0) > 0.25
                  ? "sunny"
                  : "clear",
    );
  }
  return conditions.slice(0, 2).join(", ");
}

export function linearColor(color) {
  return ["r", "g", "b"]
    .map((key) => {
      const channel = Math.max(0, color[key]);
      return Math.round(
        clamp(
          channel <= 0.0031308
            ? channel * 12.92
            : 1.055 * channel ** (1 / 2.4) - 0.055,
          0,
          1,
        ) * 255,
      );
    })
    .join(" ");
}

export function mercuryColor(temperature) {
  const stops = [
    [-15, [130, 186, 255]],
    [0, [186, 222, 246]],
    [10, [255, 216, 140]],
    [22, [255, 164, 92]],
    [34, [240, 96, 72]],
  ];
  if (temperature <= stops[0][0]) return stops[0][1].join(" ");
  for (let index = 1; index < stops.length; index++) {
    if (temperature <= stops[index][0]) {
      const [low, color] = stops[index - 1];
      const [high, next] = stops[index];
      const fraction = (temperature - low) / (high - low);
      return color
        .map((value, channel) =>
          Math.round(value + (next[channel] - value) * fraction),
        )
        .join(" ");
    }
  }
  return stops.at(-1)[1].join(" ");
}

export function wheelAmount(event) {
  return clamp(
    (event.deltaY + event.deltaX) * (event.deltaMode === 1 ? 16 : 1),
    -60,
    60,
  );
}
export function vibrate(duration = 6) {
  try {
    navigator.vibrate?.(duration);
  } catch {
    /* Optional on desktop browsers. */
  }
}
