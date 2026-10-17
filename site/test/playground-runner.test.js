import { test } from 'node:test';
import assert from 'node:assert';
import { minimize } from '../src/playground-minifier.js';
import { CssInputError, PlaygroundRunner } from '../src/playground-runner.js';

function createMinifierWorker() {
  const worker = {
    postMessage({ input, preset }) {
      void (async () => {
        const result = await minimize(input, preset);
        worker.onmessage?.({ data: result });
      })();
    },
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    emitError(message) {
      worker.onerror?.({ message });
    },
  };
  return worker;
}

test('PlaygroundRunner returns the worker minification result', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);

  assert.strictEqual(
    await playgroundRunner.minimizeCss('a { color: red; }', 'default'),
    'a{color:red}'
  );
});

test('PlaygroundRunner rejects overlapping minification requests', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);
  const pending = playgroundRunner.minimizeCss('a { color: red; }', 'default');

  await assert.rejects(
    playgroundRunner.minimizeCss('b { color: blue; }', 'default'),
    /Minification is busy/v
  );

  await pending;
});

test('PlaygroundRunner reports worker failures', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);
  const minification = playgroundRunner.minimizeCss(
    'a { color: red; }',
    'default'
  );

  minifierWorker.emitError('Worker crashed');
  await assert.rejects(minification, /Worker crashed/v);
});

test('PlaygroundRunner rejects unparsable CSS with an input error', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);

  await assert.rejects(
    playgroundRunner.minimizeCss('a { color: red', 'default'),
    CssInputError
  );
});

test('PlaygroundRunner does not report worker failures as input errors', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);
  const minification = playgroundRunner.minimizeCss(
    'a { color: red; }',
    'default'
  );

  minifierWorker.emitError('Worker crashed');
  await assert.rejects(
    minification,
    (err) => err instanceof Error && !(err instanceof CssInputError)
  );
});
