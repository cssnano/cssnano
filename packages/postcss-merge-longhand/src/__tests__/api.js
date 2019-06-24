import plugin from '..';
import { name } from '../../package.json';

test('should use the postcss plugin api', () => {
  expect(plugin().postcssVersion).toBeDefined();
  expect(plugin().postcssPlugin).toBe(name);
});
