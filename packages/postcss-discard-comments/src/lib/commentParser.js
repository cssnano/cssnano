export default function commentParser (input) {
    const tokens = [];
    const length = input.length;
    let pos = 0;
    let next;

    while (pos < length) {
        next = input.indexOf('/*', pos);

        if (~next) {
            tokens.push({
                type: 'other',
                value: input.slice(pos, next),
            });
            pos = next;

            next = input.indexOf('*/', pos + 2);
            tokens.push({
                type: 'comment',
                value: input.slice(pos + 2, next),
            });
            pos = next + 2;
        } else {
            tokens.push({
                type: 'other',
                value: input.slice(pos),
            });
            pos = length;
        }
    }

    return tokens;
};
