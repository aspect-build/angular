const { resolve } = require('path');
const { readdirSync } = require('fs');

// TODO: Remove non bazel build code paths after flip to bazel. Determine if
// bazel build by presence of BAZEL_DGENI_OUTPUT_PATH env var.
const IS_BAZEL_BUILD = !!process.env.BAZEL_DGENI_OUTPUT_PATH;
const BAZEL_DGENI_PATH = process.env.BAZEL_DGENI_OUTPUT_PATH;
const BAZEL_AIO_PATH = resolve(BAZEL_DGENI_PATH + "/../");

const PROJECT_ROOT = resolve(__dirname, '../../..');
const AIO_PATH = resolve(PROJECT_ROOT, 'aio');
const TEMPLATES_PATH = resolve(AIO_PATH, 'tools/transforms/templates');
const API_TEMPLATES_PATH = resolve(TEMPLATES_PATH, 'api');
const CONTENTS_PATH = resolve(AIO_PATH, 'content');
const GUIDE_EXAMPLES_PATH = resolve(CONTENTS_PATH, 'examples');
const SRC_PATH = resolve(AIO_PATH, 'src');
const OUTPUT_PATH = IS_BAZEL_BUILD ?  resolve(BAZEL_DGENI_PATH, "generated") : resolve(SRC_PATH, 'generated');
const DOCS_OUTPUT_PATH = resolve(OUTPUT_PATH, 'docs');
const API_SOURCE_PATH = resolve(PROJECT_ROOT, 'packages');

function requireFolder(dirname, folderPath) {
  const absolutePath = resolve(dirname, folderPath);
  return readdirSync(absolutePath)
    .filter(p => !/[._]spec\.js$/.test(p))  // ignore spec files
    .map(p => require(resolve(absolutePath, p)));
}
module.exports = { IS_BAZEL_BUILD, BAZEL_AIO_PATH, BAZEL_DGENI_PATH, PROJECT_ROOT, AIO_PATH, TEMPLATES_PATH, API_TEMPLATES_PATH, CONTENTS_PATH, GUIDE_EXAMPLES_PATH, SRC_PATH, OUTPUT_PATH, DOCS_OUTPUT_PATH, API_SOURCE_PATH, requireFolder };

