import { basename, join } from 'path';
import fs from 'fs-extra';
import getPackages from './getPackages';

getPackages().then((packages) => {
  const pkgPath = join(__dirname, '../package.json');
  const pkgJson = require(pkgPath);

  packages.forEach((pkg) => {
    const name = basename(pkg);
    const subPkgJson = require(join(pkg, 'package.json'));
    if (subPkgJson.private) {
      return;
    }
    pkgJson.babel.env.test.plugins[1][1].alias[
      `lerna:${name}`
    ] = `${name}/src/index.js`;
    pkgJson.babel.env.publish.plugins[1][1].alias[`lerna:${name}`] = name;
  });

  return fs.writeFile(pkgPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
});
