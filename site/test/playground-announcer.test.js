import { test } from 'node:test';
import assert from 'node:assert';
import { StatusAnnouncer } from '../src/playground-announcer.js';

/** Timers that run only when the test flushes them. */
function fakeTimers() {
  /** @type {Map<number, { callback: () => void, delay: number }>} */
  const scheduled = new Map();
  let nextHandle = 0;
  return {
    scheduled,
    schedule(callback, delay) {
      const handle = ++nextHandle;
      scheduled.set(handle, { callback, delay });
      return handle;
    },
    cancel(handle) {
      scheduled.delete(handle);
    },
    flush() {
      for (const [handle, { callback }] of scheduled) {
        scheduled.delete(handle);
        callback();
      }
    },
  };
}

test('status announcer clears the region at once when a message is announced', () => {
  const region = { textContent: 'Minified from 1.0 kilobytes to 800 bytes' };
  new StatusAnnouncer(region, fakeTimers()).announce(
    'Minified from 1.0 kilobytes to 800 bytes'
  );
  assert.strictEqual(region.textContent, '');
});

test('status announcer sets the message after a 100 ms gap', () => {
  const region = { textContent: '' };
  const timers = fakeTimers();
  new StatusAnnouncer(region, timers).announce('Error: Worker crashed');
  assert.deepStrictEqual(
    [...timers.scheduled.values()].map(({ delay }) => delay),
    [100]
  );
});

test('status announcer sets the message once the gap has passed', () => {
  const region = { textContent: '' };
  const timers = fakeTimers();
  new StatusAnnouncer(region, timers).announce('Error: Worker crashed');
  timers.flush();
  assert.strictEqual(region.textContent, 'Error: Worker crashed');
});

test('status announcer clears the region again when the same message is repeated', () => {
  const region = { textContent: '' };
  const timers = fakeTimers();
  const announcer = new StatusAnnouncer(region, timers);
  announcer.announce('Minified from 1.0 kilobytes to 800 bytes');
  timers.flush();
  announcer.announce('Minified from 1.0 kilobytes to 800 bytes');
  assert.strictEqual(region.textContent, '');
});

test('status announcer drops a pending message when a newer one is announced', () => {
  const region = { textContent: '' };
  const timers = fakeTimers();
  const announcer = new StatusAnnouncer(region, timers);
  announcer.announce('first');
  announcer.announce('second');
  timers.flush();
  assert.strictEqual(region.textContent, 'second');
});
