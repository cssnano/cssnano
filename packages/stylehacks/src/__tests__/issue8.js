import ava from 'ava';
import postcss, { plugin, decl } from 'postcss';
import stylehacks from '..';

const insertZoom = plugin('insertZoom', () => {
  return (css) => css.first.append(decl({ prop: '*zoom', value: '1' }));
});

ava('should remove star hack from plugins like lost', (t) => {
  return postcss([insertZoom(), stylehacks()])
    .process('h1{}', { env: 'ie8' })
    .then((result) => {
      t.deepEqual(result.css, 'h1{}');
    });
});
