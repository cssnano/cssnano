import { join } from 'path';
import fs from 'fs/promises';
import toml from '@iarna/toml';
import getPackages from './getPackages.mjs';

function camel(input) {
  return input.replace(/-[a-z]/g, (match) => match[1].toUpperCase());
}

/* External repositories, so the data is added manually */

const database = toml.parse(`
[autoprefixer]
shortDescription = "Removes outdated vendor prefixes"
longDescription = "Removes unnecessary prefixes based on the \`browsers\` option. Note that *by default*, **it will not add new prefixes** to the CSS file."
inputExample = """
.box {
    -moz-border-radius: 10px;
    border-radius: 10px;
    display: flex;
}
"""
outputExample = """
.box {
    border-radius: 10px;
    display: flex;
}
"""
source = "https://github.com/postcss/autoprefixer"
safe = 2.0 # Changes semantics
shortName = "autoprefixer"

[css-declaration-sorter]
shortDescription = "Sorts CSS declarations"
longDescription = "Sorts CSS declarations based on their property names, sorted CSS is smaller when gzipped because there will be more similar strings."
inputExample = """
body {
    animation: none;
    color: #C55;
    border: 0;
}
"""
outputExample = """
body {
    animation: none;
    border: 0;
    color: #C55;
}
"""
source = "https://github.com/Siilwyn/css-declaration-sorter/"
shortName = "cssDeclarationSorter"

[postcss-calc]
shortDescription = "Reduces CSS calc expressions"
longDescription = "Reduces CSS \`calc\` expressions whereever possible, ensuring both browser compatibility and compression."
inputExample = """
.box {
    width: calc(2 * 100px);
}
"""
outputExample = """
.box {
    width: 200px;
}
"""
source = "https://github.com/postcss/postcss-calc"
shortName = "calc"
`);

function shortName(pkgName) {
  return camel(pkgName.replace(/^(postcss|cssnano-util)-/, ''));
}

getPackages().then((packages) => {
  return Promise.all(
    packages.map((pkg) => {
      return fs
        .readFile(join(pkg, 'metadata.toml'), 'utf8')
        .then(async (contents) => {
          const metadata = toml.parse(contents);
          const pkgJson = JSON.parse(
            await fs.readFile(join(pkg, 'package.json'))
          );
          const pkgName = pkgJson.name;
          database[pkgName] = Object.assign({}, metadata, {
            source: `${pkgJson.homepage}/tree/master/packages/${pkgName}`,
            shortDescription: pkgJson.description,
            shortName: shortName(pkgName),
          });
        })
        .catch(() => {});
    }, {})
  ).then(() => {
    const sortedKeys = Object.keys(database).sort();
    const sorted = sortedKeys.reduce((db, key) => {
      db[key] = database[key];

      return db;
    }, {});

    return fs.writeFile(
      new URL('../../metadata.toml', import.meta.url),
      toml.stringify(sorted)
    );
  });
});
