module.exports.name = 'cssnano/postcss-merge-longhand';
module.exports.tests = [{
    message: 'should merge margin values',
    fixture: 'h1{margin-top:10px;margin-right:20px;margin-bottom:30px;margin-left:40px}',
    expected: 'h1{margin:10px 20px 30px 40px}',
}, {
    message: 'should merge margin values with !important',
    fixture: 'h1{margin-top:10px!important;margin-right:20px!important;margin-bottom:30px!important;margin-left:40px!important}',
    expected: 'h1{margin:10px 20px 30px 40px!important}',
}, {
    message: 'should merge & then condense margin values',
    fixture: 'h1{margin-top:10px;margin-bottom:10px;margin-left:10px;margin-right:10px}',
    expected: 'h1{margin:10px}',
}, {
    message: 'should not merge margin values with mixed !important',
    fixture: 'h1{margin-top:10px!important;margin-right:20px;margin-bottom:30px!important;margin-left:40px}',
    expected: 'h1{margin-top:10px!important;margin-right:20px;margin-bottom:30px!important;margin-left:40px}',
}, {
    message: 'should merge padding values',
    fixture: 'h1{padding-top:10px;padding-right:20px;padding-bottom:30px;padding-left:40px}',
    expected: 'h1{padding:10px 20px 30px 40px}',
}, {
    message: 'should merge padding values with !important',
    fixture: 'h1{padding-top:10px!important;padding-right:20px!important;padding-bottom:30px!important;padding-left:40px!important}',
    expected: 'h1{padding:10px 20px 30px 40px!important}',
}, {
    message: 'should not merge padding values with mixed !important',
    fixture: 'h1{padding-top:10px!important;padding-right:20px;padding-bottom:30px!important;padding-left:40px}',
    expected: 'h1{padding-top:10px!important;padding-right:20px;padding-bottom:30px!important;padding-left:40px}',
}, {
    message: 'should merge identical border values',
    fixture: 'h1{border-top:1px solid #000;border-bottom:1px solid #000;border-left:1px solid #000;border-right:1px solid #000}',
    expected: 'h1{border:1px solid #000}',
}, {
    message: 'should merge identical border values with !important',
    fixture: 'h1{border-top:1px solid #000!important;border-bottom:1px solid #000!important;border-left:1px solid #000!important;border-right:1px solid #000!important}',
    expected: 'h1{border:1px solid #000!important}',
}, {
    message: 'should not merge identical border values with mixed !important',
    fixture: 'h1{border-top:1px solid #000;border-bottom:1px solid #000;border-left:1px solid #000!important;border-right:1px solid #000!important}',
    expected: 'h1{border-top:1px solid #000;border-bottom:1px solid #000;border-left:1px solid #000!important;border-right:1px solid #000!important}',
}, {
    message: 'should merge border values',
    fixture: 'h1{border-color:red;border-width:1px;border-style:dashed}',
    expected: 'h1{border:1px dashed red}',
}, {
    message: 'should merge border values with !important',
    fixture: 'h1{border-color:red!important;border-width:1px!important;border-style:dashed!important}',
    expected: 'h1{border:1px dashed red!important}',
}, {
    message: 'should merge border values with identical values for all sides',
    fixture: 'h1{border-color:red red red red;border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    expected: 'h1{border:1px solid red}',
}, {
    message: 'should merge border value shorthands',
    fixture: 'h1{border-color:red blue red blue;border-width:10px 20px 10px 20px;border-style:solid}',
    expected: 'h1{border-color:red blue;border-width:10px 20px;border-style:solid}',
}, {
    message: 'should not merge border values with mixed !important',
    fixture: 'h1{border-color:red;border-width:1px!important;border-style:dashed!important}',
    expected: 'h1{border-color:red;border-width:1px!important;border-style:dashed!important}',
}, {
    message: 'should not merge border values with more than 3 values',
    fixture: 'h1{border-color:red;border-width:1px 5px;border-style:dashed}',
    expected: 'h1{border-color:red;border-width:1px 5px;border-style:dashed}',
}, {
    message: 'should convert 4 values to 1',
    fixture: 'h1{margin:10px 10px 10px 10px}',
    expected: 'h1{margin:10px}',
}, {
    message: 'should convert 3 values to 1',
    fixture: 'h1{margin:10px 10px 10px}',
    expected: 'h1{margin:10px}',
}, {
    message: 'should convert 3 values to 2',
    fixture: 'h1{margin:10px 20px 10px}',
    expected: 'h1{margin:10px 20px}',
}, {
    message: 'should convert 2 values to 1',
    fixture: 'h1{margin:10px 10px}',
    expected: 'h1{margin:10px}',
}, {
    message: 'should convert 1 value to 1',
    fixture: 'h1{margin:10px}',
    expected: 'h1{margin:10px}',
}, {
    message: 'should convert 4 values to 2',
    fixture: 'h1{margin:10px 20px 10px 20px}',
    expected: 'h1{margin:10px 20px}',
}, {
    message: 'should convert 4 values to 3',
    fixture: 'h1{margin:10px 20px 30px 20px}',
    expected: 'h1{margin:10px 20px 30px}',
}, {
    message: 'should convert 4 values to 4',
    fixture: 'h1{margin:10px 20px 30px 40px}',
    expected: 'h1{margin:10px 20px 30px 40px}',
}];
