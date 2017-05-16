import {join} from 'path';
import glob from 'glob';
import postcss from 'postcss';
import cssnano from '../packages/cssnano';
import writeFile from './writeFile';
import frameworks from './frameworks';
import formatter from './integrationFormatter';

function rebuild (pkg) {
    return Object.keys(frameworks).forEach(framework => {
        const presetModule = require(pkg);
        const preset = presetModule();
        return postcss([cssnano({preset}), formatter]).process(frameworks[framework]).then(result => {
            return writeFile(
                `${pkg}/src/__tests__/integrations/${framework}.css`,
                result.css
            );
        });
    });
}

glob(`${join(__dirname, '../packages')}/cssnano-preset-*`, (err, packages) => {
    if (err) {
        throw err;
    }
    packages.forEach(rebuild);
});
