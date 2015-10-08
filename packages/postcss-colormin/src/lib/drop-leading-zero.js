'use strict';

export default number => {
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
