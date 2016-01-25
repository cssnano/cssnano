import ava from 'ava';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';

const tests = [{
    message: 'should deduplicate selectors',
    fixture: 'h1,h1,h1,h1{color:red}',
    expected: 'h1{color:red}'
}, {
    message: 'should natural sort selectors',
    fixture: 'h1,h10,H2,h7{color:red}',
    expected: 'h1,H2,h7,h10{color:red}'
}];

tests.forEach(test => {
    ava(test.message, t => {
        let options = test.options || {};
        return postcss([ plugin(options) ]).process(test.fixture).then(result => {
            t.same(result.css, test.expected);
        });
    });
});

ava('should use the postcss plugin api', t => {
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.same(plugin().postcssPlugin, name, 'should be able to access name');
});
