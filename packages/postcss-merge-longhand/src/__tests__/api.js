import test from 'ava';
import plugin from '..';
import {name} from '../../package.json';

test('should use the postcss plugin api', t => {
    t.truthy(plugin().postcssVersion, 'should be able to access version');
    t.deepEqual(plugin().postcssPlugin, name, 'should be able to access name');
});
