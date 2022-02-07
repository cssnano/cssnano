'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const sameParent = require('../src/sameParent.js');

test('should calculate same parent', () => {
  return postcss()
    .process('h1 {} h2 {}', { from: undefined, hideNothingWarning: true })
    .then((result) => {
      const h1 = result.root.nodes[0];
      const h2 = result.root.nodes[1];

      assert.is(sameParent(h1, h2), true);
    });
});

test('should calculate same parent (detached nodes)', () => {
  return postcss()
    .process('h1 {} h2 {}', { from: undefined, hideNothingWarning: true })
    .then((result) => {
      const h1 = result.root.nodes[0];
      const h2 = result.root.nodes[1];

      h1.remove();
      h2.remove();

      assert.is(sameParent(h1, h2), true);
    });
});

test('should calculate same parent (at rules)', () => {
  return postcss()
    .process('@media screen{h1 {} h2 {}}', {
      from: undefined,
      hideNothingWarning: true,
    })
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[0].nodes[1];

      assert.is(sameParent(h1, h2), true);
    });
});

test('should calculate same parent (multiple at rules)', () => {
  return postcss()
    .process('@media screen{h1 {}} @media screen{h2 {}}', {
      from: undefined,
      hideNothingWarning: true,
    })
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0];

      assert.is(sameParent(h1, h2), true);
    });
});

test('should calculate same parent (multiple at rules (uppercase))', () => {
  return postcss()
    .process('@media screen{h1 {}} @MEDIA screen{h2 {}}', {
      from: undefined,
      hideNothingWarning: true,
    })
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0];

      assert.is(sameParent(h1, h2), true);
    });
});

test('should calculate same parent (nested at rules)', () => {
  return postcss()
    .process(
      `
        @media screen {
            @supports(pointer: course) {
                h1 {}
            }
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
      { from: undefined, hideNothingWarning: true }
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];

      assert.is(sameParent(h1, h2), true);
    });
});

test('should calculate not same parent (nested at rules)', () => {
  return postcss()
    .process(
      `
        @media screen {
            @supports(pointer: fine) {
                h1 {}
            }
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
      { from: undefined, hideNothingWarning: true }
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];

      assert.is.not(sameParent(h1, h2), true);
    });
});

test('should calculate not same parent (nested at rules) (2)', () => {
  return postcss()
    .process(
      `
        @media print {
            @supports(pointer: course) {
                h1 {}
            }
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
      { from: undefined, hideNothingWarning: true }
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];

      assert.is.not(sameParent(h1, h2), true);
    });
});

test('should calculate not same parent (nested at rules) (3)', () => {
  return postcss()
    .process(
      `
        @supports(pointer: course) {
            h1 {}
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
      { from: undefined, hideNothingWarning: true }
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];

      assert.is.not(sameParent(h1, h2), true);
    });
});

test('should calculate not same parent (nested at rules) (4)', () => {
  return postcss()
    .process(
      `
        @media screen {
            h1 {}
        }
        @media screen {
            @supports(pointer: course) {
                h2 {}
            }
        }
    `,
      { from: undefined, hideNothingWarning: true }
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];

      assert.is.not(sameParent(h1, h2), true);
    });
});
test.run();
