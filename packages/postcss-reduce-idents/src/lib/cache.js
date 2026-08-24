export default (function (value, encoder, cache) {
  if (cache.has(value)) {
    return;
  }

  cache.set(value, {
    ident: encoder(value, cache.size),
    count: 0,
  });
});
