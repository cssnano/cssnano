import test from 'ava';
import processCss from './_processCss';

test(
    'should shorten matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) to matrix(a, b, c, d, tx, ty)',
    processCss,
    'h1{transform:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}',
    'h1{transform:matrix(20,20,40,40,80,80)}',
);

test(
    'should shorten rotateZ to rotate',
    processCss,
    'h1{transform:rotateZ(180deg)}',
    'h1{transform:rotate(180deg)}',
);

test(
    'should shorten rotate3d(1, 0, 0, a) to rotateX(a)',
    processCss,
    'h1{transform:rotate3d(1, 0, 0, 20deg)}',
    'h1{transform:rotateX(20deg)}',
);

test(
    'should shorten rotate3d(0, 1, 0, a) to rotateY(a)',
    processCss,
    'h1{transform:rotate3d(0, 1, 0, 20deg)}',
    'h1{transform:rotateY(20deg)}',
);

test(
    'should shorten rotate3d(0, 0, 1, a) to rotate(a)',
    processCss,
    'h1{transform:rotate3d(0, 0, 1, 20deg)}',
    'h1{transform:rotate(20deg)}',
);

test(
    'should shorten scale(sx, sy) to scale(sx)',
    processCss,
    'h1{transform:scale(1.5, 1.5)}',
    'h1{transform:scale(1.5)}',
);

test(
    'should shorten scale(sx, 1) to scaleX(sx)',
    processCss,
    'h1{transform:scale(1.5, 1)}',
    'h1{transform:scaleX(1.5)}',
);

test(
    'should shorten scale(1, sy) to scaleY(sy)',
    processCss,
    'h1{transform:scale(1, 1.5)}',
    'h1{transform:scaleY(1.5)}',
);

test(
    'should shorten scale3d(sx, 1, 1) to scaleX(sx)',
    processCss,
    'h1{transform:scale(1.5, 1, 1)}',
    'h1{transform:scaleX(1.5)}',
);

test(
    'should shorten scale3d(1, sy, 1) to scaleY(sy)',
    processCss,
    'h1{transform:scale(1, 1.5, 1)}',
    'h1{transform:scaleY(1.5)}',
);

test(
    'should shorten scale3d(1, 1, sz) to scaleZ(sz)',
    processCss,
    'h1{transform:scale3d(1, 1, 1.5)}',
    'h1{transform:scaleZ(1.5)}',
);

test(
    'should not shorten translate(tx, ty) to translate(tx)',
    processCss,
    'h1{transform:translate(5, 5)}',
    'h1{transform:translate(5,5)}',
);

test(
    'should shorten translate(tx, 0) to translate(tx)',
    processCss,
    'h1{transform:translate(5, 0)}',
    'h1{transform:translate(5)}',
);

test(
    'should shorten translate(0, ty) to translateY(ty)',
    processCss,
    'h1{transform:translate(0, 5)}',
    'h1{transform:translateY(5)}',
);

test(
    'should shorten translate3d(0, 0, tz) to translateZ(tz)',
    processCss,
    'h1{transform:translate3d(0, 0, 2)}',
    'h1{transform:translateZ(2)}',
);

test(
    'should work with vendor prefixes',
    processCss,
    'h1{-webkit-transform:translate3d(0, 0, 0)}',
    'h1{-webkit-transform:translateZ(0)}',
);
