import min from '../colours';

function isEqual(input, output) {
  return () => expect(min(input)).toBe(output);
}

test('should lowercase keywords', isEqual('RED', 'red'));

test('should convert shorthand hex to keyword', isEqual('#f00', 'red'));

test('should convert longhand hex to keyword', isEqual('#ff0000', 'red'));

test('should convert rgb to keyword', isEqual('rgb(255,0,0)', 'red'));

test(
  'should convert fully opaque rgb to keyword',
  isEqual('rgba(255, 0, 0, 1)', 'red')
);

test('should convert hsl to keyword', isEqual('hsl(0, 100%, 50%)', 'red'));

test(
  'should convert fully opaque hsl to keyword',
  isEqual('hsla(0, 100%, 50%, 1)', 'red')
);

test(
  'should convert translucent hsla to rgba',
  isEqual('hsla(0, 100%, 50%, .5)', 'rgba(255, 0, 0, 0.5)')
);

test(
  'should convert longhand hex to shorthand, case insensitive',
  isEqual('#FFFFFF', '#fff')
);

test(
  'should convert keyword to hex, case insensitive',
  isEqual('WHiTE', '#fff')
);

test('should convert keyword to hex', isEqual('yellow', '#ff0'));

test('should convert rgb to hex', isEqual('rgb(12, 134, 29)', '#0c861d'));

test('should convert hsl to hex', isEqual('hsl(230, 50%, 40%)', '#349'));

test(
  'should convert another longhand hex to keyword',
  isEqual('#000080', 'navy')
);

test(
  'should convert rgba to hsla when shorter',
  isEqual('rgba(221, 221, 221, 0.5)', 'hsla(0, 0%, 87%, 0.5)')
);

test(
  'should convert this specific rgba value to "transparent"',
  isEqual('rgba(0,0,0,0)', 'transparent')
);

test(
  'should convert this specific hsla value to "transparent"',
  isEqual('hsla(0,0%,0%,0)', 'transparent')
);

test(
  'should convert hsla values with 0 saturation & 0 lightness to "transparent"',
  isEqual('hsla(200,0%,0%,0)', 'transparent')
);

test(
  'should leave transparent as it is',
  isEqual('transparent', 'transparent')
);

test(
  'should prefer to output hex rather than keywords when they are the same length',
  isEqual('#696969', '#696969')
);

test('should cap values at their maximum', isEqual('rgb(400,400,400)', '#fff'));

test(
  'should continue hsl value rotation',
  isEqual('hsl(400, 400%, 50%)', '#fa0')
);

test(
  'should convert signed numbers',
  isEqual('rgba(-100,0,-100,.5)', 'rgba(0, 0, 0, 0.5)')
);

test(
  'should convert signed numbers (2)',
  isEqual('hsla(-400,50%,10%,.5)', 'rgba(38, 13, 30, 0.5)')
);

test(
  'should convert percentage based rgb values',
  isEqual('rgb(100%,100%,100%)', '#fff')
);

test(
  'should convert percentage based rgba values (2)',
  isEqual('rgba(50%,50%,50%,0.5)', 'hsla(0, 0%, 50%, 0.5)')
);

test(
  'should convert percentage based rgba values (3)',
  isEqual('rgb(100%,100%,100%)', '#fff')
);

test(
  'should convert percentage based rgba values (4)',
  isEqual('rgba(100%,100%,100%,0.5)', 'hsla(0, 0%, 100%, 0.5)')
);

test(
  'should convert percentage based rgba values (5)',
  isEqual('rgba(100%,64.7%,0%,.5)', 'rgba(255, 165, 0, 0.5)')
);

test(
  'should pass through on invalid rgb functions',
  isEqual('rgb(50%,23,54)', 'rgb(50%,23,54)')
);

test('should pass on non prefixed hexadecimal value', isEqual('999', '999'));

test('should convert darkgray to a hex', isEqual('darkgray', '#a9a9a9'));

test('should convert 8 character hex codes', isEqual('#000000FF', '#000'));

test('should convert 4 character hex codes', isEqual('#000F', '#000'));

test(
  'should pass through 8 character hex codes',
  isEqual('#00000004', '#00000004')
);

test('should pass through if not recognised', () => {
  expect(min('Unrecognised')).toBe('Unrecognised');
  expect(min('inherit')).toBe('inherit');
});
