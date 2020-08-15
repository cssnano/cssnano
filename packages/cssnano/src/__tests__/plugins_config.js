import litePreset from 'cssnano-preset-lite';
import autoprefixer from 'autoprefixer';
import cssnano from '..';

test('should run the plugins in the preset', () => {
  const preset = litePreset();

  return cssnano
    .process(
      `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`,
      { from: undefined },
      { preset }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example{display:grid;transition:all .5s;user-select:none;background:linear-gradient(to bottom,white,black)}`
      );
    });
});

test('should run the plugin passed through the cssnano config.plugins', () => {
  const preset = litePreset({ discardComments: false });

  return cssnano
    .process(
      `.example {
    display: grid;
    transition: all .5s;
    user-select: none;
    background: linear-gradient(to bottom, white, black);
}
`,
      { from: undefined },
      { preset, plugins: [autoprefixer] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example{display:grid;transition:all .5s;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;background:linear-gradient(to bottom,white,black)}`
      );
    });
});

test('should run the plugin when plugin module is being used with no array inside plugins', () => {
  const preset = litePreset();
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset, plugins: [require('autoprefixer')] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}`
      );
    });
});

test('should run the plugin when no preset is mentioned', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { plugins: [require('autoprefixer')] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when no preset is mentioned with string plugin name', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { plugins: ['autoprefixer'] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when no preset is mentioned with string plugin name as in array', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { plugins: [['autoprefixer']] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin with string plugin name as in array', () => {
  const preset = litePreset();
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset, plugins: [['autoprefixer']] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}`
      );
    });
});

test('should run the plugin when no preset is mentioned with string plugin name as in array and options', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { plugins: [['autoprefixer', { remove: false }]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin with string plugin name as in array and options', () => {
  const preset = litePreset();
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset, plugins: [['autoprefixer', { remove: false }]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}`
      );
    });
});

test('should run the plugin when preset is empty array and plugin module as in array in plugins array', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [[require('autoprefixer')]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin plugin module as in array in plugins array', () => {
  const preset = litePreset();
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset, plugins: [[require('autoprefixer')]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}`
      );
    });
});

test('should run the plugin plugin module as in array in plugins array with empty plugin option', () => {
  const preset = litePreset();
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset, plugins: [[require('autoprefixer'), {}]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}`
      );
    });
});

test('should run the plugin when preset is empty array and plugin module as in non array in plugins array', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [require('autoprefixer')] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array and plugin as string as in non array in plugins array', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: ['autoprefixer'] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [[autoprefixer, { grid: 'autoplace' }]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with string as a plugin', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [['autoprefixer', { grid: 'autoplace' }]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with options', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [[autoprefixer, { add: false }]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with options and string as plugin', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [['autoprefixer', { add: false }]] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { user-select: none; }
`
      );
    });
});

test('should run the plugin when preset is empty array with options and string as plugin and no options for the plugin', () => {
  return cssnano
    .process(
      `.example { user-select: none; }
`,
      { from: undefined },
      { preset: [], plugins: [['autoprefixer']] }
    )
    .then((result) => {
      expect(result.css).toBe(
        `.example { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
`
      );
    });
});
