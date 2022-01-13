workspace(
    name = "angular",
    managed_directories = {
        "@npm": ["node_modules"],
        "@aio_npm": ["aio/node_modules"],
    },
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Fetch rules_nodejs so we can install our npm dependencies
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "2644a66772938db8d8c760334a252f1687455daa7e188073f2d46283f2f6fbb7",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/4.6.2/rules_nodejs-4.6.2.tar.gz"],
)

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

http_archive(
    name = "aspect_bazel_lib",
    sha256 = "ca5ae17c88cf7235e720ac97b2f5b0509a02eacfc43f6f6dd4c831dacbe197c6",
    strip_prefix = "bazel-lib-0.4.3",
    url = "https://github.com/aspect-build/bazel-lib/archive/v0.4.3.tar.gz",
)

# Check the rules_nodejs version and download npm dependencies
# Note: bazel (version 2 and after) will check the .bazelversion file so we don't need to
# assert on that.
load("@build_bazel_rules_nodejs//:index.bzl", "check_rules_nodejs_version", "node_repositories", "yarn_install")

check_rules_nodejs_version(minimum_version_string = "2.2.0")

# Setup the Node.js toolchain
node_repositories(
    node_version = "16.10.0",
    package_json = ["//:package.json"],
)

load("//integration:npm_package_archives.bzl", "npm_package_archives")

yarn_install(
    name = "npm",
    # Note that we add the postinstall script here so that the dependencies are re-installed
    # when the postinstall patches are modified.
    data = ["//tools:postinstall-patches.js"],
    manual_build_file_contents = npm_package_archives(),
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

yarn_install(
    name = "aio_npm",
    manual_build_file_contents = npm_package_archives(),
    package_json = "//aio:package.json",
    yarn_lock = "//aio:yarn.lock",
)

load("@aspect_bazel_lib//lib:repositories.bzl", "aspect_bazel_lib_dependencies")

aspect_bazel_lib_dependencies()

# Load protractor dependencies
load("@npm//@bazel/protractor:package.bzl", "npm_bazel_protractor_dependencies")

npm_bazel_protractor_dependencies()

# Setup the rules_webtesting toolchain
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

load("@npm//@angular/dev-infra-private/bazel/browsers:browser_repositories.bzl", "browser_repositories")

browser_repositories()

load("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories()

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
