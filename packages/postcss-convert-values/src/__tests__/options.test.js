/* eslint-disable no-console */
import postcss from 'postcss';
import plugin from '..';

function process(input, options = {}) {
  try {
    let result = postcss([plugin(options)]).process(input, {
      from: undefined,
    });
    return result;
  } catch (validationError) {
    return validationError;
  }
}

const toMatchlongFormattedString = (received, toMatchString) => {
  let _received = received
    .split('\n')
    .map((str) => str.trimStart().trimEnd())
    .join('\n');
  let _toMatchString = toMatchString
    .split('\n')
    .map((str) => str.trimStart().trimEnd())
    .join('\n');

  if (_received === _toMatchString) {
    return {
      message: () => `expected ${received} matched with ${toMatchString}`,
      pass: true,
    };
  }
  return {
    message: () =>
      `expected ${received} doesnt match ${toMatchString} after formatting`,
    pass: false,
  };
};

expect.extend({ toMatchlongFormattedString });

test('should output error of having wrong property', () => {
  const result = process(
    'h1{transition-duration:.005s;transform: rotate(45deg);}',
    {
      wrongprecision: 2,
      angle: false,
    }
  );
  expect(Array.isArray(result.errors)).toBe(true);
  expect(result.message)
    .toMatchlongFormattedString(`Invalid configuration object. postcss-convert-values has been initialised using a configuration object that does not match the API schema.
     - configuration has an unknown property 'wrongprecision'. These properties are valid:
       object { length?, time?, angle?, precision? }`);
});

test('should work with correct options', () => {
  const result = process(
    'h1{transition-duration:.005s;transform: rotate(45deg);}',
    {
      precision: 2,
      angle: false,
    }
  );
  expect(result.errors).toBe(undefined);
});

test('should output error of having wrong value ', () => {
  const result = process(
    'h1{transition-duration:.005s;transform: rotate(45deg);}',
    {
      precision: '2',
    }
  );
  expect(Array.isArray(result.errors)).toBe(true);
  expect(result.message)
    .toMatchlongFormattedString(`Invalid configuration object. postcss-convert-values has been initialised using a configuration object that does not match the API schema.
     - configuration.precision should be one of these:
       boolean | number
       -> Specify any numeric value here to round px values to that many decimal places; for example, using {precision: 2} will round 6.66667px to 6.67px, and {precision: 0} will round it to 7px. Passing false (the default) will leave these values as is.
       Details:
        * configuration.precision should be a boolean.
        * configuration.precision should be a number.`);
});

test('should work when no options are passed', () => {
  const result = process(
    'h1{transition-duration:.005s;transform: rotate(45deg);}'
  );
  expect(result.errors).toBe(undefined);
});
