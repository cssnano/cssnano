// Functions here run inside the Chromium page, sent as source text through
// Function.toString(). Each must be self-contained: no imports, no closures
// over module scope, and only page globals.

/**
 * @typedef {{input: string, output: string}} Pair
 */

/**
 * Runs in the page. Builds one host element per oracle element, so the
 * browser and the oracle see the same document; `::before` is read from its
 * host. Elements inside a `div` share one plain wrapper, which matches the
 * same rules as the oracle's bare `div`.
 *
 * @param {{name: string, tag: string, classes: string[], id: boolean, inDiv: boolean, pseudo: boolean}[]} hosts
 */
export function buildFixture(hosts) {
  const doc = globalThis.document;
  doc.head.innerHTML = '<style id="sheet"></style>';
  doc.body.innerHTML = '<div id="wrapper"></div>';
  const wrapper = doc.querySelector('#wrapper');
  wrapper.removeAttribute('id');
  for (const host of hosts) {
    if (host.pseudo) continue;
    const node = doc.createElement(host.tag);
    node.className = host.classes.join(' ');
    if (host.id) node.id = 'i';
    node.dataset.name = host.name;
    (host.inDiv ? wrapper : doc.body).append(node);
  }
}

/**
 * Runs in the page. For each pair, reads the computed value of every
 * longhand either stylesheet declares, plus `direction`, on every element and
 * `::before`, and returns the first difference per pair and environment.
 *
 * @param {{pairs: Pair[], environments: {writingMode: string, direction: string}[]}} options
 */
export function pageDifferences({ pairs, environments }) {
  const doc = globalThis.document;
  const style = doc.querySelector('#sheet');
  const hosts = [...doc.querySelectorAll('[data-name]')];
  const targets = hosts.flatMap((host) => [
    { host, pseudo: null, name: host.dataset.name },
    { host, pseudo: '::before', name: `${host.dataset.name}::before` },
  ]);
  // The browser's own expansion of the declarations it accepted, so a
  // shorthand reads as the longhands it sets and a dropped one reads as none.
  const declaredLonghands = (css, found) => {
    style.textContent = css;
    const rules = [...style.sheet.cssRules];
    while (rules.length > 0) {
      const rule = rules.pop();
      if (rule.style) for (const property of rule.style) found.add(property);
      if (rule.cssRules) rules.push(...rule.cssRules);
    }
  };
  const read = (css, properties) => {
    style.textContent = css;
    return targets.flatMap(({ host, pseudo }) => {
      const computed = globalThis.getComputedStyle(host, pseudo);
      return properties.map((property) => computed.getPropertyValue(property));
    });
  };
  const differences = [];
  try {
    for (const [index, { input, output }] of pairs.entries()) {
      const found = new Set(['direction']);
      declaredLonghands(input, found);
      declaredLonghands(output, found);
      const properties = [...found];
      for (const { writingMode, direction } of environments) {
        doc.documentElement.style.writingMode = writingMode;
        doc.documentElement.dir = direction;
        const before = read(input, properties);
        const after = read(output, properties);
        const slot = before.findIndex((value, i) => value !== after[i]);
        if (slot === -1) continue;
        differences.push({
          index,
          writingMode,
          direction,
          element: targets[Math.trunc(slot / properties.length)].name,
          property: properties[slot % properties.length],
          before: before[slot],
          after: after[slot],
        });
      }
    }
  } finally {
    // Even after an error, leave the shared page as loadFixture built it.
    doc.documentElement.style.writingMode = '';
    doc.documentElement.dir = '';
  }
  return differences;
}
