import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('@property invalid syntax', () => {
  test(
    `should preserve the percentage from 0 for malformed @property syntax`,
    processCSS(
      `@property --malformed{syntax:'<percentage';inherits:false;initial-value:0%;}`,
      `@property --malformed{syntax:'<percentage';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for malformed unclosed brackets [ <length>`,
    processCSS(
      `@property --test{syntax:'[ <length>';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'[ <length>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for unclosed curly multiplier after type <number>{1,2`,
    processCSS(
      `@property --test{syntax:'<number>{1,2';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<number>{1,2';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for unclosed curly multiplier after ident small{1,2`,
    processCSS(
      `@property --test{syntax:'small{1,2';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'small{1,2';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for unclosed curly multiplier after bracket [ <number> ]{1,2`,
    processCSS(
      `@property --test{syntax:'[ <number> ]{1,2';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'[ <number> ]{1,2';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for invalid component syntax token @foo`,
    processCSS(
      `@property --test{syntax:'@foo';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'@foo';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for empty type <>`,
    processCSS(
      `@property --test{syntax:'<>';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for unclosed range restriction <length [0,10>`,
    processCSS(
      `@property --test{syntax:'<length [0,10>';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length [0,10>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for unclosed type bracket <length`,
    processCSS(
      `@property --test{syntax:'<length';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for invalid type closing <length ;`,
    processCSS(
      `@property --test{syntax:'<length ;';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length ;';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for trailing single bar combinator <length> |`,
    processCSS(
      `@property --test{syntax:'<length> |';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length> |';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for trailing double bar combinator <length> ||`,
    processCSS(
      `@property --test{syntax:'<length> ||';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length> ||';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for unsupported single ampersand combinator <length> & <number>`,
    processCSS(
      `@property --test{syntax:'<length> & <number>';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length> & <number>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for trailing single ampersand <length> &`,
    processCSS(
      `@property --test{syntax:'<length> &';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length> &';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for trailing double ampersand <length> &&`,
    processCSS(
      `@property --test{syntax:'<length> &&';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length> &&';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for unquoted syntax descriptor`,
    processCSS(
      `@property --test{syntax:<length>;inherits:false;initial-value:0%;}`,
      `@property --test{syntax:<length>;inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for multiple string tokens in syntax`,
    processCSS(
      `@property --test{syntax:'<length>' '<percentage>';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length>' '<percentage>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for empty syntax descriptor string`,
    processCSS(
      `@property --test{syntax:'';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for syntax descriptor with only comments`,
    processCSS(
      `@property --test{syntax:/* empty */;inherits:false;initial-value:0%;}`,
      `@property --test{syntax:/* empty */;inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should preserve percentage from 0 for invalid type closing token <length foo>`,
    processCSS(
      `@property --test{syntax:'<length foo>';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<length foo>';inherits:false;initial-value:0%;}`
    )
  );
});
