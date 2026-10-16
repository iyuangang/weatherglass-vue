import test from "node:test";
import assert from "node:assert/strict";
import { locateAutomatically, locateByIp } from "../src/services/weatherApi.js";

async function withBrowserGlobals(navigator, fetch, action) {
  const previous = Object.fromEntries(
    ["navigator", "window", "fetch"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: navigator,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { search: "" } },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetch,
  });
  try {
    await action();
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test("automatic location uses the browser permission flow and rounds device coordinates", async () => {
  let called = 0;
  await withBrowserGlobals(
    {
      permissions: { query: async () => ({ state: "prompt" }) },
      geolocation: {
        getCurrentPosition(success) {
          called++;
          success({ coords: { latitude: 30.274153, longitude: 120.15507 } });
        },
      },
    },
    () => {
      throw new Error("IP fallback should not be used");
    },
    async () => {
      const location = await locateAutomatically();
      assert.equal(called, 1);
      assert.equal(location.latitude, 30.27);
      assert.equal(location.longitude, 120.16);
      assert.equal(location.source, "device");
    },
  );
});
test("denied device permission falls back to clearly identified coarse IP data without retaining the IP", async () => {
  await withBrowserGlobals(
    { permissions: { query: async () => ({ state: "denied" }) } },
    async () => ({
      ok: true,
      json: async () => ({
        latitude: "37.751",
        longitude: "-97.822",
        country: "United States",
        timezone: "America/Chicago",
        accuracy: 1000,
        ip: "192.0.2.1",
        asn: 64500,
      }),
    }),
    async () => {
      const location = await locateAutomatically();
      assert.equal(location.source, "ip");
      assert.equal(location.accuracyKm, 1000);
      assert.equal(location.latitude, 37.8);
      assert.ok(!("ip" in location));
      assert.ok(!("asn" in location));
    },
  );
});
test("malformed IP coordinates never become a fabricated location at zero latitude", async () => {
  await withBrowserGlobals(
    {},
    async () => ({
      ok: true,
      json: async () => ({ latitude: "", longitude: null }),
    }),
    async () => {
      await assert.rejects(() => locateByIp(), /有效坐标/);
    },
  );
});
