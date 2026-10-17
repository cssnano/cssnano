import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, test } from 'node:test';

const fixtures = new URL('./fixtures/', import.meta.url);

// Runs the default preset in a child process, where a loader counts the
// browserslist calls made by the plugin shims.
function countBrowserslistCalls(css, from) {
  const script = `
import postcss from ${JSON.stringify(new URL('../../../node_modules/postcss/lib/postcss.js', import.meta.url).href)};
import cssnano from ${JSON.stringify(new URL('../../../src/index.js', import.meta.url).href)};
import preset from ${JSON.stringify(new URL('../../../src/presets/default.js', import.meta.url).href)};
await postcss(preset()).process(${JSON.stringify(css)}, { from: ${JSON.stringify(from)} });
process.stdout.write(String(globalThis.browserslistCalls ?? 0));
`;
  return Number(
    execFileSync(
      process.execPath,
      [
        '--import',
        new URL('registerCountingBrowserslist.js', fixtures).href,
        '--input-type=module',
        '-e',
        script,
      ],
      { encoding: 'utf8' }
    )
  );
}

describe('default preset targets', () => {
  test('resolves browserslist once for a file whose plugins share one result', () => {
    const css =
      'a{color:transparent;background:rgba(0,0,0,.5);margin:0px;transition:0ms}';
    assert.equal(countBrowserslistCalls(css, '/project/src/app.css'), 1);
  });

  test('resolves browserslist once for a file without from, because the plugin package directory does not select the config', () => {
    const css = 'a{color:transparent;margin:0px;transition:0ms}';
    assert.equal(countBrowserslistCalls(css, undefined), 1);
  });
});
