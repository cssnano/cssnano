import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-merge-rules/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const input =
  'a:focus-visible{color:red} b:focus-visible{color:red} a:any-link{color:blue} b:any-link{color:blue}';
const merged =
  'a:focus-visible,b:focus-visible{color:red} a:any-link,b:any-link{color:blue}';

describe('merge-rules browser targets', () => {
  // A selector list with an unsupported pseudo-class is dropped whole, so the rules stay apart.
  for (const query of ['ie 8', 'ie 11', 'edge 15', 'defaults', 'op_mini all']) {
    test(
      `keeps the rules separate for ${query}, which lacks :focus-visible and :any-link`,
      passthroughCSS(input, { overrideBrowserslist: query })
    );
  }

  for (const query of ['last 1 chrome version', 'safari TP']) {
    test(
      `merges the rules for ${query}`,
      processCSS(input, merged, { overrideBrowserslist: query })
    );
  }

  test(
    'merges the rules when stats select only chrome 150',
    processCSS(input, merged, {
      overrideBrowserslist: '> 1%',
      stats: { chrome: { 150: 100 } },
    })
  );
});

// Chrome 8 and Safari 9 only support the -webkit- prefixed pseudo-class. An
// unprefixed selector makes the browser drop its whole merged list, so these rules stay apart.
test(
  'keeps unprefixed :autofill rules apart for chrome 8, which only supports -webkit-autofill',
  processCSS(
    'a:autofill{color:red} b:autofill{color:red}',
    'a:autofill{color:red} b:autofill{color:red}',
    { overrideBrowserslist: 'chrome 8' }
  )
);

test(
  'keeps unprefixed :any-link rules apart for safari 8, which only supports -webkit-any-link',
  processCSS(
    'a:any-link{color:red} b:any-link{color:red}',
    'a:any-link{color:red} b:any-link{color:red}',
    { overrideBrowserslist: 'safari 8' }
  )
);
