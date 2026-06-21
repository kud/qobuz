import { createDeepLink } from "./deep-link.js"
import { authError } from "./http/errors.js"
import { createTransport } from "./http/transport.js"
import { createAlbumsResource } from "./resources/albums.js"
import { createArtistsResource } from "./resources/artists.js"
import { createFavouritesResource } from "./resources/favourites.js"
import { createPlaylistsResource } from "./resources/playlists.js"
import { createSearchResource } from "./resources/search.js"
import type { CredentialStore } from "./auth/credential-store.js"

export type QobuzClientConfig = {
  store: CredentialStore
  fetchImpl?: typeof fetch
}

export const createQobuzClient = async ({
  store,
  fetchImpl,
}: QobuzClientConfig) => {
  const credentials = await store.load()
  if (!credentials)
    throw authError("not connected — store a valid app_id + token first")

  const transport = createTransport({
    appId: credentials.appId,
    token: credentials.token,
    fetchImpl,
  })

  return {
    appId: credentials.appId,
    search: createSearchResource(transport),
    albums: createAlbumsResource(transport),
    artists: createArtistsResource(transport),
    favourites: createFavouritesResource(transport),
    playlists: createPlaylistsResource(transport),
    deepLink: createDeepLink(),
    signOut: () => store.clear(),
  }
}

export type QobuzClient = Awaited<ReturnType<typeof createQobuzClient>>
