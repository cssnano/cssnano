'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const litePreset = require('cssnano-preset-lite');
const autoprefixer = require('autoprefixer');
const cssnano = require('..');

test('should run the plugins in the preset', () => {
  const preset = litePreset();

  return postcss([cssnano({ preset })])
    .process(
      `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example{display:grid;transition:all .5s;user-select:none;background:linear-gradient(to bottom,white,black)}`
      );
    });
});

test('should run the plugin passed through the cssnano config.plugins', () => {
  const preset = litePreset({ discardComments: false });

  return postcss([cssnano({ preset, plugins: [autoprefixer] })])
    .process(
      `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example{display:grid;transition:all .5s;-ms-user-select:none;user-select:none;background:linear-gradient(to bottom,white,black)}`
      );
    });
});

test('should run the plugin when plugin module is being used with no array inside plugins', () => {
  const preset = litePreset();
  return postcss([cssnano({ preset, plugins: [require('autoprefixer')] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(result.css, `.example{-ms-user-select:none;user-select:none}`);
    });
});

test('should run the plugin when no preset is mentioned', () => {
  return postcss([cssnano({ plugins: [require('autoprefixer')] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when no preset is mentioned with string plugin name', () => {
  return postcss([cssnano({ plugins: ['autoprefixer'] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when no preset is mentioned with string plugin name as in array', () => {
  return postcss([cssnano({ plugins: [['autoprefixer']] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin with string plugin name as in array', () => {
  const preset = litePreset();
  return postcss([cssnano({ preset, plugins: [['autoprefixer']] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(result.css, `.example{-ms-user-select:none;user-select:none}`);
    });
});

test('should run the plugin when no preset is mentioned with string plugin name as in array and options', () => {
  return postcss([cssnano({ plugins: [['autoprefixer', { remove: false }]] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin with string plugin name as in array and options', () => {
  const preset = litePreset();
  return postcss([
    cssnano({ preset, plugins: [['autoprefixer', { remove: false }]] }),
  ])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(result.css, `.example{-ms-user-select:none;user-select:none}`);
    });
});

test('should run the plugin when preset is empty array and plugin module as in array in plugins array', () => {
  return postcss([
    cssnano({ preset: [], plugins: [[require('autoprefixer')]] }),
  ])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin plugin module as in array in plugins array', () => {
  const preset = litePreset();
  return postcss(cssnano({ preset, plugins: [[require('autoprefixer')]] }))
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(result.css, `.example{-ms-user-select:none;user-select:none}`);
    });
});

test('should run the plugin plugin module as in array in plugins array with empty plugin option', () => {
  const preset = litePreset();
  return postcss([
    cssnano({ preset, plugins: [[require('autoprefixer'), {}]] }),
  ])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(result.css, `.example{-ms-user-select:none;user-select:none}`);
    });
});

test('should run the plugin when preset is empty array and plugin module as in non array in plugins array', () => {
  return postcss([cssnano({ preset: [], plugins: [require('autoprefixer')] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array and plugin as string as in non array in plugins array', () => {
  return postcss([cssnano({ preset: [], plugins: ['autoprefixer'] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array', () => {
  return postcss([
    cssnano({ preset: [], plugins: [[autoprefixer, { grid: 'autoplace' }]] }),
  ])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with string as a plugin', () => {
  return postcss([
    cssnano({ preset: [], plugins: [['autoprefixer', { grid: 'autoplace' }]] }),
  ])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with options', () => {
  return postcss([
    cssnano({ preset: [], plugins: [[autoprefixer, { add: false }]] }),
  ])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with options and string as plugin', () => {
  return postcss([
    cssnano({ preset: [], plugins: [['autoprefixer', { add: false }]] }),
  ])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [['autoprefixer', { add: false }]] }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with options and string as plugin and no options for the plugin', () => {
  return postcss([cssnano({ preset: [], plugins: [['autoprefixer']] })])
    .process(
      `.example { user-select: none; }
`,
      { from: undefined }
    )
    .then((result) => {
      assert.is(
        result.css,
        `.example { -ms-user-select: none; user-select: none; }
`
      );
    });
});
test.run();
