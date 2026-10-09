import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

const modern = { overrideBrowserslist: ['defaults', 'not ie <=11'] };

function fixture(range) {
  return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

describe('Merge', () => {
  test(
    'should merge adjacent code points into ranges',
    processCSS(
      fixture('U+20,U+31,U+32,U+33,U+34,U+35,U+41,U+42,U+43,U+44'),
      fixture('u+20,u+31-35,u+41-44'),
      modern
    )
  );

  test(
    'should merge single code points covering a block into a wildcard range',
    processCSS(
      fixture(
        'U+40,U+41,U+42,U+43,U+44,U+45,U+46,U+47,U+48,U+49,U+4A,U+4B,U+4C,U+4D,U+4E,U+4F'
      ),
      fixture('u+4?'),
      modern
    )
  );

  test(
    'should merge adjacent ranges covering a block into a wildcard range',
    processCSS(fixture('u+40-47,u+48-4f'), fixture('u+4?'), modern)
  );

  test(
    'should merge wildcard ranges with adjacent ranges',
    processCSS(fixture('u+4?,u+50-5f'), fixture('u+40-5f'), modern)
  );

  test(
    'should merge overlapping ranges',
    processCSS(
      fixture('u+2b00-2bff,u+2b80-2c00'),
      fixture('u+2b00-2c00'),
      modern
    )
  );

  test(
    'should sort ranges before merging them',
    processCSS(fixture('u+42,u+41'), fixture('u+41-42'), modern)
  );

  test(
    'should upcase merged ranges in legacy descriptor lists',
    processCSS(fixture('u+41,u+42'), fixture('U+41-42'), {
      overrideBrowserslist: 'IE 9',
    })
  );

  test(
    'should keep non-adjacent ranges separate',
    passthroughCSS(fixture('u+41,u+43'), modern)
  );

  test(
    'should sort non-adjacent ranges by start',
    processCSS(fixture('u+43,u+41'), fixture('u+41,u+43'), modern)
  );

  test(
    'should strip leading zeros from non-adjacent ranges',
    processCSS(fixture('u+0041,u+0043'), fixture('u+41,u+43'), modern)
  );

  test(
    'should collapse a one-point range in a list that does not shrink',
    processCSS(fixture('u+41-41,u+43'), fixture('u+41,u+43'), modern)
  );

  test(
    'should collapse a one-point range in a single-entry list',
    processCSS(fixture('u+0041-0041'), fixture('u+41'), modern)
  );

  test(
    'should not merge when a wildcard exceeds the U+10FFFF maximum',
    passthroughCSS(fixture('u+??????,u+1'), modern)
  );

  test(
    'should not merge when a wildcard starts above the U+10FFFF maximum',
    passthroughCSS(fixture('u+1?????,u+1'), modern)
  );

  test(
    'should not merge ranges separated by comments',
    passthroughCSS(fixture('u+41/**/,u+42'), modern)
  );

  test(
    'should shorten each range of a list with comments without merging them',
    processCSS(
      fixture('u+0041-0041/**/,u+0042-0043'),
      fixture('u+41/**/,u+42-43'),
      modern
    )
  );

  test(
    'should shorten the valid ranges of a list with an invalid range without merging them',
    processCSS(fixture('u+0041-0041,u+42-41'), fixture('u+41,u+42-41'), modern)
  );

  test(
    'should not merge when a range has its start after its end',
    passthroughCSS(fixture('u+43,u+42-41'), modern)
  );

  test(
    'should not merge ranges that exceed the U+10FFFF maximum',
    passthroughCSS(fixture('u+10fffe,u+110000'), modern)
  );

  test(
    'should keep a list byte-identical when an entry has more than six hex digits and wildcards, because it is not a valid unicode-range',
    passthroughCSS(fixture('u+0041,u+1234567?'), modern)
  );

  test(
    'should keep a list byte-identical when an entry combines wildcards with a range end, because it is not a valid unicode-range',
    passthroughCSS(fixture('u+0041,u+12?-34'), modern)
  );
});
