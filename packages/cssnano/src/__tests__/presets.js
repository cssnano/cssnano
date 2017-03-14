import test from 'ava';
import defaultPreset from 'cssnano-preset-default';
import cssnano from '..';

test('should accept an invoked preset', t => {
    const preset = defaultPreset({normalizeCharset: {add: true}});

    cssnano.process(`h1{content:"©"}`, {preset}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a non-invoked preset', t => {
    const preset = defaultPreset;
    const presetOptions = {normalizeCharset: {add: true}};

    cssnano.process(`h1{content:"©"}`, {preset, presetOptions}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a preset string', t => {
    const preset = 'default';
    const presetOptions = {normalizeCharset: {add: true}};

    cssnano.process(`h1{content:"©"}`, {preset, presetOptions}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});
