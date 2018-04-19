import test from 'ava';
import mappings from '../lib/map';
import plugin from '..';
import getData from '../../../../util/getData';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);
const data = getData(mappings);

test(
    'should pass through two value syntax',
    passthroughCSS,
    'background:space round'
);

function suite (t, fixture, expected) {
    return Promise.all([
        processCSS(
            t,
            `background:#000 url(cat.jpg) ${fixture} 50%`,
            `background:#000 url(cat.jpg) ${expected} 50%`
        ),
        processCSS(
            t,
            `BACKGROUND:#000 url(cat.jpg) ${fixture} 50%`,
            `background:#000 url(cat.jpg) ${expected} 50%`
        ),
        processCSS(
            t,
            `background-repeat:${fixture}`,
            `background-repeat:${expected}`
        ),
        processCSS(
            t,
            `background-repeat:#000 url(cat.jpg) ${fixture} 50%,#000 url(cat.jpg) ${fixture} 50%`,
            `background-repeat:#000 url(cat.jpg) ${expected} 50%,#000 url(cat.jpg) ${expected} 50%`
        ),
        processCSS(
            t,
            `background-repeat:${fixture},${fixture}`,
            `background-repeat:${expected},${expected}`
        ),
    ]);
}

Object.keys(data).forEach(conversion => {
    const fixture = data[conversion];
    test(
        suite,
        fixture,
        conversion
    );
});

test(
    'should pass through when there are no repeat values',
    passthroughCSS,
    'background:url(cat.jpg)'
);

test(
    'should pass through when there are no repeat values (2)',
    passthroughCSS,
    'background:#000 url(cat.jpg)'
);

test(
    'should pass through the single value syntax',
    passthroughCSS,
    'background:#000 url(cat.jpg) repeat'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
