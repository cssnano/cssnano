import postcss, { plugin, decl } from 'postcss';
import stylehacks from '..';

const insertZoom = plugin('insertZoom', () => {
  return (css) => css.first.append(decl({ prop: '*zoom', value: '1' }));
});

test('should remove star hack from plugins like lost', () => {
  return postcss([insertZoom(), stylehacks()])
    .process('h1{}', { env: 'ie8', from: undefined })
    .then((result) => expect(result.css).toBe('h1{}'));
});
