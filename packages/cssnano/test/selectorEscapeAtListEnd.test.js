import { test } from 'node:test';
import processCss from './_processCss.js';

// A backslash before a newline is an invalid escape inside a list, so the rule
// is invalid. Once the list is cut at the comma, the lone item's trailing
// backslash would be a valid escape, which must not make the rule valid.
test(
  'should not turn an invalid selector ending in a backslash in a list into a valid one',
  processCss.passthrough('.a\\\n,.b{color:red}.c{color:red}')
);
