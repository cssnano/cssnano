import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import postcss from 'postcss';
import cssnano from '../packages/cssnano/src/index.js';

function base(filepath = '') {
  return new URL(join('../frameworks', filepath), import.meta.url);
}

/** @type {Record<string, string>} */
const frameworks = {};
for (const framework of readdirSync(base())) {
  frameworks[basename(framework, '.css')] = readFileSync(
    base(framework),
    'utf8'
  );
}

async function rebuild(pkg) {
  for (const framework of Object.keys(frameworks)) {
    const presetModule = await import(join(pkg, 'src', 'index.js'));
    const preset = presetModule.default();

    const result = await postcss([cssnano({ preset })]).process(
      frameworks[framework],
      { from: undefined }
    );
    await fs.writeFile(
      join(pkg, 'test', 'integrations', `${framework}.css`),
      result.css
    );
  }
}

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '../packages');
for (const pkg of await fs.readdir(pkgDir)) {
  if (pkg.startsWith('cssnano-preset-')) {
    await rebuild(join(pkgDir, pkg));
  }
}
