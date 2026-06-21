<div align="center">

![npm](https://img.shields.io/npm/v/%40kud%2Fqobuz?style=flat-square&color=CB3837)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**Reverse-engineered Qobuz API client for Node.js**

<a href="https://kud.io/projects/qobuz">Website</a> · <a href="https://kud.io/projects/qobuz/docs">Documentation</a>

</div>

## Features

- **Token auth, captcha-proof** — authenticates with a `user_auth_token` borrowed from your logged-in browser; no password handling, no captcha walls.
- **Pluggable credential store** — ships in-memory and macOS Keychain implementations; bring your own.
- **Typed resources** — search, albums, artists, tracks, playlists, favourites — clean camelCase domain types mapped from the raw API.
- **Deep links** — build `open.qobuz.com` URLs to open anything in the Qobuz app.
- **ESM + types, zero runtime deps** — tree-shakeable, fully typed, ships nothing extra.

## Install

```sh
npm install @kud/qobuz
```

## Usage

Grab your credentials from a logged-in [play.qobuz.com](https://play.qobuz.com) session — open DevTools, inspect any `api.json` network request, and copy the `X-App-Id` and `X-User-Auth-Token` headers. Store them via the credential store of your choice, then create a client:

```ts
import { createQobuzClient, createKeychainStore } from "@kud/qobuz"

const client = await createQobuzClient({ store: createKeychainStore() })
const { albums } = await client.search.search("radiohead")
console.log(client.deepLink.album(albums[0].id))
```

The companion CLI [`@kud/qobuz-cli`](https://kud.io/projects/qobuz-cli) provides a `qobuz login` flow that handles credential storage automatically.

## Development

```sh
git clone https://github.com/kud/qobuz.git
cd qobuz
npm install
npm run build   # tsup → ESM + dts
npm test        # vitest
npm run typecheck
```

📚 **Full documentation → [qobuz/docs](https://kud.io/projects/qobuz/docs)**
