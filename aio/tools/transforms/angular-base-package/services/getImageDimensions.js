const { resolve } = require('canonical-path');
const sizeOf = require('image-size');

module.exports = function getImageDimensions() {
  return (basePath, bazelOutPath, path) => {
    try {
      return sizeOf(resolve(basePath, path));
    } catch (e) {
      return sizeOf(resolve(bazelOutPath, path));
    }
  };
};
