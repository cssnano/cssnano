import bgRepeat from '../../lib/reduceBackgroundRepeat';
import getData from '../util/getData';

const {mappings} = bgRepeat;

const tests = [{
    message: 'should pass through two value syntax',
    fixture: 'background:space round',
    expected: 'background:space round',
}];

const data = getData(mappings);

Object.keys(data).forEach(mapping => {
    const fixture = data[mapping];
    tests.push({
        message: `should handle ${mapping} (background)`,
        fixture: `background:#000 url(cat.jpg) ${fixture} 50%`,
        expected: `background:#000 url(cat.jpg) ${mapping} 50%`,
    }, {
        message: `should handle ${mapping} (background-repeat)`,
        fixture: `background-repeat:${fixture}`,
        expected: `background-repeat:${mapping}`,
    }, {
        message: `should handle multiple instances (background)`,
        fixture: `background-repeat:#000 url(cat.jpg) ${fixture} 50%,#000 url(cat.jpg) ${fixture} 50%`,
        expected: `background-repeat:#000 url(cat.jpg) ${mapping} 50%,#000 url(cat.jpg) ${mapping} 50%`,
    }, {
        message: `should handle multiple instances (background-repeat)`,
        fixture: `background-repeat:${fixture},${fixture}`,
        expected: `background-repeat:${mapping},${mapping}`,
    });
});

module.exports.name = 'cssnano/reduce-background-repeat';
module.exports.tests = tests;
