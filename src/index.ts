export { createQobuzClient } from "./client.js"
export type { QobuzClient, QobuzClientConfig } from "./client.js"

export { fetchAppId } from "./auth/bootstrap.js"
export type { AppCredentials } from "./auth/bootstrap.js"
export { validateCredentials } from "./auth/validate.js"
export type { ValidateConfig } from "./auth/validate.js"
export { connect } from "./auth/connect.js"
export type { ConnectConfig } from "./auth/connect.js"
export {
  createMemoryStore,
  createKeychainStore,
} from "./auth/credential-store.js"
export type {
  CredentialStore,
  StoredCredentials,
  KeychainStoreOptions,
} from "./auth/credential-store.js"

export { createTransport, QOBUZ_BASE_URL } from "./http/transport.js"
export type { Transport, TransportConfig } from "./http/transport.js"
export type { QobuzError, QobuzErrorKind } from "./http/errors.js"

export { createDeepLink } from "./deep-link.js"
export type { DeepLink, DeepLinkBase } from "./deep-link.js"

export type { UserFavourites } from "./resources/favourites.js"
export type { CreatePlaylistParams } from "./resources/playlists.js"

export type {
  Album,
  Artist,
  FavouriteType,
  PageOptions,
  Playlist,
  QobuzImage,
  SearchResults,
  Track,
} from "./types/domain.js"
