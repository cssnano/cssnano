export default function (value, encoder, cache) {
    if (cache[value]) {
        return;
    }
    cache[value] = {
        ident: encoder(value, Object.keys(cache).length),
        count: 0,
    };
}
