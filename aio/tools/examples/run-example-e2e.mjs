import path from 'canonical-path';
import {spawn} from 'cross-spawn';
import fs from 'fs-extra';
import {globbySync} from 'globby';
import shelljs from 'shelljs';
import treeKill from 'tree-kill';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers'

shelljs.set('-e');

// Resolve CHROME_BIN and CHROMEDRIVER_BIN from relative paths to absolute paths within the
// runfiles tree so that subprocesses spawned in a different working directory can still find them.
process.env.CHROME_BIN = path.resolve(process.env.CHROME_BIN);
process.env.CHROMEDRIVER_BIN = path.resolve(process.env.CHROMEDRIVER_BIN);

const {argv} = yargs(hideBin(process.argv));

const EXAMPLE_PATH = argv._[0]
const NODE_MODULES_PATH = argv._[1];
const NODE = process.execPath;
const VENDORED_YARN = path.resolve(argv._[2]);
const SJS_SPEC_FILENAME = 'e2e-spec.ts';
const CLI_SPEC_FILENAME = 'e2e/src/app.e2e-spec.ts';
const EXAMPLE_CONFIG_FILENAME = 'example-config.json';
const MAX_NO_OUTPUT_TIMEOUT = 1000 * 60 * 5;  // 5 minutes

/**
 * Run Protractor End-to-End Tests for Doc Samples
 *
 * Flags
 *  --retry to retry failed tests (useful for overcoming flakes)
 *    e.g. --retry 3  // To try each test up to 3 times.
 */
async function runE2e(examplePath, nodeModulesPath) {
  const maxAttempts = argv.retry || 1;
  try {
    examplePath = createCopyOfExampleForTest(examplePath);
    symlinkNodeModules(examplePath, nodeModulesPath);
  
    let testFn;
    if (isSystemJsTest(examplePath)) {
      testFn = () => runE2eTestsSystemJS(examplePath);
    } else if (isCliTest(examplePath)) {
      testFn = () => runE2eTestsCLI(examplePath);
    } else {
      throw new Error(`Unknown e2e test type for example ${path.basename(examplePath)}`);
    }
  
    await attempt(testFn, maxAttempts);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}

async function attempt(testFn, maxAttempts) {
  let attempts = 0;
  let passed = false;

  while (true) {
    attempts++;
    passed = await testFn();

    if (passed || (attempts >= maxAttempts)) break;
  }

  if (!passed) {
    throw new Error('Test failed');
  }
}

function createCopyOfExampleForTest(examplePath) {
  const testFolderName = "_test";

  if (!isRunningInBazelSandbox()) {
    // If we aren't running in the sandbox, then we need to make the folder in the output tree
    // writeable so that we can create a test subdirectory
    fs.chmodSync(examplePath, '755');
  }

  const testPath = path.join(examplePath, testFolderName);
  globbySync(["**", `!${testFolderName}`], {cwd: examplePath, dot: true}).forEach(file => {
    fs.copySync(path.join(examplePath, file), path.join(testPath, file))
  })

  return testPath;
}

function isSystemJsTest(examplePath) {
  return fs.existsSync(path.join(examplePath, SJS_SPEC_FILENAME));
}

function isCliTest(examplePath) {
  return fs.existsSync(path.join(examplePath, CLI_SPEC_FILENAME));
}

function runE2eTestsSystemJS(appDir) {
  const config = loadExampleConfig(appDir);

  const appBuildSpawnInfo = spawnExt(NODE, [VENDORED_YARN, config.build], {cwd: appDir});
  const appRunSpawnInfo = spawnExt(NODE, [VENDORED_YARN, config.run, '-s'], {cwd: appDir}, true);

  let run = runProtractorSystemJS(appBuildSpawnInfo.promise, appDir, appRunSpawnInfo);

  if (fs.existsSync(appDir + '/aot/index.html')) {
    run = run.then((ok) => ok && runProtractorAoT(appDir));
  }

  return run;
}

function runProtractorSystemJS(prepPromise, appDir, appRunSpawnInfo) {
  const specFilename = path.resolve(`${appDir}/${SJS_SPEC_FILENAME}`);
  return prepPromise
      .catch(() => {
        const emsg = `Application at ${appDir} failed to transpile.\n\n`;
        console.log(emsg);
        return Promise.reject(emsg);
      })
      .then(() => {
        let transpileError = false;

        // Start protractor.
        console.log(`\n\n=========== Running aio example tests for: ${appDir}`);
        const spawnInfo = spawnExt(NODE, [VENDORED_YARN, 'protractor'], {cwd: appDir});

        spawnInfo.proc.stderr.on('data', function(data) {
          transpileError = transpileError || /npm ERR! Exit status 100/.test(data.toString());
        });
        return spawnInfo.promise.catch(function() {
          if (transpileError) {
            const emsg = `${specFilename} failed to transpile.\n\n`;
            console.log(emsg);
          }
          return Promise.reject();
        });
      })
      .then(
        () => finish(appRunSpawnInfo.proc.pid, true),
        () => finish(appRunSpawnInfo.proc.pid, false)
      );
}

function finish(spawnProcId, ok) {
  // Ugh... proc.kill does not work properly on windows with child processes.
  // appRun.proc.kill();
  treeKill(spawnProcId);
  return ok
}

// Run e2e tests over the AOT build for projects that examples it.
function runProtractorAoT(appDir) {
  const aotBuildSpawnInfo = spawnExt(NODE, [VENDORED_YARN, 'build:aot'], {cwd: appDir});
  let promise = aotBuildSpawnInfo.promise;

  const copyFileCmd = 'copy-dist-files.js';
  if (fs.existsSync(appDir + '/' + copyFileCmd)) {
    promise = promise.then(() => spawnExt('node', [copyFileCmd], {cwd: appDir}).promise);
  }
  const aotRunSpawnInfo = spawnExt(NODE, [VENDORED_YARN, 'serve:aot'], {cwd: appDir}, true);
  return runProtractorSystemJS(promise, appDir, aotRunSpawnInfo);
}


function symlinkNodeModules(examplePath, nodeModulesPath) {
  fs.ensureSymlinkSync(nodeModulesPath, path.join(examplePath, "node_modules"));

  if (isRunningInBazelSandbox()) {
    // When running in sandboxed execution, the node_modules/.bin symlinks that are copied into the
    // sandbox base still point outside of the sandbox. nodejs_binary/test prevents escaping the sandbox,
    // so these symlinks need to be reconstructed to point to the correct bins within the sandbox.
    reconstructNodeModulesBinFolder(nodeModulesPath, path.join(examplePath, "node_modules"))
  }
}

function reconstructNodeModulesBinFolder(sourceNodeModules, destNodeModules) {
  fs.rmdirSync(path.join(destNodeModules, ".bin"), {recursive: true})

  const packages = globbySync([
    "@*/*",
    "!@*$", // Exclude a namespace folder itself//
    "(?!@)*",
    "!.bin",
    "!.yarn-integrity",
    "!_*"
  ], {cwd: sourceNodeModules, onlyDirectories: true, dot: true});

  fs.mkdirsSync(path.join(destNodeModules, ".bin"))

  packages.forEach(pkg => {
    const pkg_json = JSON.parse(fs.readFileSync(path.join(sourceNodeModules, pkg, "package.json"), "utf-8"));

    if (typeof pkg_json.bin === "string") {
        fs.ensureDirSync(path.dirname(path.join(destNodeModules, ".bin", pkg)));
        fs.writeFileSync(path.join(destNodeModules, ".bin", pkg), `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
exec node  "$basedir/../${path.join(pkg, pkg_json.bin)}" "$@"
        `)
        fs.chmodSync(path.join(destNodeModules, ".bin", pkg), "775")
    } else if (pkg_json.bin) {
      Object.entries(pkg_json.bin || {}).forEach(([entry, entryPath]) => {
          fs.writeFileSync(path.join(destNodeModules, ".bin", entry), `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
exec node  "$basedir/../${path.join(pkg, entryPath)}" "$@"
          `)
          fs.chmodSync(path.join(destNodeModules, ".bin", entry), "775")
      });
    }
  });
}

// Start the example in appDir; then run protractor with the specified
// fileName; then shut down the example.
// All protractor output is appended to the outputFile.
// CLI version
function runE2eTestsCLI(appDir) {
  console.log(`\n\n=========== Running aio example tests for: ${appDir}`);

  const config = loadExampleConfig(appDir);

  // Replace any calls with yarn (which requires yarn to be on the PATH) to instead call our vendored yarn
  if (config.tests) {
    for (let test of config.tests) {
      if (test.cmd === "yarn") {
        test.cmd = NODE;
        test.args = [VENDORED_YARN, ...test.args];
      }
    }
  }

  // `--no-webdriver-update` is needed to preserve the ChromeDriver version already installed.
  const testCommands = config.tests || [{
                        cmd: NODE,
                         args: [
                          VENDORED_YARN,
                           'e2e',
                           '--configuration=production',
                           '--protractor-config=e2e/protractor-bazel.conf.js',
                           '--no-webdriver-update',
                           '--port={PORT}',
                         ],
                       }];

  const e2eSpawnPromise = testCommands.reduce((prevSpawnPromise, {cmd, args}) => {
    // Replace the port placeholder with 0 to choose an available port so that tests
    // can be run concurrently.
    args = args.map(a => a.replace('{PORT}', 0));

    return prevSpawnPromise.then(() => {
      const currSpawn = spawnExt(
          cmd, args, {cwd: appDir}, false);
      return currSpawn.promise
        .then(() => finish(currSpawn.proc.pid, true))
        .catch(() => finish(currSpawn.proc.pid, false))
    });
  }, Promise.resolve());

  return e2eSpawnPromise;
}

// Returns both a promise and the spawned process so that it can be killed if needed.
function spawnExt(
    command, args, options, ignoreClose = false, printMessageFn = msg => process.stdout.write(msg)) {
  let proc = null;
  const promise = new Promise((resolveFn, rejectFn) => {
    let noOutputTimeoutId;
    const failDueToNoOutput = () => {
      treeKill(proc.id);
      reject(`No output after ${MAX_NO_OUTPUT_TIMEOUT}ms.`);
    };
    const printMessage = msg => {
      clearTimeout(noOutputTimeoutId);
      noOutputTimeoutId = setTimeout(failDueToNoOutput, MAX_NO_OUTPUT_TIMEOUT);
      return printMessageFn(msg);
    };
    const resolve = val => {
      clearTimeout(noOutputTimeoutId);
      resolveFn(val);
    };
    const reject = err => {
      clearTimeout(noOutputTimeoutId);
      rejectFn(err);
    };

    let descr = command + ' ' + args.join(' ');
    printMessage(`running: ${descr}\n`);
    try {
      proc = spawn(command, args, options);
    } catch (e) {
      console.log(e);
      return reject(e);
    }
    proc.stdout.on('data', printMessage);
    proc.stderr.on('data', printMessage);

    proc.on('close', function(returnCode) {
      printMessage(`completed: ${descr}\n\n`);
      // Many tasks (e.g., tsc) complete but are actually errors;
      // Confirm return code is zero.
      returnCode === 0 || ignoreClose ? resolve(0) : reject(returnCode);
    });
    proc.on('error', function(data) {
      printMessage(`completed with error: ${descr}\n\n`);
      printMessage(`${data.toString()}\n`);
      reject(data);
    });
  });
  return {proc, promise};
}

// Load configuration for an example. Used for SystemJS
function loadExampleConfig(exampleFolder) {
  // Default config.
  let config = {build: 'build', run: 'serve:e2e'};

  try {
    const exampleConfig = fs.readJsonSync(`${exampleFolder}/${EXAMPLE_CONFIG_FILENAME}`);
    Object.assign(config, exampleConfig);
  } catch (e) {
  }

  return config;
}

function isRunningInBazelSandbox() {
  const cwd = process.cwd();
  return cwd.includes("/linux-sandbox/") || cwd.includes("/darwin-sandbox/");
}

runE2e(EXAMPLE_PATH, NODE_MODULES_PATH);
