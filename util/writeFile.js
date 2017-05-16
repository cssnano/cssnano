import write from 'write-file';

export default function writeFile (path, contents) {
    return new Promise((resolve, reject) => {
        return write(path, contents, err => {
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });
}
