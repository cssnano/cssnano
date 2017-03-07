import {basename, join} from 'path';
import glob from 'glob';
import writeFile from 'write-file';

const homepage = `https://github.com/ben-eb/cssnano`;

function semverMajor (dependencies) {
    Object.keys(dependencies).forEach(dependency => {
        let version = dependencies[dependency];
        if (version[0] === '^' && version[1] !== '0') {
            version = version.split('.')[0] + '.0.0';
        }
        dependencies[dependency] = version;
    });

    return dependencies;
}

function updatePackage (pkg) {
    const pkgName = basename(pkg);
    const pkgJson = require(`${pkg}/package.json`);

    pkgJson.name = pkgName;
    pkgJson.repository = `${homepage}/tree/master/packages/${pkgName}`;
    pkgJson.homepage = homepage;

    pkgJson.bugs = pkgJson.bugs || {};
    pkgJson.bugs.url = `${homepage}/issues`;

    pkgJson.engines = pkgJson.engines || {};
    pkgJson.engines.node = ">=4";

    if (pkgJson.dependencies) {
        pkgJson.dependencies = semverMajor(pkgJson.dependencies);
    }

    if (pkgJson.devDependencies) {
        pkgJson.devDependencies = semverMajor(pkgJson.devDependencies);
    }

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
