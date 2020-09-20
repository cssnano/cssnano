import {
  usePostCSSPlugin,
  processCSSFactory,
  processCSSWithPresetFactory,
} from '../../../../util/testHelpers';
import plugin from '..';

const { passthroughCSS, processor } = processCSSFactory(plugin);
const { processCSS: withDefaultPreset } = processCSSWithPresetFactory(
  'default'
);

function testRemovals(fixture, expected, removedSelectors) {
  return () =>
    processor(fixture).then((result) => {
      removedSelectors.forEach((removedSelector) => {
        const message = result.messages.some((m) => {
          return (
            m.postcssPlugin === 'postcss-discard-empty' &&
            m.type === 'removal' &&
            m.node.selector === removedSelector
          );
        });

        if (!message) {
          throw new Error(
            'expected selector `' + removedSelector + '` was not removed'
          );
        }
      });

      result.messages.forEach((m) => {
        if (
          m.postcssPlugin !== 'postcss-discard-empty' ||
          m.type !== 'removal' ||
          m.selector !== undefined ||
          ~removedSelectors.indexOf(m.selector)
        ) {
          throw new Error(
            'unexpected selector `' + m.selector + '` was removed'
          );
        }
      });

      expect(result.css).toBe(expected);
    });
}

test('should remove empty @ rules', withDefaultPreset('@font-face;', ''));

test('should remove empty @ rules (2)', withDefaultPreset('@font-face {}', ''));

test(
  'should not mangle @ rules with decls',
  passthroughCSS('@font-face {font-family: Helvetica}')
);

test(
  'should not mangle @ rules with parameters',
  passthroughCSS('@charset "utf-8";')
);

test('should remove empty rules', withDefaultPreset('h1{}h2{}h4{}h5,h6{}', ''));

test('should remove empty declarations', withDefaultPreset('h1{color:}', ''));

test('should remove null selectors', withDefaultPreset('{color:blue}', ''));

test(
  'should remove null selectors in media queries',
  withDefaultPreset('@media screen, print {{}}', '')
);

test(
  'should remove empty media queries',
  withDefaultPreset('@media screen, print {h1,h2{}}', '')
);

test(
  'should not be responsible for removing comments',
  passthroughCSS('h1{/*comment*/}')
);

test(
  'should report removed selectors',
  testRemovals('h1{}.hot{}.a.b{}{}@media screen, print{h1,h2{}}', '', [
    'h1',
    '.hot',
    '.a.b',
    '',
    'h1,h2',
  ])
);

test(
  'should report removed selectors 2',
  withDefaultPreset('h1{}.hot{}.a.b{}{}@media screen, print{h1,h2{}}', '')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
