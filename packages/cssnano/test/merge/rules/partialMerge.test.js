import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../../../util/testHelpers.js';
import { onlyTransform } from '../onlyTransform.js';
const plugin = onlyTransform(['mergeRules']);

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
    '.foo,.bazaz{margin:0}.foo,.barim{display:block}.barim{line-height:1}.bazaz{font-size:3em}'
  )
);

test(
  'should keep a profitable adjacent merge when the higher-benefit merge is unprofitable',
  processCSS(
    '.a{color:red}.b{color:red;font-weight:bold}.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx{color:red;font-weight:bold;p0:v}',
    '.a,.b{color:red}.b{font-weight:bold}.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx{color:red;font-weight:bold;p0:v}'
  )
);

test('should converge after partial merging duplicate declarations', async () => {
  const input =
    '.a{color:red;color:red}.b{color:red;font-weight:bold}.c{color:red;font-weight:bold}';
  const first = await postcss([plugin]).process(input, {
    from: undefined,
  });
  const second = await postcss([plugin]).process(first.css, {
    from: undefined,
  });

  assert.equal(
    first.css,
    '.a{color:red;color:red}.b,.c{color:red;font-weight:bold}'
  );
  assert.equal(second.css, first.css);
});

test(
  'should expose partial-merge edges after equivalent at-rule parents are combined',
  processCSS(
    '@media x{.a{color:red}}@media x{.b{color:red;font-weight:bold}}@media x{.c{font-weight:bold;background:blue}}',
    '@media x{.a,.b{color:red}.b,.c{font-weight:bold}.c{background:blue}}'
  )
);

test(
  'should not merge over-eagerly (cssnano#36 [case 3])',
  passthroughCSS(
    '.foobam{font-family:serif;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;font-family:serif}'
  )
);

test(
  'should split shared declarations into one rule per selector set without duplicating any (cssnano#36 [case 4])',
  processCSS(
    '.foo{font-family:serif;display:block}.barim{display:block;line-height:1}.bazaz{font-size:3em;font-family:serif}',
    '.foo,.bazaz{font-family:serif}.foo,.barim{display:block}.barim{line-height:1}.bazaz{font-size:3em}'
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

test('should converge after a greedy merge pass', async () => {
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
    // The trailing `color:1px` of the last `.d` rule is required: the third
    // `.d` rule revives `color:1px` over the preceding `color:blue`, so
    // dropping it would invert the computed color from `1px` to `blue`.
    '@media x{.a{margin:1px;}}.b{margin:blue;}.b,.d{color:1px;}.d{display:1px;margin:1px;color:blue;color:1px;}'
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

test(
  'should perform partial merging when shared declarations differ only in property name case',
  processCSS(
    '.a{COLOR:red;font-size:12px}.b{color:red;background:blue}',
    '.a{font-size:12px}.a,.b{COLOR:red}.b{background:blue}'
  )
);

test(
  'should not hoist duplicate declarations from the first rule into the receiving block',
  passthroughCSS('.a{color:red;color:red}.b{color:red;background:blue}')
);

test(
  'should merge shared duplicate declarations alongside distinct declarations',
  processCSS(
    '.a{color:red;color:red;font-size:12px}.b{color:red;color:red;background:blue}',
    '.a{font-size:12px}.a,.b{color:red;color:red}.b{background:blue}'
  )
);

test(
  'should not hoist declarations across a case-differing all shorthand',
  passthroughCSS('.a{color:red}.b{color:red;ALL:initial}')
);

test(
  'should list a selector that both rules share once in the shared rule',
  processCSS(
    '.aaaa,.b{color:red;background:blue;margin:0}.aaaa,.c{color:red;background:blue;padding:0}',
    '.aaaa,.b{margin:0}.aaaa,.b,.c{color:red;background:blue}.aaaa,.c{padding:0}'
  )
);

test(
  'should count a shared selector once when it decides whether a partial merge pays',
  processCSS(
    '.aaaaaaaaaaaaaaaaaaaa,.b{color:red;background:blue;top:0;left:0;margin:0}.aaaaaaaaaaaaaaaaaaaa,.c{color:red;background:blue;top:0;left:0;padding:0}',
    '.aaaaaaaaaaaaaaaaaaaa,.b{margin:0}.aaaaaaaaaaaaaaaaaaaa,.b,.c{color:red;background:blue;top:0;left:0}.aaaaaaaaaaaaaaaaaaaa,.c{padding:0}'
  )
);

test(
  'should join a later rule to a shared rule whose selectors were deduplicated',
  processCSS(
    '.a,.b{color:red;margin:0}.a,.c{color:red;padding:0}.d{color:red;top:0}',
    '.a,.b{margin:0}.a,.b,.c,.d{color:red}.a,.c{padding:0}.d{top:0}'
  )
);
