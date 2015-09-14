'use strict';

const length = {
    'in': 96,
    'px': 1,
    'pt': 4 / 3,
    'pc': 16
};

const time = {
    's': 1000,
    'ms': 1
};

function dropLeadingZero (number) {
    let value = String(number);

    if (number % 1) {
        if (value[0] === '0') {
            return value.slice(1);
        }

        if (value[0] === '-' && value[1] === '0') {
            return '-' + value.slice(2);
        }
    }

    return value;
}

function transform (number, unit, conversion) {
    let one, base;
    let convertionUnits = Object.keys(conversion).filter(u => {
        if (conversion[u] === 1) {
            one = u;
        }
        return unit !== u;
    });

    if (unit === one) {
        base = number / conversion[unit];
    } else {
        base = number * conversion[unit];
    }

    return convertionUnits
        .map(u => dropLeadingZero(base / conversion[u]) + u)
        .reduce((a, b) => a.length < b.length ? a : b);
}

export default function (number, unit, {convertTime, convertLength}) {
    let value = dropLeadingZero(number) + (unit ? unit : '');
    let converted;

    if (convertLength !== false && unit in length) {
        converted = transform(number, unit, length);
    }

    if (convertTime !== false && unit in time) {
        converted = transform(number, unit, time);
    }

    if (converted && converted.length < value.length) {
        value = converted;
    }

    return value;
}
