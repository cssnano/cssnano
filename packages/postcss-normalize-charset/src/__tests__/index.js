import plugin from '../';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../../util/testHelpers';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

function sourceTest(origin) {
  return {
    postcssPlugin: 'source-test',
    OnceExit(css) {
      let node = css.first;
      let source;

      if (node.name === 'charset') {
        source = node.source;
        source = source.input.css.slice(
          source.start.column - 1,
          source.end.column
        );
      }

      return expect(source).toBe(origin);
    },
  };
}

function processCssWithSource(fixture, expected, source) {
  const { processCSS: withSource } = processCSSFactory([
    plugin(),
    sourceTest(source),
  ]);

  return withSource(fixture, expected);
}

let copyright = 'a{content:"©"}';

test(
  'should add a charset if a file contains non-ascii',
  processCssWithSource(copyright, '@charset "utf-8";\n' + copyright, copyright)
);

test(
  'should move up first existing charset',
  processCssWithSource(
    'b{жизнь:калька}@charset "windows-1251";' + copyright,
    '@charset "windows-1251";b{жизнь:калька}' + copyright,
    'b{жизнь:калька}'
  )
);

test(
  'should remove extra charset rules',
  processCssWithSource(
    copyright + '@charset "utf-8";@charset "windows-1251";',
    '@charset "utf-8";\n' + copyright,
    copyright
  )
);

test(
  "should remove all charset rules if a file doesn't contain non-ascii",
  processCSS(
    'a{content:"c"}@charset "utf-8";@charset "windows-1251";',
    'a{content:"c"}'
  )
);

test(
  'should not add a charset with add set to false',
  passthroughCSS(copyright, { add: false })
);

test('add on', processCSS(copyright, '@charset "utf-8";\n' + copyright));

test(
  'add off',
  processCSS(copyright, copyright, {
    add: false,
  })
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
