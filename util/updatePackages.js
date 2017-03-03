import {basename, join} from 'path';
import glob from 'glob';
import writeFile from 'write-file';

const homepage = `https://github.com/ben-eb/cssnano`;

function updatePackage (pkg) {
    const pkgName = basename(pkg);
    const pkgJson = require(`${pkg}/package.json`);

    pkgJson.name = pkgName;
    pkgJson.repository = `${homepage}/tree/master/packages/${pkgName}`;
    pkgJson.homepage = homepage;

    pkgJson.bugs = pkgJson.bugs || {};
    pkgJson.bugs.url = `${homepage}/issues`;

    writeFile(`${pkg}/package.json`, `${JSON.stringify(pkgJson, null, 2)}\n`, (err) => {
        if (err) {
            throw err;
        }
    });
}

glob(`${join(__dirname, '../packages')}/*`, (err, packages) => {
    if (err) {
        throw err;
    }
    packages.forEach(updatePackage);
});
