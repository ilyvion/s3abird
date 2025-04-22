# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

-   Migrated from Gulp-based build system to Vite with native ES modules and modern tooling.
-   Switched from `mailparser` to `postal-mime`, including custom CID inlining and text-to-HTML fallback logic.
-   Replaced `aws-sdk` v2 and `bluebird` with `@aws-sdk/client-s3` (modular v3) and native Promises.
-   Updated all code to use `import/export` instead of `require/module.exports`.
-   Migrated from Vue 2 to Vue 3, including `vue-router` and `vuex`
-   Updated all Vue app initialization code to use `createApp`, `createRouter`, and `createStore` per Vue 3 standards
-   Replaced Vue 2-style `<router-view>` usage with scoped slot + `<component :is="...">` to support `<keep-alive>` and `<transition>` properly

### Removed

-   Gulp build chain: `gulpfile.js`, `browserify`, `vueify`, `node-sass`, and associated plugins.
-   Legacy email parsing dependency: `mailparser`
-   Unused/obsolete dev dependencies: `connect-history-api-fallback`, `bluebird`, and others.
-   Removed global `Vue.use(...)` calls (no longer used in Vue 3)

### Added

-   Vite configuration (`vite.config.js`) for Vue 2 with modern build output.
-   Support for rewriting `cid:` inline image references to base64 `data:` URIs.
-   Fallback HTML rendering from plain text using a `textAsHtml` equivalent function.
-   `Dockerfile` for using the project with Docker
-   Migrated full codebase to TypeScript with strict type checking (`vue-tsc`)
-   Ensured all Vue 3 components are properly typed, including `props`, `data`, and `methods`

## [0.1.0] - 2022-02-14

Original version of the code as forked from <https://github.com/LeadSigma/s3abird>, itself a fork of <https://github.com/mewa/s3abird> with a single extra commit. Version number is arbitrary.

[unreleased]: https://github.com/ilyvion/s3abird/compare/forked...HEAD
[0.1.0]: https://github.com/ilyvion/s3abird/compare/a1d566eafbb31e8b0719eaf5fcd2b679fb5c4f2a...forked
