'use strict';

var conversions = [{
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

function dropLeadingZero (number) {
    var value = number.toString();

    if (value[0] === '0' && number % 1) {
        return value.substring(1);
    }

    return value;
}

module.exports = function (number, unit) {
    var value,
        conversion,
        base;

    conversion = conversions.filter(function (area) {
        return unit in area;
    })[0];

    if (conversion) {
        base = number / conversion[unit];

        return Object.keys(conversion)
            .map(function (u) {
                return dropLeadingZero(base / conversion[u]) + u;
            })
            .reduce(function (a, b) {
                return a.length < b.length ? a : b;
            });
    }

    return dropLeadingZero(number) + (unit ? unit : '');
};
