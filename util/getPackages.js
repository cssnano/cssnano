import { join } from 'path';
import glob from 'glob';

export default function getPackages() {
  return new Promise((resolve, reject) => {
    glob(`${join(__dirname, '../packages')}/*`, (err, packages) => {
      if (err) {
        return reject(err);
      }
      return resolve(packages);
    });
  });
}
