import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { name } from '../../package.json';
import plugin from '..';

test('should use the postcss plugin api', () => {
  assert.is(plugin().postcssPlugin, name);
});
test.run();
