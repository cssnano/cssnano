import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs';

export default function getPackages() {
  const pkgDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../packages'
  );
  return new Promise((resolve, reject) => {
    readdir(pkgDir, (err, packages) => {
      if (err) {
        return reject(err);
      }
      return resolve(packages.map((pkg) => join(pkgDir, pkg)));
    });
  });
}
