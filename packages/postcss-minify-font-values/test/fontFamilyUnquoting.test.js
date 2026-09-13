import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Font family unquoting rules', () => {
  test(
    'should not unquote font names with a leading number',
    passthroughCSS('h1{font-family:"11880-icons"!important;}')
  );

  test(
    'should unquote font names',
    processCSS(
      'h1{font-family:"Helvetica Neue"}',
      'h1{font-family:Helvetica Neue}'
    )
  );

  test(
    'css variable should unquote font names',
    processCSS(
      'h1{--font-family:"Helvetica Neue"}',
      'h1{--font-family:Helvetica Neue}',
      {
        removeQuotes: (prop) => (prop === '--font-family' ? 'font-family' : ''),
      }
    )
  );

  test(
    'should unquote font names with one character name',
    processCSS('h1{font-family:"A"}', 'h1{font-family:A}')
  );

  test(
    'should unquote font names with one character name #1',
    processCSS(
      'h1{font-family:"A";font-family:"A"}',
      'h1{font-family:A;font-family:A}'
    )
  );

  test(
    'css variable should unquote font names with one character name #1',
    processCSS(
      'h1{--font-family:"A";--font-family:"A"}',
      'h1{--font-family:A;--font-family:A}',
      {
        removeQuotes: (prop) => (prop === '--font-family' ? 'font-family' : ''),
      }
    )
  );

  test(
    'should unquote font names with space at the start',
    processCSS(
      'h1{font-family:" Helvetica Neue"}',
      'h1{font-family:\\ Helvetica Neue}'
    )
  );

  test(
    'css variable should unquote font names with space at the start',
    processCSS(
      'h1{--font-family:" Helvetica Neue"}',
      'h1{--font-family:\\ Helvetica Neue}',
      {
        removeQuotes: (prop) => (prop === '--font-family' ? 'font-family' : ''),
      }
    )
  );

  test(
    'should unquote font names with space at the end',
    processCSS(
      'h1{font-family:"Helvetica Neue "}',
      'h1{font-family:Helvetica Neue\\ }'
    )
  );

  test(
    'css variable should unquote font names with space at the end',
    processCSS(
      'h1{--font-family:"Helvetica Neue "}',
      'h1{--font-family:Helvetica Neue\\ }',
      {
        removeQuotes: (prop) => (prop === '--font-family' ? 'font-family' : ''),
      }
    )
  );

  test(
    'should unquote and join identifiers with a slash, if numeric',
    processCSS('h1{font-family:"Bond 007"}', 'h1{font-family:Bond\\ 007}')
  );

  test(
    'css variable should unquote and join identifiers with a slash, if numeric',
    processCSS('h1{--font-family:"Bond 007"}', 'h1{--font-family:Bond\\ 007}', {
      removeQuotes: (prop) => (prop === '--font-family' ? 'font-family' : ''),
    })
  );

  test(
    'should unquote and join identifiers with a slash',
    passthroughCSS('h1{font-family:Ahem\\!}')
  );

  test(
    'should unquote with escaped `/` character',
    passthroughCSS('h1{font-family:Red\\/Black}')
  );

  test(
    'should unquote with multiple escaped ` ` character',
    passthroughCSS('h1{font-family:Hawaii \\  \\  \\  \\  \\ \\\\35}')
  );

  test(
    'should not unquote if it would produce a bigger identifier',
    passthroughCSS('h1{font-family:"Call 0118 999 881 999 119 725 3"}')
  );

  test(
    'should not unquote font names with multiple \\',
    passthroughCSS('h1{font-family:"\\5FAE\\8F6F\\96C5\\9ED1"}')
  );

  test(
    'should not unquote font names with multiple \\ #1',
    passthroughCSS('h1{font-family:"\\5B8B\\4F53"}')
  );

  test(
    'should minimise space inside a legal font name',
    processCSS(
      'h1{font-family:Lucida     Grande}',
      'h1{font-family:Lucida Grande}'
    )
  );

  test(
    'should minimise space around a list of font names',
    processCSS(
      'h1{font-family:Arial, Helvetica, sans-serif}',
      'h1{font-family:Arial,Helvetica,sans-serif}'
    )
  );
});

describe('Font family escaping and special characters', () => {
  test(
    'should correctly escape special characters at the start',
    processCSS('h1{font-family:"$42"}', 'h1{font-family:\\$42}')
  );

  test(
    'should correctly escape special characters at the end',
    passthroughCSS('h1{font-family:Helvetica Neue\\ }')
  );

  test(
    'should correctly escape multiple special with numbers font name',
    passthroughCSS('h1{font-family:\\31 \\ 2\\ 3\\ 4\\ 5}')
  );

  test(
    'should correctly escape multiple ` `',
    passthroughCSS('h1{font-family:f \\  \\  \\ \\ o \\  \\  \\ \\ o}')
  );

  test(
    'should correctly escape only spaces font name',
    passthroughCSS('h1{font-family:\\ \\ \\ }')
  );

  test(
    'should correctly escape only two spaces font name',
    passthroughCSS('h1{font-family:"  "}')
  );

  test(
    'should correctly escape only spaces font name with quotes',
    passthroughCSS('h1{font-family:"     "}')
  );

  test(
    'should unquote multiple escape `[` characters',
    passthroughCSS('h1{font-family:"STHeiti Light [STXihei]"}')
  );

  test(
    'should not mangle font names (2)',
    passthroughCSS('h1{font-family:FF Din Pro,FF Din Pro Medium}')
  );

  test(
    'should handle font-family names with internal spaces',
    processCSS(
      'h1{font-family:"HW Impey  Bold"}',
      'h1{font-family:HW Impey \\ Bold}'
    )
  );
});
