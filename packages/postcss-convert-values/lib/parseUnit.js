'use strict';

// From longer to shorter!
var units = ['rem', 'em', 'ex', 'in', 'cm', 'mm', 'pt', 'pc', 'px', 'ms', 's', '%'];

module.exports = function (value) {
    var max, index;

    for (max = 3; max !== 0; max -= 1) {
        index = units.indexOf(value.slice(-max));
        if (index !== -1) {
            return units[index];
        }
    }

    return null;
};
