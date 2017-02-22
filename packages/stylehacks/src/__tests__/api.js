import postcss from 'postcss';
import ava from 'ava';
import stylehacks from '../';
import {name} from '../../package.json';

function processCss (t, fixture, expected, options) {
    return postcss(stylehacks(options)).process(fixture).then(({css}) => {
        t.deepEqual(css, expected);
    });
}

function passthroughCss (t, fixture, options) {
    return processCss(t, fixture, fixture, options);
}

ava('can be used as a postcss plugin', t => {
    let css = 'h1 { _color: #ffffff }';

    return postcss().use(stylehacks()).process(css).then(result => {
        t.deepEqual(result.css, 'h1 { }', 'should be consumed');
    });
});

ava('can be used as a postcss plugin (2)', t => {
    let css = 'h1 { _color: #ffffff }';

    return postcss([ stylehacks() ]).process(css).then(result => {
        t.deepEqual(result.css, 'h1 { }', 'should be consumed');
    });
});

ava('can be used as a postcss plugin (3)', t => {
    let css = 'h1 { _color: #ffffff }';

    return postcss([ stylehacks ]).process(css).then(result => {
        t.deepEqual(result.css, 'h1 { }', 'should be consumed');
    });
});

ava('should use the postcss plugin api', t => {
    t.truthy(stylehacks().postcssVersion, 'should be able to access version');
    t.deepEqual(stylehacks().postcssPlugin, name, 'should be able to access name');
});

ava('should have a separate detect method', t => {
    let counter = 0;

    let plugin = postcss.plugin('test', () => {
        return css => {
            css.walkDecls(decl => {
                if (stylehacks.detect(decl)) {
                    counter++;
                }
            });
        };
    });

    return postcss(plugin).process('h1 { _color: red; =color: black }').then(() => {
        t.deepEqual(counter, 2);
    });
});

ava('should have a separate detect method (2)', t => {
    let counter = 0;

    let plugin = postcss.plugin('test', () => {
        return css => {
            css.walkRules(rule => {
                if (stylehacks.detect(rule)) {
                    counter++;
                }
            });
        };
    });

    return postcss(plugin).process('h1 { _color: red; =color: black }').then(() => {
        t.deepEqual(counter, 0);
    });
});

ava(
    'should use browserslist to parse browsers when it is a string',
    passthroughCss,
    'h1 { _color: red }',
    {browsers: 'ie 6-8'}
);

ava(
    'should not use browserslist to parse browsers when it is an array',
    passthroughCss,
    'h1 { _color: red }',
    {browsers: ['ie 6', 'ie 7', 'ie 8']}
);

ava(
    'should handle rules with empty selectors',
    passthroughCss,
    '{ _color: red }',
    {browsers: ['ie 5.5', 'ie 6', 'ie 7', 'ie 8']}
);

ava(
    'should handle rules with empty selectors (2)',
    processCss,
    '{ _color: red }',
    '{ }'
);

ava(
    'should pass through other comments in selectors',
    passthroughCss,
    'h1 /* => */ h2 {}'
);

ava(
    'should pass through css mixins',
    passthroughCss,
    `paper-card {
        --paper-card-content: {
            padding-top: 0;
        };
        margin: 0 auto 16px;
        width: 768px;
        max-width: calc(100% - 32px);
    }`
);

ava(
    'should pass through css mixins (2)',
    passthroughCss,
    `paper-card {
        --paper-card-header: {
            height: 128px;
            padding: 0 48px;
            background: var(--primary-color);

            @apply(--layout-vertical);
            @apply(--layout-end-justified);
        };
        --paper-card-header-color: #FFF;
        --paper-card-content: {
            padding: 64px;
        };
        --paper-card-actions: {
            @apply(--layout-horizontal);
            @apply(--layout-end-justified);
        };
        width: 384px;
    }`
);
