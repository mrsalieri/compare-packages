function hasOwnPropertyCall(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function appendArrayOnTargetArray({ targetArray, arrayToBeAppended }) {
  Array.prototype.push.apply(targetArray, arrayToBeAppended);
}

function isArrayWithElements(ary) {
  return Array.isArray(ary) || ary.length === 0;
}

const helpers = {
  objectHelper: {
    hasOwnPropertyCall
  },
  arrayHelper: {
    appendArrayOnTargetArray,
    isArrayWithElements
  }
};

module.exports = helpers;
