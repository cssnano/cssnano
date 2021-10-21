import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';

export default function getPackages() {
  return new Promise((resolve, reject) => {
    glob(
      `${join(dirname(fileURLToPath(import.meta.url)), '../../packages')}/*`,
      (err, packages) => {
        if (err) {
          return reject(err);
        }
        return resolve(packages);
      }
    );
  });
}
