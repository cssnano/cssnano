function LayerCache(opts) {
  this._values = [];
  this._startIndex = opts.startIndex || 1;
}

/**
 * Returns an array containing the unique elements of the original array.
 */

function dedupe(array) {
  return array.filter((item, i) => {
    return i === array.indexOf(item);
  });
}

function ascending(a, b) {
  return a - b;
}

function reduceValues(list, value, index) {
  list[value] = index + this._startIndex;

  return list;
}

LayerCache.prototype._findValue = function(value) {
  if (Object.prototype.hasOwnProperty.call(this._values, value)) {
    return this._values[value];
  }

  return false;
};

LayerCache.prototype.optimizeValues = function() {
  this._values = dedupe(this._values)
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
