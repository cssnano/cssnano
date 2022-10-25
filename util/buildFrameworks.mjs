import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { readdirSync, readFileSync, readdir } from 'fs';
import postcss from 'postcss';
import cssnano from '../packages/cssnano/src/index.js';

function base(filepath = '') {
  return new URL(join('../frameworks', filepath), import.meta.url);
}

const frameworks = readdirSync(base()).reduce((list, framework) => {
  list[basename(framework, '.css')] = readFileSync(base(framework), 'utf8');

  return list;
}, {});

function rebuild(pkg) {
  return Object.keys(frameworks).forEach(async (framework) => {
    const presetModule = await import(pkg + '/src/index.js');
    const preset = presetModule.default();

    return postcss([cssnano({ preset })])
      .process(frameworks[framework], { from: undefined })
      .then((result) => {
        return fs.writeFile(
          `${pkg}/test/integrations/${framework}.css`,
          result.css
        );
      });
  });
}

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '../packages');
readdir(pkgDir, (err, packages) => {
  for (const pkg of packages) {
    if (pkg.startsWith('cssnano-preset-')) {
      rebuild(join(pkgDir, pkg));
    }
  }
});
