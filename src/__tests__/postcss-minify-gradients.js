import test from 'ava';
import processCss from './_processCss';

test(
    'linear: should convert "to top" to 0deg',
    processCss,
    'background:linear-gradient(to top,#ffe500,#121)',
    'background:linear-gradient(0deg,#ffe500,#121)',
);

test(
    'linear: should convert "to right" to 90deg',
    processCss,
    'background:linear-gradient(to right,#ffe500,#121)',
    'background:linear-gradient(90deg,#ffe500,#121)',
);

test(
    'linear: should convert "to bottom" to 180deg',
    processCss,
    'background:linear-gradient(to bottom,#ffe500,#121)',
    'background:linear-gradient(180deg,#ffe500,#121)',
);

test(
    'linear: should convert "to left" to 270deg',
    processCss,
    'background:linear-gradient(to left,#ffe500,#121)',
    'background:linear-gradient(270deg,#ffe500,#121)',
);

test(
    'repeating-linear: should convert "to top" to 0deg',
    processCss,
    'background:repeating-linear-gradient(to top,#ffe500,#121)',
    'background:repeating-linear-gradient(0deg,#ffe500,#121)',
);

test(
    'repeating-linear: should convert "to right" to 90deg',
    processCss,
    'background:repeating-linear-gradient(to right,#ffe500,#121)',
    'background:repeating-linear-gradient(90deg,#ffe500,#121)',
);

test(
    'repeating-linear: should convert "to bottom" to 180deg',
    processCss,
    'background:repeating-linear-gradient(to bottom,#ffe500,#121)',
    'background:repeating-linear-gradient(180deg,#ffe500,#121)',
);

test(
    'repeating-linear: should convert "to left" to 270deg',
    processCss,
    'background:repeating-linear-gradient(to left,#ffe500,#121)',
    'background:repeating-linear-gradient(270deg,#ffe500,#121)',
);

test(
    'linear: should not convert "to top right" to an angle',
    processCss,
    'background:linear-gradient(to top right,#ffe500,#121)',
    'background:linear-gradient(to top right,#ffe500,#121)',
);

test(
    'linear: should not convert "to bottom left" to an angle',
    processCss,
    'background:linear-gradient(to bottom left,#ffe500,#121)',
    'background:linear-gradient(to bottom left,#ffe500,#121)',
);

test(
    'linear: should reduce length values if they are the same',
    processCss,
    'background:linear-gradient(45deg,#ffe500 50%,#121 50%)',
    'background:linear-gradient(45deg,#ffe500 50%,#121 0)',
);

test(
    'linear: should reduce length values if they are less',
    processCss,
    'background:linear-gradient(45deg,#ffe500 50%,#121 25%)',
    'background:linear-gradient(45deg,#ffe500 50%,#121 0)',
);

test(
    'linear: should not reduce length values with different units',
    processCss,
    'background:linear-gradient(45deg,#ffe500 25px,#121 20%)',
    'background:linear-gradient(45deg,#ffe500 25px,#121 20%)',
);

test(
    'linear: should remove the (unnecessary) start/end length values',
    processCss,
    'background:linear-gradient(#ffe500 0%,#121 100%)',
    'background:linear-gradient(#ffe500,#121)',
);

test(
    'repeating-radial: should reduce length values if they are the same',
    processCss,
    'background:repeating-radial-gradient(#121,#121 5px,#ffe500 5px,#ffe500 10px)',
    'background:repeating-radial-gradient(#121,#121 5px,#ffe500 0,#ffe500 10px)',
);
