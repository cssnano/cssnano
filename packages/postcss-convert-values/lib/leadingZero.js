'use strict';

module.exports = function leadingZero (number) {
    return ('' + number).replace(/^0(\..*)/, '$1');
};
