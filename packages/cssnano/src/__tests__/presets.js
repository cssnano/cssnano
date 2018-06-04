import test from 'ava';
import advancedPreset from 'cssnano-preset-advanced';
import defaultPreset from 'cssnano-preset-default';
import cssnano from '..';

test('should accept an invoked preset', t => {
    const preset = defaultPreset({normalizeCharset: {add: true}});

    return cssnano.process(`h1{content:"©"}`, {}, {preset}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a non-invoked preset', t => {
    const preset = [
        defaultPreset,
        {normalizeCharset: {add: true}},
    ];

    return cssnano.process(`h1{content:"©"}`, {}, {preset}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept a default preset string', t => {
    const preset = [
        'default',
        {normalizeCharset: {add: true}},
    ];

    return cssnano.process(`h1{content:"©"}`, {}, {preset}).then(result => {
        t.is(result.css, `@charset "utf-8";h1{content:"©"}`);
    });
});

test('should accept an invoked preset other than default', t => {
    const preset = advancedPreset({zindex: {startIndex: 15}});

    return cssnano.process(`h1{z-index:10}`, {}, {preset}).then(result => {
        t.is(result.css, `h1{z-index:15}`);
    });
});

test('should accept a preset string other than default', t => {
    const preset = 'cssnano-preset-advanced';

    return cssnano.process(`h1{z-index:10}`, {}, {preset}).then(result => {
        t.is(result.css, `h1{z-index:1}`);
    });
});

test('should accept a preset string other than default, with options', t => {
    const preset = [
        'cssnano-preset-advanced',
        {zindex: {startIndex: 15}},
    ];

    return cssnano.process(`h1{z-index:10}`, {}, {preset}).then(result => {
        t.is(result.css, `h1{z-index:15}`);
    });
});

test('should accept a preset string other than default (sugar syntax)', t => {
    const preset = [
        'advanced',
        {zindex: {startIndex: 15}},
    ];

    return cssnano.process(`h1{z-index:10}`, {}, {preset}).then(result => {
        t.is(result.css, `h1{z-index:15}`);
    });
});

test('should be able to exclude plugins', t => {
    const preset = [
        'advanced',
        {zindex: false},
    ];

    return cssnano.process(`h1{z-index:10}`, {}, {preset}).then(result => {
        t.is(result.css, `h1{z-index:10}`);
    });
});

test('should be able to exclude plugins (exclude syntax)', t => {
    const preset = [
        'advanced',
        {zindex: {startIndex: 15, exclude: true}},
    ];

    return cssnano.process(`h1{z-index:10}`, {}, {preset}).then(result => {
        t.is(result.css, `h1{z-index:10}`);
    });
});

test('should error on a bad preset', t => {
    return t.throws(cssnano.process('h1{}', {}, {preset: 'avanced'}).then(() => {}), Error);
});
