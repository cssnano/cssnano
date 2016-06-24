import displayValues from '../../lib/reduceDisplayValues';
import getData from '../util/getData';

const {mappings} = displayValues;

const tests = [{
    message: 'display: block ruby (pass through)',
    fixture: 'display:block ruby',
    expected: 'display:block ruby',
}];

const data = getData(mappings);

Object.keys(data).forEach(key => {
    const fixture = data[key];
    tests.push({
        message: `display: ${fixture} => display: ${key}`,
        fixture: `display:${fixture}`,
        expected: `display:${key}`,
    });
});

module.exports.name = 'cssnano/reduce-display-values';
module.exports.tests = tests;
