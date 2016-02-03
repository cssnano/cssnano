import nano from '..';
import {readdirSync as directory} from 'fs';
import suite from 'css-minifier-tests';
import ava from 'ava';

const minifiers = {
    cssnano: css => {
        return new Promise((resolve, reject) => {
            return nano.process(css).then(result => {
                resolve(result.css);
            }, err => {
                reject(err);
            });
        });
    }
};

const tests = directory(__dirname + '/../../node_modules/css-minifier-tests/tests').map(dir => {
    return __dirname + '/../../node_modules/css-minifier-tests/tests/' + dir;
});

function onEnd (results, testNames) {
    testNames.forEach((test, index) => {
        ava(test.replace(/^\d+ /, ''), t => {
            const result = results[index].cssnano.result;
            t.ok(result === 'outstanding' || result === 'optimal');
        });
    });
}

suite({
    tests: tests,
    minifiers: minifiers,
    onEnd: onEnd
});
