import test from 'node:test';
import assert from 'node:assert/strict';
import { PushUpDetector } from '../fitness/pushUpDetector';

test('PushUpDetector: angle calculation returns correct geometry', () => {
  // 90 degree right angle: (0, 1) -> (0, 0) -> (1, 0)
  const a = { x: 0, y: 1, confidence: 1 };
  const b = { x: 0, y: 0, confidence: 1 };
  const c = { x: 1, y: 0, confidence: 1 };

  const angle = PushUpDetector.calculateAngle(a, b, c);
  assert.ok(Math.abs(angle - 90) < 0.01, `Expected 90 degrees, got ${angle}`);
});

test('PushUpDetector: state machine validates full rep with PERFECT form', () => {
  const detector = new PushUpDetector();
  assert.equal(detector.getPhase(), 'READY');

  let now = 1000;
  // 1. In plank: 160°
  detector.processAngle(160, now);
  assert.equal(detector.getPhase(), 'READY');

  // 2. Start descent: 130°
  now += 200;
  detector.processAngle(130, now);
  assert.equal(detector.getPhase(), 'DESCENDING');

  // 3. Reach bottom depth: 78°
  now += 500;
  detector.processAngle(78, now);
  assert.equal(detector.getPhase(), 'BOTTOM_HOLD');

  // 4. Begin ascending: 110°
  now += 300;
  detector.processAngle(110, now);
  assert.equal(detector.getPhase(), 'ASCENDING');

  // 5. Reach top lockout: 155°
  now += 400;
  const result = detector.processAngle(155, now);

  assert.ok(result !== null, 'Rep should be validated');
  assert.equal(result?.quality, 'PERFECT');
  assert.equal(result?.repNumber, 1);
  assert.equal(result?.bonusMultiplier, 2.5);
  assert.equal(detector.getStreak(), 1);
  assert.equal(detector.getPhase(), 'READY');
});

test('PushUpDetector: shallow rep fails and resets streak', () => {
  const detector = new PushUpDetector();

  // First give 1 good rep
  detector.triggerSimulatedRep('GOOD');
  assert.equal(detector.getStreak(), 1);

  let now = 5000;
  // Descend to only 130° (did not reach bottom threshold)
  detector.processAngle(130, now);
  assert.equal(detector.getPhase(), 'DESCENDING');

  // Come back up without breaking bottom depth
  now += 400;
  const result = detector.processAngle(150, now);
  assert.equal(result, null, 'Shallow rep must not validate');
  assert.equal(detector.getStreak(), 0, 'Streak should reset on failed rep');
  assert.equal(detector.getPhase(), 'READY');
});

test('PushUpDetector: sensitivity levels dynamically adjust bottom depth and lockout angles', () => {
  const detector = new PushUpDetector();
  assert.equal(detector.getSensitivity(), 'high', 'Default should be high sensitivity');

  // Test Ultra sensitivity
  detector.setSensitivity('ultra');
  assert.equal(detector.getSensitivity(), 'ultra');

  let now = 2000;
  // With Ultra sensitivity, 118° triggers bottom hold (threshold is 120°)
  detector.processAngle(140, now);
  assert.equal(detector.getPhase(), 'DESCENDING');

  now += 200;
  detector.processAngle(118, now);
  assert.equal(detector.getPhase(), 'BOTTOM_HOLD', 'Ultra sensitivity should trigger bottom hold at 118°');

  // And lockout at 136° (threshold is 135°)
  now += 300;
  const result = detector.processAngle(136, now);
  assert.ok(result !== null, 'Ultra sensitivity should validate rep at 136° lockout');
  assert.equal(result?.repNumber, 1);
});

