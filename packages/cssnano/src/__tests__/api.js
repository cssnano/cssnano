import postcss from 'postcss';
import nano from '..';
import { usePostCSSPlugin } from '../../../../util/testHelpers';

function pluginMacro(instance) {
  const css = 'h1 { color: #ffffff }';
  const min = 'h1{color:#fff}';

  return () =>
    instance.process(css).then((result) => {
      expect(result.css).toBe(min);
    });
}

test('can be used as a postcss plugin', pluginMacro(postcss().use(nano())));

test('can be used as a postcss plugin (2)', pluginMacro(postcss([nano()])));

test('can be used as a postcss plugin (3)', pluginMacro(postcss(nano)));

test('should use the postcss plugin api', usePostCSSPlugin(nano()));

test('should work with sourcemaps', () => {
  return nano
    .process('h1{z-index:1}', { from: undefined, map: { inline: true } })
    .then(({ css }) => {
      expect(/sourceMappingURL=data:application\/json;base64/.test(css)).toBe(
        true
      );
    });
});
