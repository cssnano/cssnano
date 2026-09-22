import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('@property initial-value', () => {
  test(
    `should not strip the percentage from 0 in @property, for initial-value`,
    processCSS(
      `@property --percent{syntax:'<percentage>';inherits:false;initial-value:0%;}`,
      `@property --percent{syntax:'<percentage>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for initial-value (syntax string in double quotes)`,
    processCSS(
      `@property --percent{syntax:"<percentage>";inherits:false;initial-value:0%;}`,
      `@property --percent{syntax:"<percentage>";inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for initial-value (length-percentage)`,
    processCSS(
      `@property --percent{syntax:'<length-percentage>';inherits:false;initial-value:0%;}`,
      `@property --percent{syntax:'<length-percentage>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for initial-value (length-percentage, syntax string in double quotes)`,
    processCSS(
      `@property --percent{syntax:"<length-percentage>";inherits:false;initial-value:0%;}`,
      `@property --percent{syntax:"<length-percentage>";inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for composite syntax`,
    processCSS(
      `@property --angle-or-percent{syntax:'<angle> | <percentage>';inherits:false;initial-value:0%;}`,
      `@property --angle-or-percent{syntax:'<angle> | <percentage>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for a sequence`,
    processCSS(
      `@property --percent-and-number{syntax:'<percentage> <number>';inherits:false;initial-value:0% 1;}`,
      `@property --percent-and-number{syntax:'<percentage> <number>';inherits:false;initial-value:0% 1;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for boolean combinators`,
    processCSS(
      `@property --percent-or-number{syntax:'<percentage> || <number>';inherits:false;initial-value:0%;}`,
      `@property --percent-or-number{syntax:'<percentage> || <number>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for an ampersand combinator`,
    processCSS(
      `@property --percent-and-number{syntax:'<percentage> && <number>';inherits:false;initial-value:0%;}`,
      `@property --percent-and-number{syntax:'<percentage> && <number>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for a grouped optional component`,
    processCSS(
      `@property --optional-percent{syntax:'[ <percentage> | <number> ]?';inherits:false;initial-value:0%;}`,
      `@property --optional-percent{syntax:'[ <percentage> | <number> ]?';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for a range`,
    processCSS(
      `@property --bounded-percent{syntax:'<percentage [0,100]>';inherits:false;initial-value:0%;}`,
      `@property --bounded-percent{syntax:'<percentage [0,100]>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for a plus multiplier`,
    processCSS(
      `@property --percent-list{syntax:'<percentage>+';inherits:false;initial-value:0%;}`,
      `@property --percent-list{syntax:'<percentage>+';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for optional and repeated multipliers`,
    processCSS(
      `@property --percent-list{syntax:'<percentage>?';inherits:false;initial-value:0%;}`,
      `@property --percent-list{syntax:'<percentage>?';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for a star multiplier`,
    processCSS(
      `@property --percent-list{syntax:'<percentage>*';inherits:false;initial-value:0%;}`,
      `@property --percent-list{syntax:'<percentage>*';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for bounded repetition`,
    processCSS(
      `@property --percent-list{syntax:'<percentage>{1,3}';inherits:false;initial-value:0%;}`,
      `@property --percent-list{syntax:'<percentage>{1,3}';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should recognize mixed-case and escaped @property syntax components`,
    processCSS(
      `@property --percent{syntax:'<PeRcEnTaGe>';inherits:false;initial-value:0%;}@property --escaped-percent{syntax:'<\\\\70 ercentage>';inherits:false;initial-value:0%;}`,
      `@property --percent{syntax:'<PeRcEnTaGe>';inherits:false;initial-value:0%;}@property --escaped-percent{syntax:'<\\\\70 ercentage>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should ignore comments around and between @property syntax components`,
    processCSS(
      `@property --percent{syntax:/*before*/ '<percentage> /*between*/ <number>' /*after*/;inherits:false;initial-value:0%;}`,
      `@property --percent{syntax:/*before*/ '<percentage> /*between*/ <number>' /*after*/;inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should strip the percentage from 0 for known non-percentage @property syntax`,
    processCSS(
      `@property --number{syntax:'<number>';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'<number>';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should preserve the percentage from 0 for malformed @property syntax`,
    processCSS(
      `@property --malformed{syntax:'<percentage';inherits:false;initial-value:0%;}`,
      `@property --malformed{syntax:'<percentage';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for a hash multiplier`,
    processCSS(
      `@property --percent-list{syntax:'<percentage>#';inherits:false;initial-value:0%;}`,
      `@property --percent-list{syntax:'<percentage>#';inherits:false;initial-value:0%;}`
    )
  );
});
