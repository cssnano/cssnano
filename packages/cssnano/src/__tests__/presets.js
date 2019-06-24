import advancedPreset from 'cssnano-preset-advanced';
import defaultPreset from 'cssnano-preset-default';
import cssnano from '..';

test('should accept an invoked preset', () => {
  const preset = defaultPreset({ normalizeCharset: { add: true } });

  return cssnano
    .process(`h1{content:"©"}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a non-invoked preset', () => {
  const preset = [defaultPreset, { normalizeCharset: { add: true } }];

  return cssnano
    .process(`h1{content:"©"}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a default preset string', () => {
  const preset = ['default', { normalizeCharset: { add: true } }];

  return cssnano
    .process(`h1{content:"©"}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept an invoked preset other than default', () => {
  const preset = advancedPreset({ zindex: { startIndex: 15 } });

  return cssnano
    .process(`h1{z-index:10}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`h1{z-index:15}`);
    });
});

test('should accept a preset string other than default', () => {
  const preset = 'cssnano-preset-advanced';

  return cssnano
    .process(`h1{z-index:10}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`h1{z-index:1}`);
    });
});

test('should accept a preset string other than default, with options', () => {
  const preset = ['cssnano-preset-advanced', { zindex: { startIndex: 15 } }];

  return cssnano
    .process(`h1{z-index:10}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`h1{z-index:15}`);
    });
});

test('should accept a preset string other than default (sugar syntax)', () => {
  const preset = ['advanced', { zindex: { startIndex: 15 } }];

  return cssnano
    .process(`h1{z-index:10}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`h1{z-index:15}`);
    });
});

test('should be able to exclude plugins', () => {
  const preset = ['advanced', { zindex: false }];

  return cssnano
    .process(`h1{z-index:10}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`h1{z-index:10}`);
    });
});

test('should be able to include plugins', () => {
  const preset = ['advanced', { zindex: true }];

  return cssnano
    .process(`h1{z-index:10}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`h1{z-index:1}`);
    });
});

test('should be able to exclude plugins (exclude syntax)', () => {
  const preset = ['advanced', { zindex: { startIndex: 15, exclude: true } }];

  return cssnano
    .process(`h1{z-index:10}`, { from: undefined }, { preset })
    .then((result) => {
      expect(result.css).toBe(`h1{z-index:10}`);
    });
});

test('should error on a bad preset', async () => {
  expect.assertions(1);

  try {
    await cssnano
      .process('h1{}', { from: undefined }, { preset: 'avanced' })
      .then(() => {});
  } catch (error) {
    expect(error).toBeDefined();
  }
});
