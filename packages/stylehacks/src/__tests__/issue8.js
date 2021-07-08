import postcss, { decl } from 'postcss';
import stylehacks from '..';

const insertZoom = () => {
  return {
    postcssPlugin: 'insertZoom',
    Once(root) {
      root.first.append(decl({ prop: '*zoom', value: '1' }));
    },
  };
};
insertZoom.postcss = true;

test('should remove star hack from plugins like lost', () => {
  return postcss([insertZoom(), stylehacks()])
    .process('h1{}', { env: 'ie8', from: undefined })
    .then((result) => expect(result.css).toBe('h1{}'));
});
