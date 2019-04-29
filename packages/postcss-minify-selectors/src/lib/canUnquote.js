import unquote from './unquote';

/**
 * Can unquote attribute detection from mothereff.in
 * Copyright Mathias Bynens <https://mathiasbynens.be/>
 * https://github.com/mathiasbynens/mothereff.in
 */
const escapes = /\\([0-9A-Fa-f]{1,6})[ \t\n\f\r]?/g;
// eslint-disable-next-line no-control-regex
const range = /[\u0000-\u002c\u002e\u002f\u003A-\u0040\u005B-\u005E\u0060\u007B-\u009f]/;

export default function canUnquote(value) {
  value = unquote(value);

  if (value === '-' || value === '') {
    return false;
  }

  value = value.replace(escapes, 'a').replace(/\\./g, 'a');

  return !(range.test(value) || /^(?:-?\d|--)/.test(value));
}
