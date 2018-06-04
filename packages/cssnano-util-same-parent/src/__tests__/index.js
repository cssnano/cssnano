import test from 'ava';
import postcss from 'postcss';
import sameParent from '..';

test('should calculate same parent', t => {
    return postcss().process('h1 {} h2 {}').then(result => {
        const h1 = result.root.nodes[0];
        const h2 = result.root.nodes[1];

        t.true(sameParent(h1, h2));
    });
});

test('should calculate same parent (detached nodes)', t => {
    return postcss().process('h1 {} h2 {}').then(result => {
        const h1 = result.root.nodes[0];
        const h2 = result.root.nodes[1];

        h1.remove();
        h2.remove();

        t.true(sameParent(h1, h2));
    });
});

test('should calculate same parent (at rules)', t => {
    return postcss().process('@media screen{h1 {} h2 {}}').then(result => {
        const h1 = result.root.nodes[0].nodes[0];
        const h2 = result.root.nodes[0].nodes[1];

        t.true(sameParent(h1, h2));
    });
});
