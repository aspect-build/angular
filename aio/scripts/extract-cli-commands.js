const {resolve} = require('canonical-path');
const sh = require('shelljs');

const cliGitRef = process.argv[2] || 'master';  // Can be a branch, commit or tag.

// TODO: remove this flag and any non-bazel code paths after flip to bazel.
// Idenfity bazel build by presence of the output directory arg.
const isBazelBuild = process.argv.length > 3;

const outputPath = isBazelBuild
  ? process.argv[3]
  : resolve(require('../tools/transforms/config').CONTENTS_PATH, 'cli-src');

const pkgContent = JSON.stringify({
  dependencies: {
    '@angular/cli': `https://github.com/angular/cli-builds#${cliGitRef}`,
  },
}, null, 2);

sh.set('-e');
sh.cd(outputPath);
if (!isBazelBuild) { // Not needed on bazel build as it's not in source directory
  sh.exec('git clean -Xfd');
}
sh.echo(pkgContent).to('package.json');
sh.exec('yarn install --no-lockfile --non-interactive');
