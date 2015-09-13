'use strict';

import dropLeadingZero from './drop-leading-zero';

const conversions = [{
    // Length
    'in': 96,
    'px': 1,
    'pt': 4 / 3,
    'pc': 16
}, {
    // Time
    's': 1000,
    'ms': 1
}];

export default function (number, unit) {
    let converted,
        value = dropLeadingZero(number) + (unit ? unit : ''),
        conversion,
        base;

    conversion = conversions.filter(area => unit in area)[0];

    if (conversion) {
        if (unit === 'ms' || unit === 'px') {
            base = number / conversion[unit];
        } else {
            base = number * conversion[unit];
        }

        converted = Object.keys(conversion)
            .filter(u => unit !== u)
            .map(u => dropLeadingZero(base / conversion[u]) + u)
            .reduce((a, b) => a.length < b.length ? a : b);

        if (converted.length < value.length) {
            value = converted;
        }
    }

    return value;
}
