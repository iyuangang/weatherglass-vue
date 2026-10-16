import test from "node:test";
import assert from "node:assert/strict";
import { createRealityDriver } from "../src/engine/realityDriver.js";

class Vector {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }
  set(x, y, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  copy(v) {
    return this.set(v.x, v.y, v.z);
  }
  addScaledVector(v, scale) {
    this.x += v.x * scale;
    this.y += v.y * scale;
    this.z += v.z * scale;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  setFromMatrixColumn(matrix, column) {
    return this.copy(matrix[column]);
  }
}
function fixture() {
  let resets = 0;
  const world = {
    dayCycle: true,
    seasonTarget: 2,
    timeOfDay: 0.6,
    season: 0,
    seasonal: {},
    sunDir: new Vector(),
    moonDir: new Vector(),
    sunPosition: new Vector(),
    moonPosition: new Vector(),
    update() {
      this._seaTemp = 12;
      this.sunDir.set(0, 1, 0);
      this.moonDir.set(0, -1, 0);
    },
    _updateLight() {
      this.lightIntensity = 2;
    },
    reportClouds({ cover, storm }) {
      this.cloudCover = cover;
      this.storminess = storm;
    },
    snowFractionAt() {
      return 0.5;
    },
  };
  const wind = {
    ambient: new Vector(),
    update() {
      this.ambient.set(0.2, 0.1);
      world.windEnergy = 0.3;
    },
  };
  const orbs = {
    moonMat: { uniforms: { uSunV: { value: new Vector() } } },
    update() {},
  };
  const clouds = {
    list: [],
    clear() {
      this.list = [];
      resets++;
    },
    spawn({ x, y, z }) {
      const cloud = {
        id: this.list.length + 1,
        position: new Vector(x, y, z),
        baseY: y,
        radius: 1,
      };
      this.list.push(cloud);
      return cloud;
    },
    update() {
      world.reportClouds({ cover: 0.1, storm: 0 });
    },
  };
  const ctx = {
    THREE: { Vector3: Vector },
    world,
    wind,
    modules: {
      sky: { orbit: { sync() {} }, orbs },
      clouds,
      fog: { clear() {} },
    },
    camera: { matrixWorld: [new Vector(1, 0, 0), new Vector(0, 1, 0)] },
    precip: { sources: [] },
  };
  const scene = { ctx, celestialSphere: { center: [0, 2, 0], radius: 10 } };
  const sky = {
    clock: { timeOfDay: 0.8 },
    season: { value: 2 },
    sun: { direction: { x: 1, y: 0, z: 0 } },
    moon: { direction: { x: 0, y: 1, z: 0 }, fraction: 0.25 },
  };
  const weather = {
    code: 63,
    temperature: 23,
    humidity: 0.8,
    cloudCover: 0.9,
    windSpeed: 10,
    windDirection: 90,
    precipitation: 2,
  };
  return {
    scene,
    sky,
    weather,
    world,
    wind,
    clouds,
    orbs,
    resets: () => resets,
  };
}

test("real conditions override the simulation and keep astronomical sun/moon positions independent", () => {
  const f = fixture(),
    driver = createRealityDriver(f.scene);
  driver.setSnapshot(f.sky, f.weather);
  driver.setEnabled(true);
  f.world.update(1 / 30);
  f.wind.update(1 / 30);
  f.clouds.update(1 / 30, 0);
  f.orbs.update(1 / 30, 0, {});
  assert.equal(f.world._seaTemp, 23);
  assert.equal(f.world.humidity, 0.8);
  assert.equal(f.world.cloudCover, 0.9);
  assert.equal(f.world.dayCycle, false);
  assert.equal(f.world.season, 2);
  assert.deepEqual(
    [f.world.sunPosition.x, f.world.sunPosition.y, f.world.sunPosition.z],
    [10, 2, 0],
  );
  assert.deepEqual(
    [f.world.moonPosition.x, f.world.moonPosition.y, f.world.moonPosition.z],
    [0, 12, 0],
  );
  assert.ok(f.wind.ambient.x < 0 && Math.abs(f.wind.ambient.y) < 1e-10);
  assert.equal(f.orbs.moonMat.uniforms.uSunV.value.z, -0.5);
  assert.equal(f.world.snowFractionAt(2), 0);
  assert.ok(f.scene.ctx.precip.sources.some((source) => source.rate > 0));
  f.clouds.update(1 / 30, 1);
  assert.equal(f.resets(), 1, "cloud geometry is not rebuilt each frame");
  driver.dispose();
});
test("clear weather creates no rain and disabling/disposal restores manual simulation methods", () => {
  const f = fixture(),
    originalUpdate = f.world.update;
  const driver = createRealityDriver(f.scene);
  driver.setSnapshot(f.sky, {
    ...f.weather,
    code: 0,
    cloudCover: 0,
    precipitation: 0,
  });
  driver.setEnabled(true);
  f.world.update(0.1);
  f.clouds.update(0.1, 0);
  assert.equal(f.clouds.list.length, 0);
  assert.equal(f.scene.ctx.precip.sources.length, 0);
  driver.setEnabled(false);
  f.world.update(0.1);
  assert.equal(f.world._seaTemp, 12);
  driver.dispose();
  assert.equal(f.world.update, originalUpdate);
});
