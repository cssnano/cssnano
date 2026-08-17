import { test } from 'node:test';
import assert from 'node:assert';
import { minimize } from '../src/playground-minifier.js';
import { PlaygroundRunner } from '../src/playground-runner.js';

function createMinifierWorker() {
  const worker = {
    postMessage({ input, config }) {
      void minimize(input, config).then((result) => {
        worker.onmessage?.({ data: result });
      });
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

test('CSS minifier client returns the worker minification result', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);

  assert.strictEqual(
    await playgroundRunner.minimizeCss(
      'a { color: red; }',
      'cssnano-preset-default'
    ),
    'a{color:red}'
  );
});

test('CSS minifier client rejects overlapping minification requests', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);
  const pending = playgroundRunner.minimizeCss(
    'a { color: red; }',
    'cssnano-preset-default'
  );

  await assert.rejects(
    playgroundRunner.minimizeCss(
      'b { color: blue; }',
      'cssnano-preset-default'
    ),
    /Minification is busy/
  );

  await pending;
});

test('CSS minifier client reports worker failures', async () => {
  const minifierWorker = createMinifierWorker();
  const playgroundRunner = new PlaygroundRunner(minifierWorker);
  const minification = playgroundRunner.minimizeCss(
    'a { color: red; }',
    'cssnano-preset-default'
  );

  minifierWorker.emitError('Worker crashed');
  await assert.rejects(minification, /Worker crashed/);
});
