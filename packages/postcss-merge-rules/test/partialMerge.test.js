import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should perform partial merging of selectors',
  processCSS(
    'h1{color:red}h2{color:red;text-decoration:underline}',
    'h1,h2{color:red}h2{text-decoration:underline}'
  )
);

test(
  'should perform partial merging of selectors (2)',
  processCSS(
    'h1{color:red}h2{color:red;text-decoration:underline}h3{color:green;text-decoration:underline}',
    'h1,h2{color:red}h2,h3{text-decoration:underline}h3{color:green}'
  )
);

test(
  'should perform partial merging of selectors (3)',
  processCSS(
    'h1{color:red;text-decoration:underline}h2{text-decoration:underline;color:green}h3{font-weight:bold;color:green}',
    'h1{color:red}h1,h2{text-decoration:underline}h2,h3{color:green}h3{font-weight:bold}'
  )
);

test(
  'should perform partial merging of selectors (4)',
  processCSS(
    '.test0{color:red;border:none;margin:0}.test1{color:green;border:none;margin:0}',
    '.test0{color:red}.test0,.test1{border:none;margin:0}.test1{color:green}'
  )
);

test(
  'should perform partial merging of selectors (5)',
  processCSS(
    'h1{color:red;font-weight:bold}h2{font-weight:bold}h3{text-decoration:none}',
    'h1{color:red}h1,h2{font-weight:bold}h3{text-decoration:none}'
  )
);

test(
  'should perform partial merging of selectors (6)',
  processCSS(
    '.test-1,.test-2{margin-top:10px}.another-test{margin-top:10px;margin-bottom:30px}',
    '.test-1,.test-2,.another-test{margin-top:10px}.another-test{margin-bottom:30px}'
  )
);

test(
  'should perform partial merging of selectors (7)',
  processCSS(
    '.test-1{margin-top:10px;margin-bottom:20px}.test-2{margin-top:10px}.another-test{margin-top:10px;margin-bottom:30px}',
    '.test-1{margin-bottom:20px}.test-1,.test-2,.another-test{margin-top:10px}.another-test{margin-bottom:30px}'
  )
);

test(
  'should perform partial merging of selectors (8)',
  processCSS(
    '.foo{margin:0;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;margin:0}',
    '.foo{margin:0}.foo,.barim{display:block}.barim{line-height:1}.bazaz{font-size:3em;margin:0}'
  )
);

test(
  'should not merge over-eagerly (cssnano#36 [case 3])',
  passthroughCSS(
    '.foobam{font-family:serif;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;font-family:serif}'
  )
);

test(
  'should not merge over-eagerly (cssnano#36 [case 4])',
  processCSS(
    '.foo{font-family:serif;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;font-family:serif}',
    '.foo{font-family:serif}.foo,.barim{display:block}.barim{line-height:1}.bazaz{font-size:3em;font-family:serif}'
  )
);

test(
  'should merge multiple values (cssnano#49)',
  processCSS(
    'h1{border:1px solid red;background-color:red;background-position:50% 100%}h1{border:1px solid red;background-color:red}h1{border:1px solid red}',
    'h1{border:1px solid red;background-color:red;background-position:50% 100%}'
  )
);

test(
  'should deterministically prefer the smaller opposite-direction partial merge',
  processCSS(
    'h1{color:black}h2{color:black;font-weight:bold}h3{color:black;font-weight:bold}',
    'h1,h2,h3{color:black}h2,h3{font-weight:bold}'
  )
);

test('should converge after a greedy worklist pass', async () => {
  const first = await postcss([plugin]).process(
    'h1{color:black}h2{color:black;font-weight:bold}h3{color:black;font-weight:bold}',
    { from: undefined }
  );
  const second = await postcss([plugin]).process(first.css, {
    from: undefined,
  });

  assert.equal(second.css, first.css);
});

test(
  'should prioritize the merge with the greatest shared-declaration benefit',
  processCSS(
    '@media x{.a{margin:1px;}}.b{margin:blue;color:1px;}.d{display:1px;margin:1px;}.d{color:1px;color:blue;}.d{color:1px;}',
    '@media x{.a{margin:1px;}}.b{margin:blue;}.b,.d{color:1px;}.d{display:1px;margin:1px;color:blue;}'
  )
);

test(
  'should revisit a predecessor after replacing an adjacent pair',
  processCSS(
    '.a,.b{x:1}.a{color:red}.b{color:red;background:blue}',
    '.a,.b{x:1;color:red}.b{background:blue}'
  )
);

test(
  'should not perform partial merging of selectors if the output would be longer',
  passthroughCSS(
    '.test0{color:red;border:none;margin:0}.longlonglonglong{color:green;border:none;margin:0}'
  )
);

test(
  'should not destroy any declarations when merging',
  processCSS(
    '.a{background-color:#fff}.a{background-color:#717F83;color:#fff}',
    '.a{background-color:#fff;background-color:#717F83;color:#fff}'
  )
);
