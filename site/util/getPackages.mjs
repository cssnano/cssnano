import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdir } from 'fs';

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
