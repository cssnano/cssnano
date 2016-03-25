import ava from 'ava';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';

const tests = [{
    message: 'should remove empty @ rules',
    fixture: '@font-face;',
    expected: ''
}, {
    message: 'should remove empty @ rules (2)',
    fixture: '@font-face {}',
    expected: ''
}, {
    message: 'should not mangle @ rules with decls',
    fixture: '@font-face {font-family: Helvetica}',
    expected: '@font-face {font-family: Helvetica}'
}, {
    message: 'should not mangle @ rules with parameters',
    fixture: '@charset "utf-8";',
    expected: '@charset "utf-8";'
}, {
    message: 'should remove empty rules',
    fixture: 'h1{}h2{}h4{}h5,h6{}',
    expected: ''
}, {
    message: 'should remove empty declarations',
    fixture: 'h1{color:}',
    expected: ''
}, {
    message: 'should remove null selectors',
    fixture: '{color:blue}',
    expected: ''
}, {
    message: 'should remove null selectors in media queries',
    fixture: '@media screen, print {{}}',
    expected: ''
}, {
    message: 'should remove empty media queries',
    fixture: '@media screen, print {h1,h2{}}',
    expected: ''
}, {
    message: 'should not be responsible for removing comments',
    fixture: 'h1{/*comment*/}',
    expected: 'h1{/*comment*/}'
}, {
    message: 'should report removed selectors',
    fixture: 'h1{}.hot{}.a.b{}{}@media secreen, print{h1,h2{}}',
    expected: '',
    removedSelectors: ['h1', '.hot', '.a.b', '', 'h1,h2']
}];

function testRemovals (t, test, out, removedSelectors) {
    removedSelectors.forEach((removedSelector) => {
        const message = out.messages.some((m) => {
            return m.plugin === 'postcss-discard-empty' &&
                m.type === 'removal' &&
                m.node.selector === removedSelector;
        });

        if (!message) {
            t.fail('expected selector `' + removedSelector + '` was not removed');
        }
    });

    out.messages.forEach((m) => {
        if (m.plugin === 'postcss-discard-empty' && m.type === 'removal') {
            if (m.selector !== undefined && !~removedSelectors.indexOf(m.selector)) {
                t.fail('unexpected selector `' + m.selector + '` was removed');
            }
        }
    });
}

tests.forEach(test => {
    ava(test.message, t => {
        const out = postcss(plugin(test.options || {})).process(test.fixture);
        t.deepEqual(out.css, test.expected);

        if (test.removedSelectors) {
            testRemovals(t, test, out, test.removedSelectors);
        }
    });
});

ava('should use the postcss plugin api', t => {
    t.truthy(plugin().postcssVersion, 'should be able to access version');
    t.deepEqual(plugin().postcssPlugin, name, 'should be able to access name');
});
