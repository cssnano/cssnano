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
    `should not strip the percentage from 0 in @property, for initial-value (angle-percentage)`,
    processCSS(
      `@property --angle{syntax:'<angle-percentage>';inherits:false;initial-value:0%;}`,
      `@property --angle{syntax:'<angle-percentage>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for initial-value (angle-percentage, syntax string in double quotes)`,
    processCSS(
      `@property --angle{syntax:"<angle-percentage>";inherits:false;initial-value:0%;}`,
      `@property --angle{syntax:"<angle-percentage>";inherits:false;initial-value:0%;}`
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
    `should not strip the percentage from 0 in @property, for a hash multiplier`,
    processCSS(
      `@property --percent-list{syntax:'<percentage>#';inherits:false;initial-value:0%;}`,
      `@property --percent-list{syntax:'<percentage>#';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip unit from 0 in @property initial-value for <length> syntax`,
    processCSS(
      `@property --length{syntax:'<length>';inherits:false;initial-value:0px;}`,
      `@property --length{syntax:'<length>';inherits:false;initial-value:0px;}`
    )
  );

  test(
    `should not strip percentage from 0 in uppercase @PROPERTY initial-value`,
    processCSS(
      `@PROPERTY --percent{syntax:'<percentage>';inherits:false;initial-value:0%;}`,
      `@PROPERTY --percent{syntax:'<percentage>';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property, for universal syntax "*"`,
    processCSS(
      `@property --universal{syntax:'*';inherits:false;initial-value:0%;}`,
      `@property --universal{syntax:'*';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property when initial-value precedes syntax`,
    processCSS(
      `@property --percent{initial-value:0%;syntax:'<percentage>';inherits:false;}`,
      `@property --percent{initial-value:0%;syntax:'<percentage>';inherits:false;}`
    )
  );

  test(
    `should not strip the percentage from 0 in @property with multiple comma-separated initial values`,
    processCSS(
      `@property --percent-list{syntax:'<percentage>#';inherits:false;initial-value:0%, 0%;}`,
      `@property --percent-list{syntax:'<percentage>#';inherits:false;initial-value:0%, 0%;}`
    )
  );

  test(
    `should parse ident syntax components and strip percentage from 0 when percentage is not allowed`,
    processCSS(
      `@property --size{syntax:'small | large';inherits:false;initial-value:0%;}`,
      `@property --size{syntax:'small | large';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should not strip unit from 0 in @property initial-value for <length-percentage> syntax when zero is a length`,
    processCSS(
      `@property --lp{syntax:'<length-percentage>';inherits:false;initial-value:0px;}`,
      `@property --lp{syntax:'<length-percentage>';inherits:false;initial-value:0px;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for optional multiplier <number>?`,
    processCSS(
      `@property --number{syntax:'<number>?';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'<number>?';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for star multiplier <number>*`,
    processCSS(
      `@property --number{syntax:'<number>*';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'<number>*';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for bounded repetition <number>{1,3}`,
    processCSS(
      `@property --number{syntax:'<number>{1,3}';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'<number>{1,3}';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for range restriction <number [0,10]>`,
    processCSS(
      `@property --number{syntax:'<number [0,10]>';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'<number [0,10]>';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for grouped optional component [ <number> | <length> ]?`,
    processCSS(
      `@property --number{syntax:'[ <number> | <length> ]?';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'[ <number> | <length> ]?';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for boolean combinator <number> || <length>`,
    processCSS(
      `@property --number{syntax:'<number> || <length>';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'<number> || <length>';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for ampersand combinator <number> && <length>`,
    processCSS(
      `@property --number{syntax:'<number> && <length>';inherits:false;initial-value:0%;}`,
      `@property --number{syntax:'<number> && <length>';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for sequence <number> <length>`,
    processCSS(
      `@property --number{syntax:'<number> <length>';inherits:false;initial-value:0% 10px;}`,
      `@property --number{syntax:'<number> <length>';inherits:false;initial-value:0 10px;}`
    )
  );

  test(
    `should not strip percentage from 0 in @property for nested group allowing percentage [ [ <percentage> ] ]`,
    processCSS(
      `@property --test{syntax:'[ [ <percentage> ] ]';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'[ [ <percentage> ] ]';inherits:false;initial-value:0%;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for nested group not allowing percentage [ [ <length> ] ]`,
    processCSS(
      `@property --test{syntax:'[ [ <length> ] ]';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'[ [ <length> ] ]';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for exclamation multiplier <number>!`,
    processCSS(
      `@property --test{syntax:'<number>!';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'<number>!';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for ident with multiplier small+`,
    processCSS(
      `@property --test{syntax:'small+';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'small+';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for ident with repetition small{1,3}`,
    processCSS(
      `@property --test{syntax:'small{1,3}';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'small{1,3}';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property for group with repetition [ <number> ]{1,3}`,
    processCSS(
      `@property --test{syntax:'[ <number> ]{1,3}';inherits:false;initial-value:0%;}`,
      `@property --test{syntax:'[ <number> ]{1,3}';inherits:false;initial-value:0;}`
    )
  );

  test(
    `should strip percentage from 0 in @property with comments surrounding syntax string`,
    processCSS(
      `@property --test{syntax:/* a */ '<length>' /* b */;inherits:false;initial-value:0%;}`,
      `@property --test{syntax:/* a */ '<length>' /* b */;inherits:false;initial-value:0;}`
    )
  );

  test(
    'should reuse cached syntax evaluation for multiple initial-value declarations in @property',
    processCSS(
      `@property --percent{syntax:'<percentage>';inherits:false;initial-value:0%;initial-value:0%;}`,
      `@property --percent{syntax:'<percentage>';inherits:false;initial-value:0%;initial-value:0%;}`
    )
  );
});
