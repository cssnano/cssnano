import test from 'ava';
import {integrationTests} from '../../../../util/testHelpers.js';
import preset from '..';

test(
    integrationTests,
    preset,
    `${__dirname}/integrations`
);
