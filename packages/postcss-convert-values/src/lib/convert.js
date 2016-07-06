const lengthConv = {
    in: 96,
    px: 1,
    pt: 4 / 3,
    pc: 16,
};

const timeConv = {
    s: 1000,
    ms: 1,
};

const angleConv = {
    turn: 360,
    deg: 1,
};

function dropLeadingZero (number) {
    const value = String(number);

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

export default function (number, unit, {time, length, angle}) {
    let value = dropLeadingZero(number) + (unit ? unit : '');
    let converted;

    if (length !== false && unit in lengthConv) {
        converted = transform(number, unit, lengthConv);
    }

    if (time !== false && unit in timeConv) {
        converted = transform(number, unit, timeConv);
    }

    if (angle !== false && unit in angleConv) {
        converted = transform(number, unit, angleConv);
    }

    if (converted && converted.length < value.length) {
        value = converted;
    }

    return value;
}
