import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import process from 'node:process';
import postcss from 'postcss';
import cssnano from '../packages/cssnano/src/index.js';

// Dry-run reports which fixtures would change without writing, so an
// intentional output change can be reviewed before regenerating artifacts.
const dryRun =
  process.argv.includes('--dry-run') || process.argv.includes('-n');

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

/** @type {string[]} */
const changed = [];

async function rebuild(pkg) {
  const presetModule = await import(join(pkg, 'src', 'index.js'));
  const preset = presetModule.default();

  for (const framework of Object.keys(frameworks)) {
    const result = await postcss([cssnano({ preset })]).process(
      frameworks[framework],
      { from: undefined }
    );

    const fixturePath = join(pkg, 'test', 'integrations', `${framework}.css`);
    const label = relative(process.cwd(), fixturePath);

    let current;
    try {
      current = await fs.readFile(fixturePath, 'utf8');
    } catch {
      // A missing fixture counts as a change so it is not silently skipped.
      current = null;
    }

    if (current === result.css) {
      continue;
    }
    changed.push(label);

    if (dryRun) {
      console.log(`would update: ${label}`);
    } else {
      await fs.writeFile(fixturePath, result.css);
      console.log(`updated: ${label}`);
    }
  }
}

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '../packages');
for (const pkg of await fs.readdir(pkgDir)) {
  if (pkg.startsWith('cssnano-preset-')) {
    await rebuild(join(pkgDir, pkg));
  }
}

if (changed.length === 0) {
  console.log('all framework fixtures are up to date');
} else if (dryRun) {
  console.log(
    `\n${changed.length} fixture(s) would change; rerun without --dry-run to sync`
  );
} else {
  console.log(
    `\n${changed.length} fixture(s) updated; review the git diff before committing`
  );
}
