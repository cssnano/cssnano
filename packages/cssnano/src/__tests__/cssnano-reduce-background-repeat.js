import test from 'ava';
import bgRepeat from '../lib/reduceBackgroundRepeat';
import getData from './util/getData';
import processCss, {passthrough} from './_processCss';

const data = getData(bgRepeat.mappings);

test(
    'should pass through two value syntax',
    passthrough,
    'background:space round'
);

function suite (t, fixture, expected) {
    return Promise.all([
        processCss(
            t,
            `background:#000 url(cat.jpg) ${fixture} 50%`,
            `background:#000 url(cat.jpg) ${expected} 50%`
        ),
        processCss(
            t,
            `background-repeat:${fixture}`,
            `background-repeat:${expected}`
        ),
        processCss(
            t,
            `background-repeat:#000 url(cat.jpg) ${fixture} 50%,#000 url(cat.jpg) ${fixture} 50%`,
            `background-repeat:#000 url(cat.jpg) ${expected} 50%,#000 url(cat.jpg) ${expected} 50%`
        ),
        processCss(
            t,
            `background-repeat:${fixture},${fixture}`,
            `background-repeat:${expected},${expected}`
        ),
    ]);
}

Object.keys(data).forEach(conversion => {
    const fixture = data[conversion];
    test(
        suite,
        fixture,
        conversion
    );
});
