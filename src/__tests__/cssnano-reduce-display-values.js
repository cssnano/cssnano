import test from 'ava';
import displayValues from '../lib/reduceDisplayValues';
import getData from './util/getData';
import processCss, {passthrough} from './_processCss';

const data = getData(displayValues.mappings);

test(
    'should pass through "block ruby"',
    passthrough,
    'display:block ruby;'
);

Object.keys(data).forEach(key => {
    const fixture = data[key];
    test(
        `display: ${fixture} => display: ${key}`,
        processCss,
        `display:${fixture}`,
        `display:${key}`
    );
});
