const encode = encodeURIComponent;

// A run of one or more contiguous %XX escapes is decoded as a unit so
// multi-byte UTF-8 sequences (e.g. %C3%A9) round-trip correctly. A run
// that isn't valid percent-encoding (e.g. it sits next to a bare `%`
// that isn't part of an escape, like `80%` in `rgb(0 0 0 / 80%)`) is
// left untouched instead of failing the whole string.
// See: https://github.com/cssnano/cssnano/issues/1961
function decode(str) {
  return str.replace(/(?:%[0-9a-fA-F]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}

export { encode, decode };
