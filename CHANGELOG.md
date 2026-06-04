# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Test coverage reporting via `@vitest/coverage-v8`; run with `npm run test:coverage`.
- CI workflow job that runs `npm run test:coverage` and uploads results to Codecov on every push.
- `.nvmrc` pinning Node.js to v24.15.0 for consistent local and CI environments.
- Tests for `AwsSettings` (CRUD state machine, bucket/prefix parsing, credential editing), `BucketSelector` (visibility, labels, active bucket selection), `KeyboardShortcutsModal` (v-model wiring, both close paths), and `ThemeController` (theme actions, highlight classes), `stores/theme` (getters, actions, localStorage persistence), `EmailAddress` (address formatting), `useKeyboardShortcutsModal` (open/close/shared state), and `useEffectiveTheme` (`applyThemeToDocument`); expanded tests for `EmailDisplay` (download attachment, CC separator), `s3Utils` (S3 client caching and cache clearing), `config` (all three legacy migration formats, all validation failure paths), `useEmailLoader` (bucket-not-found, no-body, S3 error, and successful fetch), and `useInboxLoader` (no active bucket, cached email during task); raises statement coverage from 75% to 92%.
- 404 catch-all route rendering a "Page not found" view with a `noindex` robots meta tag (via `@unhead/vue`) to prevent search engine indexing of unknown URLs.
- First-run setup wizard (`/setup`) shown automatically to users with no configuration; offers a guided flow (S3 bucket → CORS policy → IAM policy → IAM user → access keys) and an expert mode (enter all credentials at once); redirects to `/inbox` once configured.
- App version number from `package.json` is now displayed in the footer; clicking it opens a changelog modal that shows `CHANGELOG.md`.

### Fixed

- Mobile drawer now closes automatically when switching buckets or opening the Settings modal; drawer layout improved with proper flex-column structure and full-width controls.

## [0.4.1] - 2026-06-03

### Fixed

- Docker nginx config now serves `index.html` as a fallback for all routes, fixing 404s when navigating directly to SPA sub-paths (e.g. `/inbox`).

## [0.4.0] - 2026-06-03

### Added

- IndexedDB email cache now evicts entries older than 14 days; stale entries are removed on each inbox load and lazily on individual reads.
- Attachments section in the email detail view listing non-inline attachments (filename, MIME type, download button); inline detection uses `Content-Disposition: inline` and `cid:` HTML presence.
- Read/unread tracking: unread emails display bold text and a solid envelope icon (`fas fa-envelope`); read emails show an open envelope icon (`far fa-envelope-open`). Read state is persisted to IndexedDB across page reloads and marked automatically when an email is opened.
- Keyboard navigation in the inbox list: `j`/`↓` and `k`/`↑` move row selection, `Enter` opens the selected email, `]`/`→` and `[`/`←` change pages.
- `Escape`, `Backspace`, or `u` navigates back to the inbox from an email.
- `?` opens a keyboard shortcuts help modal (split into inbox list and email view sections); a hint button in the inbox header also opens it for mouse users.
- Active filter labels (from/to/subject) are persisted per bucket in `localStorage` and restored on page load and bucket switch.
- Filter badges are now keyboard focusable; pressing `Delete` while a badge is focused removes that filter.
- Thread grouping in the inbox list: toggle "Group by thread" to cluster emails by conversation, showing the latest sender, subject, date, and a reply-count badge.
- Conversation view at `/inbox/thread/:threadId`: clicking a multi-email thread opens a Gmail-style stacked view with each email rendered as a card, oldest-first.
- Quote collapsing in email bodies: quoted sections (`<blockquote>`, plain-text `>` markers, attribution lines "On … wrote:", and vendor-specific containers detected by structure) are hidden behind a "··· Show quoted text" toggle by default.
- Multi-select checkboxes in the inbox list; a select-all header checkbox shows indeterminate state when some rows are selected; selecting a thread row in grouped mode selects all emails in that thread.
- Bulk action bar above the inbox table showing the selected count, a "Mark as read" button, and a "Clear selection" button.
- `x` and `Space` keyboard shortcuts toggle the selection of the currently highlighted inbox row.
- `body:` filter label searches the first 200 characters of each email's body text (case-insensitive); body filter badges render in a distinct secondary color.

### Changed

- Email list now stores only lightweight metadata (sender, subject, date, text preview) in memory; full email bodies live exclusively in IndexedDB and are loaded on demand when opening an email
- S3 fetches are now concurrency-limited to 10 simultaneous requests instead of firing all at once with `Promise.all`
- Cached metadata is loaded from IndexedDB immediately on startup so the list renders without waiting for any S3 request; uncached emails stream in as each batch completes
- `Label.f` now accepts a narrow `FilterableEmail` type instead of the full postal-mime `Email`
- `clearEmailCache` and `evictStaleEntries` now atomically clean both the `emails` and `email-meta` IndexedDB stores
- S3Client instances are now reused across loads via a module-level cache keyed by `region:accessKeyId`; the cache is cleared alongside the email cache on config change.
- Filter expressions now match case-insensitively for `to`, `from`, and `subject` fields.
- `ThreadView` now reads thread membership from a shared `threads` store getter instead of calling `groupIntoThreads` over the full inbox on every reactive update, eliminating redundant re-grouping during inbox load.
- `evictStaleEntries` and S3 object listing now run concurrently in `useInboxLoader`, removing the IndexedDB scan from the inbox load critical path.
- `setCachedEmail` and `setEmailMeta` IndexedDB writes now run concurrently per fetched email instead of sequentially.
- `evictStaleEntries` now collects stale keys in a single cursor pass and issues all deletes concurrently, avoiding sequential awaits inside the cursor loop.
- `markSelectedRead` now issues all `markRead` IndexedDB writes concurrently via `Promise.all` instead of sequentially.
- `selectionState` in `EmailList` now counts selected items with a plain loop instead of allocating an intermediate array via `filter`.

### Fixed

- Subject label filter no longer incorrectly matches emails that have no subject line.
- Email detail view now displays an error message instead of a blank page when an email fails to load
- `makeCacheKey` no longer throws on S3 keys containing non-Latin-1 characters
- Corrupted `localStorage` data no longer crashes the app on startup; invalid JSON is treated as absent config
- Inbox now shows an error message when bucket configuration fails validation, instead of silently showing an empty list
- Plain-text emails with angle-bracket sequences (e.g. `<user@example.com>`) no longer get silently stripped; `DOMPurify.sanitize` is now only applied to HTML content.
- Inline images (CID attachments) are no longer silently stripped; the early `DOMPurify.sanitize` call that removed `cid:` src attributes before substitution has been moved to after the attachment loop, where it now runs exactly once.
- Binary attachment base64 encoding now uses chunked `String.fromCharCode` instead of a `reduce` accumulator, eliminating O(n²) string copying for large attachments.
- Pre-compute `formattedDate` from `EmailMeta.date` once at load time via `applyFormattedDate` rather than calling `new Date().toLocaleString()` on every template render. Formatted dates are not persisted to IndexedDB, avoiding locale-staleness across sessions.
- `EmailItem`: `headers` computed no longer mutates the shared Pinia store array in place; replaced `localeCompare` with a direct ASCII comparison for header key sorting.
- `activeBucket` getter now reuses the cached `allBuckets` getter result instead of calling `flattenBuckets` a second time on every reactive evaluation.
- fix(useEffectiveTheme): expose dispose() to remove MediaQueryList listener on unmount
- Config changes now evict only the email cache and read/unread status for buckets that were removed or modified, instead of wiping all caches on any change. Labels and other non-data fields can be edited freely without affecting cached data.
- "None" placeholder in filter list was invisible due to `text-accent-content` being intended for use on accent-colored backgrounds.
- `textAsHtml` (plain-text-to-HTML conversion) is now passed through `DOMPurify.sanitize()`, preventing XSS via crafted URLs that break out of `href` attributes.
- `to:`/`from:` address filters no longer spuriously match every email when a group/list address has no `address` field (optional-chaining returning `undefined` was treated as truthy).
- Keyboard navigation in thread mode now uses the thread row count as its bound and routes `Enter` to `openThread()` instead of always calling `openEmail()`.
- On-demand stale-cache eviction in `getCachedEmail` now also deletes the corresponding `email-meta` entry, consistent with the background `evictStaleEntries` sweep.
- `emailStore.markRead()` is now awaited at both call sites in `useEmailLoader`, so IndexedDB persistence errors are no longer silently swallowed.
- `groupIntoThreads` now pre-computes a timestamp map before sorting, eliminating repeated `new Date()` construction inside sort comparators; the post-sort `reduce` to find the latest email is replaced with a direct last-element access.
- `groupIntoThreads` now looks up root email meta via a pre-built `keyToMeta` Map instead of a linear `metas.find()` scan, converting an O(n²) lookup to O(1) for large inboxes.
- `allThreads` computed in `EmailList` now skips `groupIntoThreads` entirely when thread grouping is disabled, eliminating wasted CPU on every inbox-load event in flat-list mode.
- `useEmailLoader` now cancels in-flight S3 fetches via `AbortController` on component unmount and guards all post-await state writes, preventing wasted bandwidth and stale reactive updates when navigating away from a thread.
- `collapseBlockquotes` is now called once at parse time and stored as `processedHtml` on `ParsedEmail`, eliminating repeated HTML parse/DOM-traverse/serialize on every `EmailDisplay` render.

## [0.3.0] - 2026-06-01

### Added

- Support for multiple S3 buckets via a credentials/buckets hierarchy in settings, with optional labels per credential set and per bucket.
- New `BucketSelector` component to switch between configured buckets when multiple are available.
- Email list pagination (25 emails per page, applied after filtering).
- Email list caching so previously loaded results are shown immediately on revisit, with a manual refresh button to reload from S3.
- Vitest test suite with tests for S3 utilities and the email store.

### Changed

- Settings schema restructured: the flat single-bucket config (`aws_region`, `aws_access_key_id`, `aws_secret_access_key`, `bucket`) is automatically migrated to the new `credentials[].buckets[]` hierarchy on first load.
- Email list layout improved for small screen sizes.

## [0.2.0] - 2025-04-26

### Added

- Vite configuration (`vite.config.js`) for Vue 2 with modern build output.
- Support for rewriting `cid:` inline image references to base64 `data:` URIs.
- Fallback HTML rendering from plain text using a `textAsHtml` equivalent function.
- `Dockerfile` for using the project with Docker
- Migrated full codebase to TypeScript with strict type checking (`vue-tsc`)
- Ensured all Vue 3 components are properly typed, including `props`, `data`, and `methods`
- Theme support for light/dark modes
- New `ThemeController.vue` with three-state toggle and theme-select buttons
- `useEffectiveTheme()` composable to compute and apply theme reactively
- `useThreeStateCheckbox()` composable for synced indeterminate checkbox state
- Pinia as the new state management solution, replacing Vuex
- ESLint configuration aligned with Vue standards, with clean baseline across the codebase
- Husky pre-commit hook enforcing linting and conventional commit message format
- GitHub Actions workflows for CI build and automatic deployment

### Changed

- Migrated from Gulp-based build system to Vite with native ES modules and modern tooling.
- Switched from `mailparser` to `postal-mime`, including custom CID inlining and text-to-HTML fallback logic.
- Replaced `aws-sdk` v2 and `bluebird` with `@aws-sdk/client-s3` (modular v3) and native Promises.
- Updated all code to use `import/export` instead of `require/module.exports`.
- Migrated from Vue 2 to Vue 3, including `vue-router` and `vuex`
- Updated all Vue app initialization code to use `createApp`, `createRouter`, and `createStore` per Vue 3 standards
- Replaced Vue 2-style `<router-view>` usage with scoped slot + `<component :is="...">` to support `<keep-alive>` and `<transition>` properly
- Migrated all styling from Bootstrap 4 to Tailwind CSS with daisyUI
- Updated layout and spacing across components using Tailwind
- Migrated all Vue components from Options API to Composition API (`<script setup>`).
- Added the ability to view all e-mail headers
- Migrated all existing Vuex store usages (`Emails`, `Config`, `Theme`) to Pinia stores
- Refactored `App.vue`, `Navbar.vue`, `EmailList.vue`, `Filters.vue`, and `Settings.vue` to use Pinia
- Renamed Vue components for clarity: `Settings` → `AwsSettings`, `Email` → `EmailItem`, `Filters` → `FilterList`, `Footer` → `MainFooter`, `Navbar` → `MainNavbar`
- Updated README with corrected CORS policy configuration for S3 buckets

### Fixed

- Type checking for `postal-mime` parse result in `EmailItem` and `EmailList` components.

### Removed

- Gulp build chain: `gulpfile.js`, `browserify`, `vueify`, `node-sass`, and associated plugins.
- Legacy email parsing dependency: `mailparser`
- Unused/obsolete dev dependencies: `connect-history-api-fallback`, `bluebird`, and others.
- Removed global `Vue.use(...)` calls (no longer used in Vue 3)
- Bootstrap, jQuery, and Popper.js `<script>` tags from `index.html`
- All legacy Bootstrap classes and layout dependencies

## [0.1.0] - 2022-02-14

Original version of the code as forked from <https://github.com/LeadSigma/s3abird>, itself a fork of <https://github.com/mewa/s3abird> with a single extra commit. Version number is arbitrary.

[Unreleased]: https://github.com/ilyvion/s3abird/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/ilyvion/s3abird/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/ilyvion/s3abird/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ilyvion/s3abird/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ilyvion/s3abird/compare/forked...v0.2.0
[0.1.0]: https://github.com/ilyvion/s3abird/compare/a1d566eafbb31e8b0719eaf5fcd2b679fb5c4f2a...forked
