import test from 'ava';
import advancedPreset from 'cssnano-preset-advanced';
import defaultPreset from 'cssnano-preset-default';
import cssnano from '..';

test('should accept an invoked preset', t => {
    const preset = defaultPreset({normalizeCharset: {add: true}});

    return cssnano.process(`h1{content:"©"}`, {preset}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a non-invoked preset', t => {
    const preset = defaultPreset;
    const presetOptions = {normalizeCharset: {add: true}};

    return cssnano.process(`h1{content:"©"}`, {preset, presetOptions}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a default preset string', t => {
    const preset = 'default';
    const presetOptions = {normalizeCharset: {add: true}};

    return cssnano.process(`h1{content:"©"}`, {preset, presetOptions}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept an invoked preset other than default', t => {
    const preset = advancedPreset({zindex: {startIndex: 15}});

    return cssnano.process(`h1{z-index:10}`, {preset}).then(result => {
        t.is(result.css, `h1{z-index:15}`);
    });
});

test('should accept a preset string other than default', t => {
    const preset = 'cssnano-preset-advanced';
    const presetOptions = {zindex: {startIndex: 15}};

    return cssnano.process(`h1{z-index:10}`, {preset, presetOptions}).then(result => {
        t.is(result.css, `h1{z-index:15}`);
    });
});

test('should accept a preset string other than default (sugar syntax)', t => {
    const preset = 'advanced';
    const presetOptions = {zindex: {startIndex: 15}};

    return cssnano.process(`h1{z-index:10}`, {preset, presetOptions}).then(result => {
        t.is(result.css, `h1{z-index:15}`);
    });
});
