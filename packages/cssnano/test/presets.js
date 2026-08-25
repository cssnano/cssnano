import process from 'node:process';
import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import advancedPreset from 'cssnano-preset-advanced';
import defaultPreset from 'cssnano-preset-default';
import litePreset from 'cssnano-preset-lite';
import cssnano from '../src/index.js';

const { describe, test } = nodetest;
describe('preset resolution', () => {
  test('should load default preset when options are empty or omitted', async () => {
    const result1 = await postcss([cssnano()]).process(
      'h1 { color: #ffffff }',
      {
        from: undefined,
      }
    );
    assert.strictEqual(result1.css, 'h1{color:#fff}');

    const result2 = await postcss([cssnano({})]).process(
      'h1 { color: #ffffff }',
      {
        from: undefined,
      }
    );
    assert.strictEqual(result2.css, 'h1{color:#fff}');
  });

  test('should accept an invoked preset', async () => {
    const preset = defaultPreset({ normalizeCharset: { add: true } });

    const result = await postcss([cssnano({ preset })]).process(
      `h1{content:"©"}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `@charset "utf-8";h1{content:"©"}`);
  });

  test('should accept a non-invoked preset', async () => {
    const preset = [defaultPreset, { normalizeCharset: { add: true } }];

    const result = await postcss([cssnano({ preset })]).process(
      `h1{content:"©"}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `@charset "utf-8";h1{content:"©"}`);
  });

  test('should accept a preset factory function directly', async () => {
    const result = await postcss([cssnano({ preset: defaultPreset })]).process(
      'h1 { color: #ffffff }',
      { from: undefined }
    );
    assert.strictEqual(result.css, 'h1{color:#fff}');
  });

  test('should accept a default preset string', async () => {
    const preset = ['default', { normalizeCharset: { add: true } }];

    const result = await postcss([cssnano({ preset })]).process(
      `h1{content:"©"}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `@charset "utf-8";h1{content:"©"}`);
  });

  test('should accept a full package name for preset', async () => {
    const result = await postcss([
      cssnano({ preset: 'cssnano-preset-default' }),
    ]).process('h1 { color: #ffffff }', { from: undefined });
    assert.strictEqual(result.css, 'h1{color:#fff}');
  });

  test('should accept shorthand string for other presets', async () => {
    const result = await postcss([cssnano({ preset: 'lite' })]).process(
      'h1 { color: #ffffff }',
      { from: undefined }
    );
    assert.strictEqual(result.css, 'h1{color:#ffffff}');
  });

  test('should accept imported lite preset factory and invoked preset', async () => {
    const result1 = await postcss([cssnano({ preset: litePreset })]).process(
      'h1 { color: #ffffff }',
      { from: undefined }
    );
    assert.strictEqual(result1.css, 'h1{color:#ffffff}');

    const result2 = await postcss([
      cssnano({ preset: litePreset({ discardComments: false }) }),
    ]).process('/* comment */h1 { color: #ffffff }', { from: undefined });
    assert.strictEqual(result2.css, '/* comment */h1{color:#ffffff}');
  });

  test('should accept an invoked preset other than default', async () => {
    const preset = advancedPreset({ zindex: { startIndex: 15 } });

    const result = await postcss([cssnano({ preset })]).process(
      `h1{z-index:10}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `h1{z-index:15}`);
  });

  test('should accept a preset string other than default', async () => {
    const preset = 'cssnano-preset-advanced';

    const result = await postcss([cssnano({ preset })]).process(
      `h1{z-index:10}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `h1{z-index:1}`);
  });

  test('should accept a preset string other than default, with options', async () => {
    const preset = ['cssnano-preset-advanced', { zindex: { startIndex: 15 } }];

    const result = await postcss([cssnano({ preset })]).process(
      `h1{z-index:10}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `h1{z-index:15}`);
  });

  test('should accept a preset string other than default (sugar syntax)', async () => {
    const preset = ['advanced', { zindex: { startIndex: 15 } }];

    const result = await postcss([cssnano({ preset })]).process(
      `h1{z-index:10}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `h1{z-index:15}`);
  });

  test('does not access filesystem or cwd when creating cssnano plugin', () => {
    let cwdAccessed = false;
    const originalCwd = process.cwd;
    try {
      process.cwd = () => {
        cwdAccessed = true;
        return originalCwd();
      };
      cssnano();
      cssnano({});
      cssnano({ preset: 'default' });
      assert.strictEqual(
        cwdAccessed,
        false,
        'process.cwd() should not be called'
      );
    } finally {
      process.cwd = originalCwd;
    }
  });
});

describe('plugin selection', () => {
  test('should be able to exclude plugins', async () => {
    const preset = ['advanced', { zindex: false }];

    const result = await postcss([cssnano({ preset })]).process(
      `h1{z-index:10}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `h1{z-index:10}`);
  });

  test('should be able to include plugins', async () => {
    const preset = ['advanced', { zindex: true }];

    const result = await postcss([cssnano({ preset })]).process(
      `h1{z-index:10}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `h1{z-index:1}`);
  });

  test('should be able to exclude plugins (exclude syntax)', async () => {
    const preset = ['advanced', { zindex: { startIndex: 15, exclude: true } }];

    const result = await postcss([cssnano({ preset })]).process(
      `h1{z-index:10}`,
      { from: undefined }
    );
    assert.strictEqual(result.css, `h1{z-index:10}`);
  });

  test('should be able to exclude pointer-events plugin', async () => {
    const result = await cssnano({
      preset: [
        'default',
        {
          reduceInitial: { ignore: ['pointer-events'] },
        },
      ],
    }).process('.selector { pointer-events: initial; }', { from: undefined });
    assert.strictEqual(result.css, '.selector{pointer-events:initial}');
  });
});

test('should error on a bad preset', async () => {
  try {
    await postcss([cssnano({ preset: 'avanced' })]).process('h1{}', {
      from: undefined,
    });
    assert.unreachable();
  } catch (error) {
    assert.ok(error);
    assert.match(
      error.message,
      /Cannot load preset "avanced"\. Please check your configuration for errors and try again\./
    );
  }
});

describe('deprecated options', () => {
  test('should warn once when the configFile option is passed', () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (msg) => {
      warnings.push(msg);
    };
    try {
      cssnano({ configFile: '.cssnanorc.json' });
      cssnano({ configFile: 'cssnano.config.js' });
    } finally {
      console.warn = originalWarn;
    }

    assert.strictEqual(warnings.length, 1, 'should warn only once per process');
    assert.match(warnings[0], /`configFile` option is no longer supported/);
  });
});
