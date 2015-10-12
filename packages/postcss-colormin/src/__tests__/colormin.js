'use strict';

import test from 'tape';
import min from '../lib/colormin';

test('should return the smallest colour', t => {
    t.plan(25);
    t.equal(min('RED'), 'red', 'should lowercase keywords');
    t.equal(min('#f00'), 'red', 'should convert shorthand hex to keyword');
    t.equal(min('#ff0000'), 'red', 'should convert longhand hex to keyword');
    t.equal(min('rgb', [255, 0, 0]), 'red', 'should convert rgb to keyword');
    t.equal(min('rgba', [255, 0, 0, 1]), 'red', 'should convert fully opaque rgb to keyword');
    t.equal(min('hsl', [0, 100, 50]), 'red', 'should convert hsl to keyword');
    t.equal(min('hsla', [0, 100, 50, 1]), 'red', 'should convert fully oqaque hsl to keyword');
    t.equal(min('hsla', [0, 100, 50, 0.5]), 'rgba(255,0,0,.5)', 'should convert translucent hsla to rgba');
    t.equal(min('#FFFFFF'), '#fff', 'should convert longhand hex to shorthand, case insensitive');
    t.equal(min('WHiTE'), '#fff', 'should convert keyword to hex, case insensitive');
    t.equal(min('yellow'), '#ff0', 'should convert keyword to hex');
    t.equal(min('rgb', [12, 134, 29]), '#0c861d', 'should convert rgb to hex');
    t.equal(min('hsl', [230, 50, 40]), '#349', 'should convert hsl to hex');
    t.equal(min('#000080'), 'navy', 'should convert another longhand hex to keyword');
    t.equal(min('rgba', [199, 190, 179, 0.8]), 'hsla(33,15%,74%,.8)', 'should convert rgba to hsla when shorter');
    t.equal(min('rgba', [0, 0, 0, 0]), 'transparent', 'should convert this specific rgba value to "transparent"');
    t.equal(min('hsla', [0, 0, 0, 0]), 'transparent', 'should convert this specific hsla value to "transparent"');
    t.equal(min('hsla', [200, 0, 0, 0]), 'transparent', 'should convert hsla values with 0 saturation & 0 lightness to "transparent"');
    t.equal(min('transparent'), 'transparent', 'should leave transparent as it is');
    t.equal(min('#696969'), '#696969', 'should prefer to output hex rather than keywords when they are the same length');
    t.equal(min('rgba', [-100, 0, -100, 0.5]), 'rgba(0,0,0,.5)', 'should convert signed numbers');
    t.equal(min('hsla', [-400, 50, 10, 0.5]), 'rgba(38,13,13,.5)', 'should convert signed numbers (2)');
    t.equal(min('rgb', [400, 400, 400]), '#fff', 'should cap values at their maximum');
    t.equal(min('hsl', [400, 400, 50]), 'red', 'should cap values at their maximum (2)');
    t.equal(min('hsla', [0, 0, 100, 0.5]), 'hsla(0,0%,100%,.5)', 'should remove leading zeros');
});

test('should pass through if not recognised', t => {
    t.plan(2);
    t.equal(min('Unrecognised'), 'Unrecognised');
    t.equal(min('inherit'), 'inherit');
});
