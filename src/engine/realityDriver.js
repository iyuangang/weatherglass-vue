import { clamp } from "../ui/weather.js";
import { isFogCode, isRainCode, isSnowCode } from "../services/weatherApi.js";

// Adapt real conditions to the miniature's visual scale. Network/astronomy work
// happens outside the animation loop; this driver only applies cached numbers.
export function createRealityDriver(scene) {
  const ctx = scene.ctx;
  const { world, wind } = ctx;
  const sky = ctx.modules.sky;
  const clouds = ctx.modules.clouds;
  const original = {
    worldUpdate: world.update,
    cloudsReport: world.reportClouds,
    windUpdate: wind.update,
    cloudUpdate: clouds.update,
    orbitSync: sky.orbit.sync,
    orbsUpdate: sky.orbs.update,
    snowFraction: world.snowFractionAt,
  };
  let enabled = false;
  let snapshot = null;
  let weather = null;
  let lastWeather = null;
  let lastCloudCheck = -Infinity;
  let disposed = false;
  let applying = false;
  const center = new ctx.THREE.Vector3(...scene.celestialSphere.center);
  const radius = scene.celestialSphere.radius;
  const right = new ctx.THREE.Vector3();
  const up = new ctx.THREE.Vector3();
  const tangent = new ctx.THREE.Vector3();
  const owns = (cloud) => cloud.realWeather === true;
  const active = () => enabled && snapshot && !disposed;

  function reconcileClouds(reset = false) {
    if (!active() || !weather) return;
    if (reset) {
      clouds.clear();
      ctx.modules.fog?.clear?.();
    }
    const raining = weather.precipitation > 0;
    const count =
      weather.cloudCover < 0.06 && !raining
        ? 0
        : clamp(Math.round(weather.cloudCover * 3), raining ? 2 : 1, 3);
    const existing = clouds.list.filter(
      (cloud) => owns(cloud) && !cloud.dissolving,
    );
    const positions = [
      [-2.5, -1.0, 5.5],
      [2.3, 1.1, 6.0],
      [0.2, 2.3, 5.3],
    ];
    applying = true;
    try {
      for (let index = existing.length; index < count; index++) {
        const [x, z, y] = positions[index];
        const cloud = clouds.spawn({
          x,
          z,
          y,
          size: 1.0 + weather.cloudCover * 0.5,
          water: raining ? 1.1 : 0.32,
          storm: weather.code >= 95 ? 0.85 : 0,
          charge: weather.code >= 95 ? 0.6 : 0,
          fadeIn: true,
        });
        cloud.realWeather = true;
      }
      for (const cloud of existing.slice(count)) cloud.dissolving = true;
      if (reset && isFogCode(weather.code)) {
        ctx.modules.fog?.addFog?.(0, 1.5, 3.2, 0.9);
        ctx.modules.fog?.addFog?.(-2.8, -0.5, 2, 0.6);
      }
    } finally {
      applying = false;
    }
  }

  world.update = function updateRealWorld(delta) {
    if (active()) {
      this.dayCycle = false;
      this.seasonTarget = null;
      this.timeOfDay = snapshot.clock.timeOfDay;
      this.season = snapshot.season.value;
      sky.glide = null;
      sky.timeVel = 0;
    }
    original.worldUpdate.call(this, delta);
    if (!active()) return;
    this.sunDir.set(
      snapshot.sun.direction.x,
      snapshot.sun.direction.y,
      snapshot.sun.direction.z,
    );
    this.moonDir.set(
      snapshot.moon.direction.x,
      snapshot.moon.direction.y,
      snapshot.moon.direction.z,
    );
    this.sunPosition.copy(center).addScaledVector(this.sunDir, radius);
    this.moonPosition.copy(center).addScaledVector(this.moonDir, radius);
    this.sunElevation = this.sunDir.y;
    const smooth = (min, max, value) => {
      const fraction = clamp((value - min) / (max - min), 0, 1);
      return fraction * fraction * (3 - 2 * fraction);
    };
    this.day = smooth(-0.12, 0.12, this.sunElevation);
    this.night = 1 - smooth(-0.2, 0.02, this.sunElevation);
    this.golden =
      smooth(-0.06, 0.06, this.sunElevation) *
      (1 - smooth(0.12, 0.42, this.sunElevation));
    if (weather) {
      this._seaTemp = weather.temperature;
      this.tempOffset = 0;
      this.humidity = weather.humidity;
      this.cloudCover = weather.cloudCover;
      this.storminess = weather.code >= 95 ? 0.85 : 0;
      this.seasonal.breeze = clamp(weather.windSpeed * 0.18, 0, 2.5);
    }
    this._updateLight();
    if (this.sunElevation <= -0.03)
      this.lightIntensity *=
        this.moonDir.y > 0 ? 0.15 + snapshot.moon.fraction * 0.85 : 0.04;
  };
  world.reportClouds = function reportRealClouds(report) {
    if (active() && weather)
      original.cloudsReport.call(this, {
        cover: weather.cloudCover,
        storm: weather.code >= 95 ? 0.85 : 0,
      });
    else original.cloudsReport.call(this, report);
  };
  world.snowFractionAt = function realSnowFraction(height) {
    if (active() && weather && isSnowCode(weather.code)) return 1;
    if (active() && weather && isRainCode(weather.code)) return 0;
    return original.snowFraction.call(this, height);
  };
  wind.update = function updateRealWind(delta) {
    const live = active() && weather;
    const angle = live ? (weather.windDirection * Math.PI) / 180 : 0;
    const speed = live ? clamp(weather.windSpeed * 0.18, 0, 2.5) : 0;
    // Weather bearings describe where wind comes FROM; scene vectors point TO.
    if (live) {
      this.ambientDir = Math.atan2(Math.cos(angle), -Math.sin(angle));
      this.ambient.set(-Math.sin(angle) * speed, Math.cos(angle) * speed);
    }
    original.windUpdate.call(this, delta);
    if (live) {
      this.ambient.set(-Math.sin(angle) * speed, Math.cos(angle) * speed);
      this.energy = speed;
      world.windEnergy = speed;
    }
  };
  clouds.update = function updateRealClouds(delta, time) {
    const live = active() && weather;
    const intensity = live
      ? clamp(Math.log1p(weather.precipitation) * 0.65, 0, 1.8)
      : 0;
    if (live && (weather !== lastWeather || time - lastCloudCheck > 20)) {
      reconcileClouds(weather !== lastWeather);
      lastWeather = weather;
      lastCloudCheck = time;
    }
    if (live)
      for (const cloud of this.list.filter(owns)) {
        cloud.size = Math.max(cloud.size || 0, 1 + weather.cloudCover * 0.5);
        cloud.water = intensity > 0 ? 1.1 : 0.32;
        cloud.heldSqueeze = intensity > 0 ? 0.6 : 0;
        cloud.stormTarget = weather.code >= 95 ? 0.85 : 0;
      }
    original.cloudUpdate.call(this, delta, time);
    if (!live) return;
    const liveClouds = this.list.filter(
      (cloud) => owns(cloud) && !cloud.dissolving,
    );
    for (const source of ctx.precip.sources)
      if (liveClouds.some((cloud) => cloud.id === source.cloudId))
        source.rate = 0;
    if (intensity <= 0) return;
    for (const cloud of liveClouds) {
      cloud.rate = intensity / Math.max(1, liveClouds.length);
      const source = ctx.precip.sources.find(
        (item) => item.cloudId === cloud.id,
      );
      if (source) source.rate = cloud.rate;
      else
        ctx.precip.sources.push({
          x: cloud.position.x,
          y: cloud.baseY,
          z: cloud.position.z,
          radius: cloud.radius * 0.72,
          rate: cloud.rate,
          cloudId: cloud.id,
        });
    }
  };
  sky.orbit.sync = function syncRealOrbit() {
    if (!active()) return original.orbitSync.call(this);
  };
  sky.orbs.update = function updateRealOrbs(delta, time, module) {
    original.orbsUpdate.call(this, delta, time, module);
    if (!active()) return;
    // Actual illuminated fraction, instead of the original always-nearly-full disc.
    const z = clamp(snapshot.moon.fraction * 2 - 1, -1, 1);
    tangent
      .copy(world.sunDir)
      .addScaledVector(world.moonDir, -world.sunDir.dot(world.moonDir));
    right.setFromMatrixColumn(ctx.camera.matrixWorld, 0);
    up.setFromMatrixColumn(ctx.camera.matrixWorld, 1);
    const angle = Math.atan2(tangent.dot(up), tangent.dot(right));
    const lateral = Math.sqrt(Math.max(0, 1 - z * z));
    this.moonMat.uniforms.uSunV.value.set(
      Math.cos(angle) * lateral,
      Math.sin(angle) * lateral,
      z,
    );
  };

  return {
    get applying() {
      return applying;
    },
    setSnapshot(value, currentWeather) {
      snapshot = value;
      weather = currentWeather;
    },
    setEnabled(value) {
      if (value && !enabled) {
        lastWeather = null;
        lastCloudCheck = -Infinity;
      }
      enabled = value;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      world.update = original.worldUpdate;
      world.reportClouds = original.cloudsReport;
      world.snowFractionAt = original.snowFraction;
      wind.update = original.windUpdate;
      clouds.update = original.cloudUpdate;
      sky.orbit.sync = original.orbitSync;
      sky.orbs.update = original.orbsUpdate;
    },
  };
}
