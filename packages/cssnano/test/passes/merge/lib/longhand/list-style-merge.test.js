import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeLonghand');

const { passthroughCSS, processCSS } = processCSSFactory([
  plugin(withTargets('chrome 120, firefox 120, safari 17')),
]);

describe('list-style longhand merging', () => {
  test(
    'merges type, position and image into one value, with the position first',
    processCSS(
      'a{list-style-type:square;list-style-position:inside;list-style-image:url(a.png)}',
      'a{list-style:inside url(a.png) square}'
    )
  );

  test(
    'omits the initial outside position, the none image and the disc type',
    processCSS(
      'a{list-style-type:disc;list-style-position:outside;list-style-image:none}',
      'a{list-style:disc}'
    )
  );

  test(
    'keeps only the position when the type and image are initial',
    processCSS(
      'a{list-style-type:disc;list-style-position:inside;list-style-image:none}',
      'a{list-style:inside}'
    )
  );

  test(
    'merges none for all three longhands, because list-style none sets the type and image to none',
    processCSS(
      'a{list-style-type:none;list-style-position:outside;list-style-image:none}',
      'a{list-style:none}'
    )
  );

  test(
    'keeps a none type with an inside position as written, because a lone none would set the image too',
    passthroughCSS(
      'a{list-style-type:none;list-style-position:inside;list-style-image:none}'
    )
  );

  test(
    'keeps a none type with an image as written, placing none after the url so the browser reads it as the type',
    processCSS(
      'a{list-style-type:none;list-style-position:outside;list-style-image:url(a.png)}',
      'a{list-style:url(a.png) none}'
    )
  );

  test(
    'merges a counter-style name as the type',
    processCSS(
      'a{list-style-type:lower-roman;list-style-position:outside;list-style-image:none}',
      'a{list-style:lower-roman}'
    )
  );

  test(
    'merges a string type as the type',
    processCSS(
      'a{list-style-type:"-";list-style-position:outside;list-style-image:none}',
      'a{list-style:"-"}'
    )
  );

  test(
    'keeps a type named inside as written, because the shorthand would read it as a position',
    passthroughCSS(
      'a{list-style-type:inside;list-style-position:outside;list-style-image:none}'
    )
  );

  test(
    'keeps an auto type as written because it is not a counter-style name the merge knows',
    passthroughCSS(
      'a{list-style-type:auto;list-style-position:outside;list-style-image:none}'
    )
  );

  test(
    'keeps an image function other than url as written',
    passthroughCSS(
      'a{list-style-type:disc;list-style-position:outside;list-style-image:linear-gradient(red,blue)}'
    )
  );

  test(
    'keeps an identifier image as written, because an image is none or a url',
    passthroughCSS(
      'a{list-style-type:disc;list-style-position:outside;list-style-image:foo}'
    )
  );

  test(
    'merges equal CSS-wide keywords',
    processCSS(
      'a{list-style-type:inherit;list-style-position:inherit;list-style-image:inherit}',
      'a{list-style:inherit}'
    )
  );

  test(
    'keeps mixed CSS-wide keywords because a shorthand takes one for all',
    passthroughCSS(
      'a{list-style-type:inherit;list-style-position:inside;list-style-image:none}'
    )
  );

  test(
    'keeps two of the three longhands because the shorthand would reset the third',
    passthroughCSS('a{list-style-type:square;list-style-position:inside}')
  );

  test(
    'keeps a var() type because its type is unknown',
    passthroughCSS(
      'a{list-style-type:var(--t);list-style-position:outside;list-style-image:none}'
    )
  );

  test(
    'keeps the longhands around a list-style shorthand that resets them',
    passthroughCSS(
      'a{list-style-type:square;list-style:inside;list-style-position:outside;list-style-image:none}'
    )
  );

  test(
    'merges the normal and the important longhands separately',
    processCSS(
      'a{list-style-type:square!important;list-style-position:inside!important;list-style-image:none!important;list-style-type:circle;list-style-position:outside;list-style-image:none}',
      'a{list-style:inside square!important;list-style:circle}'
    )
  );
});
