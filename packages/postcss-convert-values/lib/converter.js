'use strict';

var leadingZero = require('./leadingZero');

var conversions = [{
    // Length
    'in': 96,
    px: 1,
    pt: 4 / 3,
    pc: 16
}, {
    // Time
    s: 1000,
    ms: 1
}];

function shortest (list) {
    return list.reduce(function (a, b) {
        return a.length < b.length ? a : b;
    });
}

function appendUnit (unit) {
    return typeof unit === 'string' ? unit : '';
}

module.exports = function convert (number, unit) {
    var conversion = conversions.filter(function (area) {
        return unit in area;
    })[0];

    // Return if unrecognised
    if (!conversion) {
        return leadingZero(number) + appendUnit(unit);
    }

    var base = number / conversion[unit];
    var notInput = function (c) { return c !== unit; };

    var candidates = Object.keys(conversion).filter(notInput).map(function (u) {
        return leadingZero(parseFloat(base) / conversion[u]) + u;
    }).concat(leadingZero(parseFloat(number)) + unit);

    return shortest(candidates);
};
