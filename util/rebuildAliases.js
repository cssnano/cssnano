import {basename, join} from 'path';
import glob from 'glob';
import writeFile from 'write-file';

glob(`${join(__dirname, '../packages')}/*`, (err, packages) => {
    if (err) {
        throw err;
    }
    const pkgPath = join(__dirname, '../package.json');
    const pkgJson = require(pkgPath);

    packages.forEach(pkg => {
        const name = basename(pkg);
        pkgJson.babel.env.test.plugins[1][1].alias[`lerna:${name}`] = `${name}/src/index.js`;
        pkgJson.babel.env.publish.plugins[1][1].alias[`lerna:${name}`] = name;
    });

    writeFile(
        pkgPath,
        `${JSON.stringify(pkgJson, null, 2)}\n`,
        (e) => {
            if (e) {
                throw e;
            }
        }
    );
});
