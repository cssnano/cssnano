import { name } from '../../package.json';
import plugin from '..';

test('should use the postcss plugin api', () => {
  expect(plugin().postcssVersion).toBeDefined();
  expect(plugin().postcssPlugin).toBe(name);
});
