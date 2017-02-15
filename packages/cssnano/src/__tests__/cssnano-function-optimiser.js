import test from 'ava';
import processCss from './_processCss';

test(
    'should trim whitespace from nested functions',
    processCss,
    'h1{width:calc(10px - ( 100px / 2em ))}',
    'h1{width:calc(10px - (100px / 2em))}',
);
