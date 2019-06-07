import * as R from 'ramda';

const ascending = R.subtract;

function LayerCache(opts) {
  this._values = [];
  this._startIndex = opts.startIndex || 1;
}

function reduceValues(list, value, index) {
  list[value] = index + this._startIndex;

  return list;
}

LayerCache.prototype._findValue = function(value) {
  if (R.has(value, this._values)) {
    return this._values[value];
  }

  return false;
};

LayerCache.prototype.optimizeValues = function() {
  this._values = R.uniq(this._values)
    .sort(ascending)
    .reduce(reduceValues.bind(this), {});
};

LayerCache.prototype.addValue = function(value) {
  let parsedValue = parseInt(value, 10);

  // pass only valid values
  if (!parsedValue || parsedValue < 0) {
    return;
  }

  this._values.push(parsedValue);
};

LayerCache.prototype.getValue = function(value) {
  let parsedValue = parseInt(value, 10);

  return this._findValue(parsedValue) || value;
};

export default LayerCache;
