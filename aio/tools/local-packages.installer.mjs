import fs from "node:fs";
import shelljs from "shelljs";
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANGULAR_ROOT_DIR = path.resolve(__dirname, '../..');
const ANGULAR_DIST_PACKAGES_DIR = path.join(ANGULAR_ROOT_DIR, 'dist/packages-dist');
const AIMWA_DIST_PACKAGES_DIR = path.join(ANGULAR_ROOT_DIR, 'dist/angular-in-memory-web-api-dist');
const ZONEJS_DIST_PACKAGES_DIR = path.join(ANGULAR_ROOT_DIR, 'dist/zone.js-dist');

const PACKAGE_JSON_PATH = process.argv[2];
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, {encoding: "utf-8"}));

const PACKAGE_JSON = 'package.json';
// const YARN_LOCK = 'yarn.lock';
// const LOCAL_MARKER_PATH = 'node_modules/_local_.json';


shelljs.exec(`${process.execPath} ${path.join(__dirname, "..", "..", "scripts", "build", "build-packages-dist.js")}`);
// const pkgs = buildTargetPackages("dist/packages-dist", false) + buildAngularInMemoryWebApiPackage('dist/angular-in-memory-web-api-dist', false) + buildZoneJsPackage('dist/zone.js-dist', false);
const pkgs = _getDistPackages();

Object.keys(pkgs).forEach(pkg => {
    packageJson.resolutions = packageJson.resolutions || {};
    packageJson.resolutions[`**/${pkg}`] = `file:${pkgs[pkg].packageDir}`;

    if (packageJson.dependencies?.[pkg]) {
        packageJson.dependencies[pkg] = `file:${pkgs[pkg].packageDir}`;
    }

    if (packageJson.devDependencies?.[pkg]) {
        packageJson.devDependencies[pkg] = `file:${pkgs[pkg].packageDir}`;
    }

    if (packageJson.peerDependencies?.[pkg]) {
        packageJson.peerDependencies[pkg] = `file:${pkgs[pkg].packageDir}`;
    }
});

fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, undefined, 2), {encoding: "utf-8"});

function _getDistPackages() {
    // this._log(`Distributable directory for Angular framework: ${ANGULAR_DIST_PACKAGES_DIR}`);
    // this._log(`Distributable directory for angular-in-memory-web-api: ${AIMWA_DIST_PACKAGES_DIR}`);
    // this._log(`Distributable directory for zone.js: ${ZONEJS_DIST_PACKAGES_DIR}`);

    // if (this.buildPackages) {
    //     this._buildDistPackages();
    // }

    const collectPackages = containingDir => {
        const packages = {};

        for (const dirName of shelljs.ls(containingDir)) {
        const packageDir = path.resolve(containingDir, dirName);
        const packageJsonPath = path.join(packageDir, PACKAGE_JSON);
        const packageConfig = fs.existsSync(packageJsonPath) ? JSON.parse(fs.readFileSync(packageJsonPath, {encoding: "utf-8"})) : null;
        const packageName = packageConfig && packageConfig.name;

        if (!packageConfig) {
            // No `package.json` found - this directory is not a package.
            continue;
        } else if (!packageName) {
            // No `name` property in `package.json`. (This should never happen.)
            throw new Error(`Package '${packageDir}' specifies no name in its '${PACKAGE_JSON}'.`);
        }

        packages[packageName] = {
            packageDir,
            packageJsonPath,
            config: packageConfig,
        };
        }

        return packages;
    };

    const packageConfigs = {
        ...collectPackages(ANGULAR_DIST_PACKAGES_DIR),
        ...collectPackages(AIMWA_DIST_PACKAGES_DIR),
        ...collectPackages(ZONEJS_DIST_PACKAGES_DIR),
    };

    // this._log('Found the following Angular distributables:', ...Object.keys(packageConfigs).map(key => `\n - ${key}`));
    return packageConfigs;
}