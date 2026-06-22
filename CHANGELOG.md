# Changelog

All notable changes to `@kud/qobuz` are documented here.

---

## 0.5.0 — 2026-06-22

### Highlights

- **Open content directly in the Qobuz desktop app.** A new `createAppLink()` function generates `qobuzapp://` deep links for albums, tracks, playlists, and artists — letting consumers launch the desktop app to a specific item rather than opening a browser tab. Exposed on the client as `client.appLink` (alongside the existing `client.deepLink` for web URLs) and exported from the package barrel so it is available to all consumers without extra imports. ([81991fd](https://github.com/kud/qobuz/commit/81991fd130cc2cd3ae80246f17c4434895832b0c))

---

## 0.4.0 — 2026-06-22

### Highlights

- **Analyse your Qobuz library locally — genre mix, hi-res ratio, taste profile.** A new `readLibraryStats()` export reads the Qobuz desktop app's local SQLite database (`qobuz.db`) and returns rich collection analytics entirely on-device: bit-depth and hi-res breakdown, top genres, top labels, top artists by album count, a month-by-month collection timeline, and overall totals. No API call, no npm dependency — just the system `sqlite3` binary. macOS only. ([c89b946](https://github.com/kud/qobuz/commit/c89b946b7164a988a489f8b7f3f4cafcfc1da6b5))

### Documentation

- Docs index rewritten as an orientation guide rather than a copy of the README, so first-time readers can navigate straight to what they need. ([169a806](https://github.com/kud/qobuz/commit/169a80658fb320089656f520035ef57852bd5f9a))

---

## 0.3.0 — 2026-06-22

### Highlights

- **Now-playing integration.** `client.nowPlaying()` and the exported `readNowPlayingTrackId()` function read the currently-playing track ID directly from the Qobuz desktop app's local state file on macOS. Previously this capability lived only in the CLI; moving it to the core library lets the MCP server, Raycast extension, and any other consumer tap into live playback state without duplicating the logic. ([640cec4](https://github.com/kud/qobuz/commit/640cec4))

- **`connect()` helper for programmatic auth.** A new `connect()` export lets library consumers authenticate with a browser session token in a single call — it auto-scrapes the `app_id`, persists credentials to the store, and returns a ready client. On subsequent runs, `createQobuzClient` can build directly from the persisted store, skipping the login step entirely. ([56c0da5](https://github.com/kud/qobuz/commit/56c0da5))

- **Tracks resource and `artists.getSimilar`.** The client now exposes a `tracks` resource (`track/get`) and an `artists.getSimilar` method backed by the `artist/getSimilarArtists` endpoint, both with full camelCase mapping and optional pagination. ([6372b3a](https://github.com/kud/qobuz/commit/6372b3a))

- **Token-based auth with pluggable credential store.** The library was built from the ground up around browser session tokens rather than password login (which Qobuz blocks with a captcha). Credentials are held in a memory store or persisted to the macOS Keychain via a swappable store interface. ([0e3d174](https://github.com/kud/qobuz/commit/0e3d174))

- **Typed resource API.** Fully typed ESM client covering search, albums, artists, tracks, favourites, and playlists — all responses normalised through snake_case→camelCase domain mappers. Deep-link builders are included for constructing Qobuz URLs from resource IDs. ([0e3d174](https://github.com/kud/qobuz/commit/0e3d174))

### Documentation

- Comprehensive API documentation pages added and published at `kud.io/projects/qobuz/docs`, covering auth, resources, and the `connect` flow. ([c5a14df](https://github.com/kud/qobuz/commit/c5a14df))
- README usage section rewritten to document both the `connect()` API and the store-based shortcut for repeat runs. ([25f5864](https://github.com/kud/qobuz/commit/25f5864))

<details>
<summary>Internal (4 commits)</summary>

- Automated npm publishing via GitHub Actions with OIDC Trusted Publishers — no stored secrets, keyless auth on version tags. ([3c00523](https://github.com/kud/qobuz/commit/3c00523))
- Node upgraded to 24 in CI. Dev build script gained a `--watch` flag. ([060b671](https://github.com/kud/qobuz/commit/060b671), [f174bf0](https://github.com/kud/qobuz/commit/f174bf0))

</details>
