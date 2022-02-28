const { resolve } = require('canonical-path');
const sizeOf = require('image-size');

module.exports = function getImageDimensions() {
  // TODO: Use only one path after bazel flip. Need two paths currently
  // to support legacy build alongside bazel.
  return (basePath, bazelOutPath, path) => {
    try {
      return sizeOf(resolve(basePath, path));
    } catch (e) {
      if (bazelOutPath) {
        return sizeOf(resolve(bazelOutPath, path));
      }
      throw e;
    }
  };
};
