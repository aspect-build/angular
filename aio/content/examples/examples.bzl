load("@build_bazel_rules_nodejs//:index.bzl", "npm_package_bin")
load("@aspect_bazel_lib//lib:copy_to_directory.bzl", "copy_to_directory")
load("//aio/tools:defaults.bzl", "nodejs_test")
load("//:yarn.bzl", "YARN_LABEL")
load("//:packages.bzl", "ALL_PACKAGES", "to_package_label")

# This map controls which examples are included and whether or not to generate
# a stackblitz live examples and zip archives. Keys are the example name, and values
# take the form:
#
#    {"stackblitz": boolean, "zip": boolean}
#
# Set "stackblitz" to True to generate live examples from any stackblitz config files
# found in the example. Set "zip" to True to generate archives for any stackblitz or
# zipper configuration file found in the example.
#
# To ignore an example, comment out its row.

EXAMPLES = {
    "accessibility": {"stackblitz": True, "zip": True},
    "ajs-quick-reference": {"stackblitz": True, "zip": True},
    "angular-compiler-options": {"stackblitz": True, "zip": True},
    "animations": {"stackblitz": True, "zip": True},
    "architecture": {"stackblitz": True, "zip": True},
    "attribute-binding": {"stackblitz": True, "zip": True},
    "attribute-directives": {"stackblitz": True, "zip": True},
    "binding-syntax": {"stackblitz": True, "zip": True},
    "bootstrapping": {"stackblitz": True, "zip": True},
    "built-in-directives": {"stackblitz": True, "zip": True},
    "built-in-template-functions": {"stackblitz": True, "zip": True},
    "comparing-observables": {"stackblitz": False, "zip": False},
    "component-interaction": {"stackblitz": True, "zip": True},
    "component-overview": {"stackblitz": True, "zip": True},
    "component-styles": {"stackblitz": True, "zip": True},
    "content-projection": {"stackblitz": True, "zip": True},
    "dependency-injection": {"stackblitz": True, "zip": True},
    "dependency-injection-in-action": {"stackblitz": True, "zip": True},
    "deprecation-guide": {"stackblitz": True, "zip": True},
    "displaying-data": {"stackblitz": True, "zip": True},
    "docs-style-guide": {"stackblitz": True, "zip": True},
    "dynamic-component-loader": {"stackblitz": True, "zip": True},
    "dynamic-form": {"stackblitz": True, "zip": True},
    "elements": {"stackblitz": True, "zip": True},
    "event-binding": {"stackblitz": True, "zip": True},
    "feature-modules": {"stackblitz": True, "zip": True},
    "form-validation": {"stackblitz": True, "zip": True},
    "forms": {"stackblitz": True, "zip": True},
    "forms-overview": {"stackblitz": True, "zip": True},
    "getting-started": {"stackblitz": True, "zip": True},
    "getting-started-v0": {"stackblitz": True, "zip": True},
    "hierarchical-dependency-injection": {"stackblitz": True, "zip": True},
    "http": {"stackblitz": True, "zip": True},
    "i18n": {"stackblitz": True, "zip": True},
    "inputs-outputs": {"stackblitz": True, "zip": True},
    "interpolation": {"stackblitz": True, "zip": True},
    "lazy-loading-ngmodules": {"stackblitz": True, "zip": True},
    "lifecycle-hooks": {"stackblitz": True, "zip": True},
    "ngcontainer": {"stackblitz": True, "zip": True},
    "ngmodules": {"stackblitz": True, "zip": True},
    "observables": {"stackblitz": False, "zip": False},
    "observables-in-angular": {"stackblitz": False, "zip": False},
    "pipes": {"stackblitz": True, "zip": True},
    "practical-observable-usage": {"stackblitz": False, "zip": False},
    "property-binding": {"stackblitz": True, "zip": True},
    "providers": {"stackblitz": True, "zip": True},
    "providers-viewproviders": {"stackblitz": True, "zip": True},
    "reactive-forms": {"stackblitz": True, "zip": True},
    "resolution-modifiers": {"stackblitz": True, "zip": True},
    "router": {"stackblitz": True, "zip": True},
    "router-tutorial": {"stackblitz": True, "zip": True},
    "routing-with-urlmatcher": {"stackblitz": True, "zip": True},
    "rx-library": {"stackblitz": False, "zip": False},
    "schematics-for-libraries": {"stackblitz": False, "zip": True},
    "security": {"stackblitz": True, "zip": True},
    "service-worker-getting-started": {"stackblitz": False, "zip": False},
    "setup": {"stackblitz": False, "zip": False},
    "structural-directives": {"stackblitz": True, "zip": True},
    "styleguide": {"stackblitz": False, "zip": False},
    "template-expression-operators": {"stackblitz": True, "zip": True},
    "template-reference-variables": {"stackblitz": True, "zip": True},
    "template-syntax": {"stackblitz": True, "zip": True},
    "testing": {"stackblitz": True, "zip": True},
    "toh-pt0": {"stackblitz": True, "zip": True},
    "toh-pt1": {"stackblitz": True, "zip": True},
    "toh-pt2": {"stackblitz": True, "zip": True},
    "toh-pt3": {"stackblitz": True, "zip": True},
    "toh-pt4": {"stackblitz": True, "zip": True},
    "toh-pt5": {"stackblitz": True, "zip": True},
    "toh-pt6": {"stackblitz": True, "zip": True},
    "two-way-binding": {"stackblitz": True, "zip": True},
    "universal": {"stackblitz": False, "zip": True},
    "upgrade-lazy-load-ajs": {"stackblitz": False, "zip": True},
    "upgrade-module": {"stackblitz": False, "zip": False},
    "upgrade-phonecat-1-typescript": {"stackblitz": False, "zip": False},
    "upgrade-phonecat-2-hybrid": {"stackblitz": False, "zip": False},
    "upgrade-phonecat-3-final": {"stackblitz": False, "zip": False},
    "user-input": {"stackblitz": True, "zip": True},
    "view-encapsulation": {"stackblitz": True, "zip": True},
    "what-is-angular": {"stackblitz": True, "zip": True},
}

def docs_example(name, test = True, test_tags = []):
    """Stamp targets for adding boilerplate to examples, creating live examples, and creating zips.

    Args:
        name: name of the example
        test: whether to run e2e tests
        test_tags: tags to add to e2e tests
    """
    if name not in EXAMPLES:
        # buildifier: disable=print
        print("WARNING: Example '%s' is being ignored. To include it, add an entry to the EXAMPLES map in aio/content/examples/examples.bzl." % name)
        return

    native.filegroup(
        name = "files",
        srcs = native.glob(["**"], exclude = ["BUILD.bazel"]),
    )

    # Generate example boilerplate
    npm_package_bin(
        name = "boilerplate",
        args = ["add", native.package_name()],
        env = {
            "BAZEL_EXAMPLE_BOILERPLATE_OUTPUT_PATH": "$(@D)",
        },
        data = [":files"],
        output_dir = True,
        tool = "//aio/tools/examples:example-boilerplate",
    )

    # Copy example files and boilerplate to the output tree
    copy_to_directory(
        name = name,
        # Prevent sorting so that boilerplate overwrites example sources
        # buildifier: do not sort
        srcs = [
            ":files",
            ":boilerplate",
        ],
        replace_prefixes = {
            "boilerplate": "",
            "aio/tools/examples/shared": "",
        },
        allow_overwrites = True,
    )

    stackblitz_configs = native.glob(["*stackblitz.json"])

    if EXAMPLES[name]["stackblitz"] and len(stackblitz_configs) > 0:
        # Generate stackblitz live example(s)
        outs = [file_name.replace(".json", ".html") for file_name in stackblitz_configs]
        npm_package_bin(
            name = "stackblitz",
            args = [
                "$(execpath :%s)" % name,
                "$(RULEDIR)",
            ],
            data = [":%s" % name],
            outs = outs,
            tool = "//aio/tools/stackblitz-builder:generate-stackblitz",
        )

    zip_configs = stackblitz_configs + native.glob(["zipper.json"])

    if EXAMPLES[name]["zip"] and len(zip_configs) > 0:
        # Generate example zip(s)
        outs = [file_name.replace("stackblitz", name).replace("zipper", name).replace(".json", ".zip") for file_name in zip_configs]
        npm_package_bin(
            name = "example-zip",
            args = [
                "$(execpath :%s)" % name,
                "$(RULEDIR)",
            ],
            data = [":%s" % name],
            outs = outs,
            tool = "//aio/tools/example-zipper:generate-example-zip",
        )

    if test:
        # # These node_modules deps are symlinked into each example. These tree
        # # artifact folder names must still be "node_modules" despite the symlink
        # # being named node_modules. Otherwise, some deps will fail to resolve.
        # node_modules_deps = {
        #     "local": "//aio/tools/examples/shared:local/node_modules",
        #     "npm": "//aio/tools/examples/shared:node_modules",
        # }

        # Keep in sync with aio/tools/examples/shared/package.json
        TEST_DEPS = [
            "@angular/animations",
            "@angular/common",
            "@angular/compiler",
            "@angular/core",
            "@angular/elements",
            "@angular/forms",
            "@angular/localize",
            "@angular/platform-browser",
            "@angular/platform-browser-dynamic",
            "@angular/platform-server",
            "@angular/router",
            "@angular/service-worker",
            "@angular/upgrade",
            "@nguniversal/express-engine",
            "angular",
            "angular-in-memory-web-api",
            "angular-route",
            "core-js",
            "express",
            "rxjs",
            "systemjs",
            "systemjs-plugin-babel",
            "tslib",
            "zone.js",
            "@angular-devkit/build-angular",
            "@angular/cli",
            "@angular/compiler-cli",
            "@nguniversal/builders",
            "@rollup/plugin-commonjs",
            "@rollup/plugin-node-resolve",
            "@types/angular",
            "@types/angular-animate",
            "@types/angular-mocks",
            "@types/angular-resource",
            "@types/angular-route",
            "@types/express",
            "@types/jasmine",
            "@types/jquery",
            "@types/node",
            "canonical-path",
            "concurrently",
            "copyfiles",
            "http-server",
            "jasmine-core",
            "jasmine-marbles",
            "jasmine-spec-reporter",
            "karma",
            "karma-chrome-launcher",
            "karma-coverage",
            "karma-jasmine",
            "karma-jasmine-html-reporter",
            "lite-server",
            "lodash",
            "protractor",
            "rimraf",
            "rollup",
            "rollup-plugin-terser",
            "source-map-explorer",
            "ts-node",
            "typescript",
        ]

        TEST_DEPS_ARGS = [(to_package_label(dep) if dep in ALL_PACKAGES else dep) for dep in TEST_DEPS]

        NPM_TEST_DEPS = ["@aio_example_deps//%s" % dep for dep in TEST_DEPS]
        LOCAL_TEST_DEPS = [to_package_label(dep) if dep in ALL_PACKAGES else ("@aio_example_deps//%s" % dep) for dep in TEST_DEPS]

        NPM_TEST_PKG_DEPS = [_pkg_json_label(dep) for dep in TEST_DEPS]
        LOCAL_TEST_PKG_DEPS = [(to_package_label(dep) if dep in ALL_PACKAGES else _pkg_json_label(dep)) for dep in TEST_DEPS]

        print(LOCAL_TEST_DEPS)

        # for [node_modules_source, node_modules_label] in node_modules_deps.items():
        nodejs_test(
            name = "e2e",  #_%s" % node_modules_source,
            data = [
                       ":%s" % name,
                       YARN_LABEL,
                       # node_modules_label,
                       "@aio_npm//@angular/dev-infra-private/bazel/browsers/chromium",
                       "//aio/tools/examples:run-example-e2e",
                   ] +
                   # select({
                   #     "//aio:aio_local_deps": LOCAL_TEST_PKG_DEPS,
                   #     "//conditions:default": NPM_TEST_PKG_DEPS,
                   # }) +
                   select({
                       "//aio:aio_local_deps": LOCAL_TEST_DEPS,
                       "//conditions:default": NPM_TEST_DEPS,
                   }),
            args = [
                "$(rootpath :%s)" % name,
                # "$(rootpath %s)" % node_modules_label,
                "$(rootpath %s)" % YARN_LABEL,
            ] + TEST_DEPS_ARGS,
            #  + select({
            #     "//aio:aio_local_deps": ["$(rootpath %s)" % dep for dep in LOCAL_TEST_PKG_DEPS],
            #     "//conditions:default": ["$(rootpath %s)" % dep for dep in NPM_TEST_PKG_DEPS],
            # }),
            configuration_env_vars = ["NG_BUILD_CACHE"],
            entry_point = "//aio/tools/examples:run-example-e2e",
            env = {
                "CHROME_BIN": "$(CHROMIUM)",
                "CHROMEDRIVER_BIN": "$(CHROMEDRIVER)",
            },
            templated_args = ["--node_options=--experimental-import-meta-resolve"],
            toolchains = [
                "@aio_npm//@angular/dev-infra-private/bazel/browsers/chromium:toolchain_alias",
            ],
            tags = test_tags,
        )

def _pkg_json_label(pkg):
    return "@aio_example_deps//:node_modules/%s/package.json" % pkg
