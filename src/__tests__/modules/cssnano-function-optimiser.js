module.exports.name = 'cssnano/function-optimiser';
module.exports.tests = [{
    message: 'should trim whitespace from nested functions',
    fixture: 'h1{width:calc(10px - ( 100px / 2em ))}',
    expected: 'h1{width:calc(10px - (100px / 2em))}',
}];
