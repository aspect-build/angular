workspace(
    name = "angular",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Fetch bazel_skylib to check bazel versions
http_archive(
    name = "bazel_skylib",
    sha256 = "c6966ec828da198c5d9adbaa94c05e3a1c7f21bd012a0b29ba8ddbccb2c93b0d",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/releases/download/1.1.1/bazel-skylib-1.1.1.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/releases/download/1.1.1/bazel-skylib-1.1.1.tar.gz",
    ],
)

load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()

# Fetch rules_nodejs so we can install our npm dependencies
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "f690430f4d4cc403b5c90d0f0b21842183b56b732fff96cfe6555fe73189906a",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/5.0.1/rules_nodejs-5.0.1.tar.gz"],
)

load("@build_bazel_rules_nodejs//:repositories.bzl", "build_bazel_rules_nodejs_dependencies")

build_bazel_rules_nodejs_dependencies()

# The PKG rules are needed to build tar packages for integration tests. The builtin
# rule in `@bazel_tools` is not Windows compatible and outdated.
http_archive(
    name = "rules_pkg",
    sha256 = "62eeb544ff1ef41d786e329e1536c1d541bb9bcad27ae984d57f18f314018e66",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_pkg/releases/download/0.6.0/rules_pkg-0.6.0.tar.gz",
        "https://github.com/bazelbuild/rules_pkg/releases/download/0.6.0/rules_pkg-0.6.0.tar.gz",
    ],
)

load("@bazel_skylib//lib:versions.bzl", "versions")

versions.check(minimum_bazel_version = "4.2.2")

# Check the rules_nodejs version and download npm dependencies
# Note: bazel (version 2 and after) will check the .bazelversion file so we don't need to
# assert on that.
load("@build_bazel_rules_nodejs//:index.bzl", "check_build_bazel_rules_nodejs_version", "node_repositories", "yarn_install")

check_build_bazel_rules_nodejs_version(minimum_version_string = "2.2.0")

# Setup the Node.js toolchain
node_repositories(
    node_version = "16.10.0",
    package_json = ["//:package.json"],
)

load("//integration:npm_package_archives.bzl", "npm_package_archives")

yarn_install(
    name = "npm",
    data = [
        "//:scripts/puppeteer-chromedriver-versions.js",
        "//:scripts/webdriver-manager-update.js",
        "//tools:postinstall-patches.js",
    ],
    # Note that we add the postinstall script here so that the dependencies are re-installed
    # when the postinstall patches are modified.
    exports_directories_only = False,
    manual_build_file_contents = npm_package_archives(),
    package_json = "//:package.json",
    symlink_node_modules = False,
    yarn_lock = "//:yarn.lock",
)

# Load protractor dependencies
load("@npm//@bazel/protractor:package.bzl", "npm_bazel_protractor_dependencies")

npm_bazel_protractor_dependencies()

# Setup the rules_webtesting toolchain
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

load("@npm//@angular/dev-infra-private/bazel/browsers:browser_repositories.bzl", "browser_repositories")

browser_repositories()

load("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories(npm_repository = "npm")

load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")

rules_pkg_dependencies()

load("//packages/common/locales/generate-locales-tool:cldr-data.bzl", "cldr_data_repository")

cldr_data_repository(
    name = "cldr_data",
    urls = {
        "https://github.com/unicode-org/cldr-json/releases/download/39.0.0/cldr-39.0.0-json-full.zip": "a631764b6bb7967fab8cc351aff3ffa3f430a23646899976dd9d65801446def6",
    },
)

# sass rules
http_archive(
    name = "io_bazel_rules_sass",
    sha256 = "903858e0fb5eda0b36d37e1ce4cbcfbe03f65a5f153d894dc8a9894a4884e564",
    strip_prefix = "rules_sass-1.49.0",
    urls = [
        "https://github.com/bazelbuild/rules_sass/archive/1.49.0.zip",
    ],
)

# Setup the rules_sass toolchain
load("@io_bazel_rules_sass//sass:sass_repositories.bzl", "sass_repositories")

sass_repositories()
