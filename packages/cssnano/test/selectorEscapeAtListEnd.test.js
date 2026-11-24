import { test } from 'node:test';
import processCss from './_processCss.js';

// A backslash before a newline is an invalid escape inside a list, so the rule
// is invalid. Once the list is cut at the comma, the lone item's trailing
// backslash would be a valid escape, which must not make the rule valid.
test(
  'should not turn an invalid selector ending in a backslash in a list into a valid one',
  processCss.passthrough('.a\\\n,.b{color:red}.c{color:red}')
);

// The first rule to spell an item's text must not decide its tokens for later
// rules: a lone `.a\` ahead of the list must not give the list's item a valid
// escape.
test(
  'should keep an invalid list item invalid when a lone rule spelled the same text first',
  processCss.passthrough('.a\\\n{top:0}.a\\\n,.b{color:red}.c{color:red}')
);

// A selector ending in a backslash before whitespace is invalid on its own.
test(
  'should not turn a lone invalid selector ending in a backslash into a valid one',
  processCss.passthrough('.a\\\n{top:0}')
);

// A backslash before a space escapes the space, so `.a\ ` is the class "a ".
test(
  'should merge rules that share a selector ending in an escaped space',
  processCss('.a\\ {color:red}.a\\ {top:0}', '.a\\ {color:red;top:0}')
);

// Joining the items must not drop the space that closes the escape: `.a\,.b`
// would be one selector for the class "a,.b".
test(
  'should keep the escaped space of a list item when merging duplicate selectors',
  processCss('.a\\ {color:red}.a\\ ,.b{color:red}', '.a\\ ,.b{color:red}')
);

// The backslash is itself escaped here, so the space after it escapes nothing.
test(
  'should still trim the space after an escaped backslash at the end of a selector',
  processCss('.a\\\\ {top:0}', '.a\\\\{top:0}')
);

// `.a\ ` is the class "a " and `.a\` before a newline is invalid, so they are
// different selectors and must not be deduplicated into one.
test(
  'should not dedupe an invalid selector ending in a backslash with an escaped-space selector',
  processCss.passthrough('.a\\\n,.a\\ {top:0}')
);

test(
  'should not drop an invalid selector ending in a backslash that follows an escaped-space selector',
  processCss.passthrough('.a\\ ,.a\\\n{top:0}')
);

// Removing a comment must not leave a backslash before the next character: the
// newline is what makes it an invalid escape.
test(
  'should keep the newline after a trailing backslash when removing the comment that follows it',
  processCss('.a\\\n/**/,.b{top:0}', '.a\\\n,.b{top:0}')
);

test(
  'should keep an invalid selector invalid when removing a comment before the next item',
  processCss('.a\\\n,.c\\\n/**/,.b{top:0}', '.a\\\n,.c\\\n,.b{top:0}')
);

// A backslash before a space escapes the space, so no newline is needed.
test(
  'should still drop the comment after an escaped space in a selector',
  processCss('.a\\ /**/,.b{top:0}', '.a\\ ,.b{top:0}')
);

test(
  'should not merge at-rules whose preludes differ in an invalid escape',
  processCss.passthrough('@layer a\\\n{.b{top:0}}@layer a\\ {.c{top:0}}')
);

// Sorting would move the invalid item and glue its backslash to the next one.
test(
  'should not reorder a selector list that has an item ending in an invalid escape',
  processCss.passthrough('.b\\\n,.a{top:0}')
);

test(
  'should keep the newline after a trailing backslash when removing the comment before the block of a rule',
  processCss('.a\\\n/**/{top:0}', '.a\\\n{top:0}')
);

test(
  'should keep the newline after a trailing backslash when removing the comment before the block of an at-rule',
  processCss('@media x\\\n/**/{.a{top:0}}', '@media x\\\n{.a{top:0}}')
);

test(
  'should keep the newline after a trailing backslash of an at-rule prelude with CRLF line endings',
  processCss('@layer a\\\r\n/**/{.a{top:0}}', '@layer a\\\n{.a{top:0}}')
);

// The selector's tokens drop the newline that makes its backslash invalid, so
// they must not be shared with a declaration value of the same text.
test(
  'should not give a declaration value the tokens of a selector with the same text',
  processCss.passthrough('.x{grid-area:a\\\n}a\\\n{top:0}')
);

test(
  'should not give a declaration value the tokens of a selector with the same text when the rule comes first',
  processCss.passthrough('a\\\n{top:0}.x{grid-area:a\\\n}')
);

// A trailing comment hides the backslash from a last-token check, but the item
// is still invalid and must not be deduplicated into a valid one.
test(
  'should not dedupe an invalid item that ends in a backslash before a comment',
  processCss.passthrough('.a\\ ,.a\\\n/*! x */,.b{top:0}')
);

// Removing the comment before the comma leaves the list's last item ending in an
// invalid escape; the list must stay invalid, not become `.a\,.c`.
test(
  'should keep a list ending in an invalid escape invalid when a comment before a comma is removed',
  processCss('.c/*x*/,.a\\\n{top:0}', '.c,.a\\\n{top:0}')
);
