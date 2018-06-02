import test from 'ava';
import postcss from 'postcss';
import sameParent from '..';

test('should calculate same parent', async t => {
    const result = await postcss().process('h1 {} h2 {}');

    const h1 = result.root.nodes[0];
    const h2 = result.root.nodes[1];

    t.true(sameParent(h1, h2));
});

test('should calculate same parent (detached nodes)', async t => {
    const result = await postcss().process('h1 {} h2 {}');
    const h1 = result.root.nodes[0];
    const h2 = result.root.nodes[1];

    h1.remove();
    h2.remove();

    t.true(sameParent(h1, h2));
});

test('should calculate same parent (at rules)', async t => {
    const result = await postcss().process('@media screen{h1 {} h2 {}}');
    const h1 = result.root.nodes[0].nodes[0];
    const h2 = result.root.nodes[0].nodes[1];

    t.true(sameParent(h1, h2));
});
