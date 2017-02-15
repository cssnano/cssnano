import decamelize from 'decamelize';

function bracketize (num) {
    return ' (' + num + ')';
}

export default function specName (testFile) {
    return 'should ' + decamelize(testFile, ' ').replace(/\d/g, bracketize);
}
