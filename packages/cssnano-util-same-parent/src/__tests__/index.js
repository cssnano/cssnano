import test from 'ava';
import postcss from 'postcss';
import sameParent from '..';

test('should calculate same parent', (t) => {
  return postcss()
    .process('h1 {} h2 {}')
    .then((result) => {
      const h1 = result.root.nodes[0];
      const h2 = result.root.nodes[1];

      t.true(sameParent(h1, h2));
    });
});

test('should calculate same parent (detached nodes)', (t) => {
  return postcss()
    .process('h1 {} h2 {}')
    .then((result) => {
      const h1 = result.root.nodes[0];
      const h2 = result.root.nodes[1];

      h1.remove();
      h2.remove();

      t.true(sameParent(h1, h2));
    });
});

test('should calculate same parent (at rules)', (t) => {
  return postcss()
    .process('@media screen{h1 {} h2 {}}')
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[0].nodes[1];

      t.true(sameParent(h1, h2));
    });
});

test('should calculate same parent (multiple at rules)', (t) => {
  return postcss()
    .process('@media screen{h1 {}} @media screen{h2 {}}')
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0];

      t.true(sameParent(h1, h2));
    });
});

test('should calculate same parent (multiple at rules (uppercase))', (t) => {
  return postcss()
    .process('@media screen{h1 {}} @MEDIA screen{h2 {}}')
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0];

      t.true(sameParent(h1, h2));
    });
});

test('should calculate same parent (nested at rules)', (t) => {
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
    `
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];
      t.true(sameParent(h1, h2));
    });
});

test('should calculate not same parent (nested at rules)', (t) => {
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
    `
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];
      t.false(sameParent(h1, h2));
    });
});

test('should calculate not same parent (nested at rules) (2)', (t) => {
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
    `
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];
      t.false(sameParent(h1, h2));
    });
});

test('should calculate not same parent (nested at rules) (3)', (t) => {
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
    `
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];
      t.false(sameParent(h1, h2));
    });
});

test('should calculate not same parent (nested at rules) (4)', (t) => {
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
    `
    )
    .then((result) => {
      const h1 = result.root.nodes[0].nodes[0];
      const h2 = result.root.nodes[1].nodes[0].nodes[0];
      t.false(sameParent(h1, h2));
    });
});
