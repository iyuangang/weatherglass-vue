import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionLabel, formatTime, precipitationLabel, seasonLabel, shortestDelta, timeX, timeY, wrap } from '../src/ui/weather.js';

test('time wraps across midnight, including negative drags', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(1), '00:00');
  assert.equal(formatTime(15.24 / 24), '15:14');
  assert.equal(formatTime(-1 / 24), '23:00');
  assert.ok(Math.abs(shortestDelta(0.01 - 0.99, 1) - 0.02) < 1e-10);
});
test('sun follows the same horizon arc at dawn, noon and dusk', () => {
  assert.ok(Math.abs(timeY(0.25) - 0.5) < 1e-10);
  assert.ok(Math.abs(timeY(0.5) - 0.14) < 1e-10);
  assert.ok(Math.abs(timeY(0.75) - 0.5) < 1e-10);
  assert.equal(timeX(0), 0.035);
});
test('seasons interpolate through the nearest boundary without a full turn', () => {
  assert.deepEqual(seasonLabel(0.25), { sub: 'Late', name: 'Spring' });
  assert.deepEqual(seasonLabel(3.75), { sub: 'Early', name: 'Spring' });
  assert.deepEqual(seasonLabel(1), { sub: 'Mid', name: 'Summer' });
  assert.equal(wrap(4.05, 4).toFixed(2), '0.05');
  assert.ok(Math.abs(shortestDelta(0.1 - 3.9, 4) - 0.2) < 1e-10);
});
test('weather descriptions distinguish rain, snow, storms and clear nights', () => {
  assert.equal(conditionLabel({ seaLevelTemp: 18, sunElevation: 0.8 }), 'sunny');
  assert.equal(conditionLabel({ seaLevelTemp: -3, night: 1 }), 'frosty night');
  assert.equal(conditionLabel({ storminess: 0.8, snowfall: 2, rainfall: 0, fogAmount: 0.5 }), 'thunderstorm, snow');
  assert.equal(conditionLabel({ rainfall: 0.5, freezingLevel: 2 }), 'rain, snow on the peaks');
  assert.equal(precipitationLabel(0.5, 0.2), 'sleet');
  assert.equal(precipitationLabel(0, 1.2), 'heavy snow');
});
